import Foundation

/// Records automated executions with a price snapshot at fill time.
@MainActor
final class TradeAutomationService {
  private(set) var trades: [Trade] = []

  func recordFill(
    symbol: String,
    side: TradeSide,
    quantity: Decimal,
    executionPrice: Decimal,
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
        executionPrice: executionPrice,
        executedAt: executedAt,
        orderReference: orderReference,
        source: source
      )
    )
  }

  func loadSampleExecutions() {
    let calendar = Calendar.current
    trades = [
      Trade(
        id: UUID(),
        symbol: "AAPL",
        side: .buy,
        quantity: 50,
        executionPrice: 187.42,
        executedAt: calendar.date(byAdding: .hour, value: -72, to: .now)!,
        orderReference: "AUTO-10041",
        source: "Rebalance"
      ),
      Trade(
        id: UUID(),
        symbol: "MSFT",
        side: .buy,
        quantity: 30,
        executionPrice: 412.18,
        executedAt: calendar.date(byAdding: .hour, value: -48, to: .now)!,
        orderReference: "AUTO-10042",
        source: "Rebalance"
      ),
      Trade(
        id: UUID(),
        symbol: "AAPL",
        side: .sell,
        quantity: 10,
        executionPrice: 191.05,
        executedAt: calendar.date(byAdding: .hour, value: -24, to: .now)!,
        orderReference: "AUTO-10043",
        source: "Tax-loss harvest"
      ),
      Trade(
        id: UUID(),
        symbol: "VTI",
        side: .buy,
        quantity: 100,
        executionPrice: 248.63,
        executedAt: calendar.date(byAdding: .hour, value: -6, to: .now)!,
        orderReference: "AUTO-10044",
        source: "DCA"
      ),
    ]
  }
}
