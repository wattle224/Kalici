import SwiftUI

struct TradeHistoryView: View {
  @EnvironmentObject private var store: InvestmentStore

  var body: some View {
    NavigationStack {
      List(store.trades.sorted { $0.executedAt > $1.executedAt }) { trade in
        TradeRow(trade: trade)
      }
      .navigationTitle("Trade History")
      .overlay {
        if store.trades.isEmpty {
          ContentUnavailableView(
            "No trades yet",
            systemImage: "arrow.left.arrow.right.circle",
            description: Text("Automated fills will appear here with their execution price at fill time.")
          )
        }
      }
    }
    .preferredColorScheme(.dark)
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
        Text("Fill \(PriceFormat.string(from: trade.executionPrice))")
          .font(.caption2)
          .foregroundStyle(.secondary)
          .monospacedDigit()
      }
    }
    .padding(.vertical, 2)
  }
}
