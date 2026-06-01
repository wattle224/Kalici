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
    trades
      .filter { $0.status == .skipped || ($0.executionPrice == 0 && $0.status != .filled) }
      .sorted { $0.executedAt > $1.executedAt }
  }

  func bootstrap() {
    if TradingPersistence.consumeCleanRestartFlag() {
      performCleanRestart(persist: true)
      return
    }

    if let snapshot = TradingPersistence.load() {
      if snapshot.schemaVersion < TradingPersistence.currentSchemaVersion
        || TradingPersistence.containsCorruptHistory(snapshot)
      {
        performCleanRestart(persist: true)
        return
      }
      apply(TradingPersistence.sanitize(snapshot))
      persist()
      return
    }

    performCleanRestart(persist: true)
  }

  func performCleanRestart(persist: Bool = true) {
    TradingPersistence.clear()
    loadCleanBootstrap()
    if persist {
      self.persist()
    }
  }

  func setExecutionPaused(_ paused: Bool) {
    executionState = paused ? .paused : .running
    persist()
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
    persist()
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
    persist()
  }

  private func loadCleanBootstrap() {
    executionState = .paused

    let calendar = Calendar.current

    openPositions = [
      OpenPosition(
        id: UUID(),
        symbol: "ETH-USD",
        quantity: 0.42,
        averageEntryPrice: 2_450,
        unrealizedPnL: 71.40,
        quoteCurrency: "GBP"
      ),
    ]

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
  }

  private func apply(_ snapshot: TradingSnapshot) {
    executionState = snapshot.executionState
    trades = snapshot.trades
    openPositions = snapshot.openPositions
  }

  private func persist() {
    TradingPersistence.save(
      TradingSnapshot(
        schemaVersion: TradingPersistence.currentSchemaVersion,
        executionState: executionState,
        trades: trades,
        openPositions: openPositions
      )
    )
  }
}
