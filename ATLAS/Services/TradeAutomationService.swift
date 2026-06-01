import Foundation

/// Records automated executions with a price snapshot at fill time.
@MainActor
final class TradeAutomationService {
  private(set) var executionState: AutomationExecutionState = .paused
  private(set) var trades: [Trade] = []
  private(set) var openPositions: [OpenPosition] = []

  var isExecutionPaused: Bool {
    executionState == .paused
  }

  /// Confirmed fills only — excludes skipped intents and zero-price rows.
  var settledFills: [Trade] {
    trades.filter(\.isSettledFill).sorted { $0.executedAt > $1.executedAt }
  }

  /// Rows logged while paused (should not appear as "filled" in history).
  var skippedWhilePaused: [Trade] {
    trades.filter { $0.status == .skipped || ($0.executionPrice == 0 && $0.status != .filled) }
      .sorted { $0.executedAt > $1.executedAt }
  }

  func setExecutionPaused(_ paused: Bool) {
    executionState = paused ? .paused : .running
  }

  func recordFill(
    symbol: String,
    side: TradeSide,
    quantity: Decimal,
    executionPrice: Decimal,
    executedAt: Date = .now,
    orderReference: String,
    source: String = "Automation",
    realizedPnL: Decimal? = nil
  ) {
    guard !isExecutionPaused else {
      recordSkippedIntent(
        symbol: symbol,
        side: side,
        quantity: quantity,
        executedAt: executedAt,
        orderReference: orderReference,
        source: source
      )
      return
    }
    guard executionPrice > 0, quantity > 0 else { return }

    trades.append(
      Trade(
        id: UUID(),
        symbol: symbol.uppercased(),
        side: side,
        quantity: quantity,
        executionPrice: executionPrice,
        executedAt: executedAt,
        orderReference: orderReference,
        source: source,
        status: .filled,
        realizedPnL: realizedPnL
      )
    )
  }

  /// Logs sizing intent when automation is paused — must not be shown as a fill.
  func recordSkippedIntent(
    symbol: String,
    side: TradeSide,
    quantity: Decimal,
    executedAt: Date = .now,
    orderReference: String,
    source: String = "Automation"
  ) {
    trades.append(
      Trade(
        id: UUID(),
        symbol: symbol.uppercased(),
        side: side,
        quantity: quantity,
        executionPrice: 0,
        executedAt: executedAt,
        orderReference: orderReference,
        source: source,
        status: .skipped,
        realizedPnL: nil
      )
    )
  }

  func loadSampleExecutions() {
    executionState = .paused

    let calendar = Calendar.current
    let ethPositionID = UUID()

    openPositions = [
      OpenPosition(
        id: ethPositionID,
        symbol: "ETH-USD",
        quantity: 0.42,
        averageEntryPrice: 2_450,
        unrealizedPnL: 71.40,
        quoteCurrency: "GBP"
      ),
    ]

    // One real fill from before pause.
    trades = [
      Trade(
        id: UUID(),
        symbol: "ETH-USD",
        side: .buy,
        quantity: 0.42,
        executionPrice: 2_450,
        executedAt: calendar.date(byAdding: .day, value: -3, to: .now)!,
        orderReference: "AUTO-9001",
        source: "DCA",
        status: .filled,
        realizedPnL: nil
      ),
    ]

    // Bug pattern: automation still appends "trades" at price 0 while paused (intent only).
    for (index, size) in [0.05, 0.08, 0.12].enumerated() {
      trades.append(
        Trade(
          id: UUID(),
          symbol: "ETH-USD",
          side: .buy,
          quantity: size,
          executionPrice: 0,
          executedAt: calendar.date(byAdding: .hour, value: -(index + 1), to: .now)!,
          orderReference: "AUTO-90\(10 + index)",
          source: "Rebalance (paused)",
          status: .skipped,
          realizedPnL: nil
        )
      )
    }
  }
}
