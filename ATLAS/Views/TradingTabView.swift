import SwiftUI

struct TradingTabView: View {
  @EnvironmentObject private var store: InvestmentStore
  @State private var showCleanRestartConfirm = false

  var body: some View {
    NavigationStack {
      List {
        executionSection
        ForEach(store.openPositions, id: \.symbol) { position in
          positionSection(position)
        }
        tradeHistorySection
        if !store.skippedTradesWhilePaused.isEmpty {
          skippedSection
        }
      }
      .navigationTitle("Trading")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Clean restart") {
            showCleanRestartConfirm = true
          }
        }
      }
      .confirmationDialog(
        "Clean restart?",
        isPresented: $showCleanRestartConfirm,
        titleVisibility: .visible
      ) {
        Button("Reset trading data", role: .destructive) {
          store.performCleanRestart()
        }
        Button("Cancel", role: .cancel) {}
      } message: {
        Text("Clears the trade ledger and reloads from a clean state. Removes phantom zero-price fills.")
      }
      .overlay {
        if store.settledTrades.isEmpty && store.skippedTradesWhilePaused.isEmpty {
          ContentUnavailableView(
            "No trades yet",
            systemImage: "arrow.left.arrow.right.circle",
            description: Text("Confirmed fills appear here once execution runs.")
          )
        }
      }
    }
    .preferredColorScheme(.dark)
  }

  private var executionSection: some View {
    Section {
      HStack {
        Image(systemName: store.isExecutionPaused ? "pause.circle.fill" : "play.circle.fill")
          .foregroundStyle(store.isExecutionPaused ? .orange : .green)
          .font(.title2)
        VStack(alignment: .leading, spacing: 4) {
          Text(store.isExecutionPaused ? "Execution paused" : "Execution running")
            .font(.subheadline.weight(.semibold))
          Text(
            store.isExecutionPaused
              ? "New orders are not sent. Trade history shows confirmed fills only."
              : "Automation may place orders and record fill prices."
          )
          .font(.caption)
          .foregroundStyle(.secondary)
        }
      }
      .padding(.vertical, 4)
    }
  }

  private func positionSection(_ position: OpenPosition) -> some View {
    Section("Open position") {
      VStack(alignment: .leading, spacing: 6) {
        Text(position.symbol)
          .font(.headline)
        Text("\(NSDecimalNumber(decimal: position.quantity).stringValue) ETH · avg \(PriceFormat.string(from: position.averageEntryPrice))")
          .font(.caption)
          .monospacedDigit()
        HStack {
          Text("Unrealized P&L")
            .font(.caption)
            .foregroundStyle(.secondary)
          Spacer()
          Text(SterlingFormat.signedPnL(from: position.unrealizedPnL))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(position.unrealizedPnL >= 0 ? .green : .red)
            .monospacedDigit()
        }
        Text("Position P&L is shown once here — not on each trade row.")
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
      .padding(.vertical, 4)
    }
  }

  private var tradeHistorySection: some View {
    Section("Trade history") {
      if store.settledTrades.isEmpty {
        Text("No confirmed fills")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else {
        ForEach(store.settledTrades) { trade in
          TradeRow(trade: trade)
        }
      }
    }
  }

  private var skippedSection: some View {
    Section {
      Text("These rows were logged while execution was paused. They are sizing intents, not fills — price stays 0 and they must not appear in trade history.")
        .font(.caption)
        .foregroundStyle(.secondary)
      ForEach(store.skippedTradesWhilePaused) { trade in
        SkippedTradeRow(trade: trade)
      }
    } header: {
      Text("Skipped while paused")
    }
  }
}

struct TradeRow: View {
  let trade: Trade

  var body: some View {
    HStack(alignment: .top) {
      Image(systemName: trade.side == .buy ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
        .foregroundStyle(trade.side == .buy ? .green : .red)
        .font(.title3)

      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Text(trade.symbol)
            .font(.subheadline.weight(.semibold))
          Text(trade.side == .buy ? "Buy" : "Sell")
            .font(.caption.weight(.medium))
            .foregroundStyle(trade.side == .buy ? .green : .red)
        }
        Text("\(NSDecimalNumber(decimal: trade.quantity).stringValue) @ \(PriceFormat.string(from: trade.executionPrice))")
          .font(.caption)
          .monospacedDigit()
        Text(trade.orderReference)
          .font(.caption2)
          .foregroundStyle(.tertiary)
        Text("\(trade.source) · \(DateFormat.dateTime.string(from: trade.executedAt))")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 4) {
        Text(MoneyFormat.compact(from: trade.notional))
          .font(.subheadline.weight(.semibold))
          .monospacedDigit()
        if let pnl = trade.realizedPnL {
          Text("Realized \(SterlingFormat.signedPnL(from: pnl))")
            .font(.caption2)
            .foregroundStyle(pnl >= 0 ? .green : .red)
            .monospacedDigit()
        }
      }
    }
    .padding(.vertical, 2)
  }
}

struct SkippedTradeRow: View {
  let trade: Trade

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(trade.symbol)
          .font(.subheadline.weight(.medium))
        Text("Size \(NSDecimalNumber(decimal: trade.quantity).stringValue) · not executed")
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(trade.orderReference)
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
      Spacer()
      Text("Skipped")
        .font(.caption.weight(.medium))
        .foregroundStyle(.orange)
    }
  }
}
