import Foundation

struct TradingSnapshot: Codable {
  var schemaVersion: Int
  var executionState: AutomationExecutionState
  var trades: [Trade]
  var openPositions: [OpenPosition]
}

enum TradingPersistence {
  static let currentSchemaVersion = 2
  private static let snapshotKey = "com.kalici.atlas.trading.snapshot"
  private static let needsCleanRestartKey = "com.kalici.atlas.trading.needsCleanRestart"

  static func load() -> TradingSnapshot? {
    guard let data = UserDefaults.standard.data(forKey: snapshotKey) else { return nil }
    return try? JSONDecoder().decode(TradingSnapshot.self, from: data)
  }

  static func save(_ snapshot: TradingSnapshot) {
    guard let data = try? JSONEncoder().encode(snapshot) else { return }
    UserDefaults.standard.set(data, forKey: snapshotKey)
  }

  static func clear() {
    UserDefaults.standard.removeObject(forKey: snapshotKey)
  }

  static func markNeedsCleanRestart() {
    UserDefaults.standard.set(true, forKey: needsCleanRestartKey)
  }

  static func consumeCleanRestartFlag() -> Bool {
    let flag = UserDefaults.standard.bool(forKey: needsCleanRestartKey)
    if flag {
      UserDefaults.standard.removeObject(forKey: needsCleanRestartKey)
    }
    return flag
  }

  /// Removes legacy rows that looked like fills but had no execution price.
  static func sanitize(_ snapshot: TradingSnapshot) -> TradingSnapshot {
    var copy = snapshot
    copy.trades = snapshot.trades.map { trade in
      var row = trade
      if row.executionPrice == 0, row.status == .filled {
        row.status = .skipped
        row.realizedPnL = nil
      }
      if row.executionPrice == 0, row.status != .skipped {
        row.status = .skipped
        row.realizedPnL = nil
      }
      return row
    }
    return copy
  }

  static func containsCorruptHistory(_ snapshot: TradingSnapshot) -> Bool {
    let zeroPriceFilled = snapshot.trades.contains { $0.executionPrice == 0 && $0.status == .filled }
    let duplicatePositionPnLOnRows = snapshot.trades.filter(\.isSettledFill).count > 1
      && snapshot.trades.filter { $0.realizedPnL == snapshot.openPositions.first?.unrealizedPnL }.count > 1
    return zeroPriceFilled || duplicatePositionPnLOnRows
  }
}
