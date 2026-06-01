import Foundation

enum AssetClass: String, CaseIterable, Codable, Identifiable {
    case privateEquity = "Private Equity"
    case privateCredit = "Private Credit"
    case realEstate = "Real Estate"
    case infrastructure = "Infrastructure"

    var id: String { rawValue }
}

enum InvestmentStatus: String, Codable {
    case active
    case fullyInvested
    case realized
}

struct Investment: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var manager: String
    var vintageYear: Int
    var assetClass: AssetClass
    var status: InvestmentStatus
    var committedCapital: Decimal
    var calledCapital: Decimal
    var distributedCapital: Decimal
    var nav: Decimal
    var currency: String

    var unfundedCommitment: Decimal {
        max(committedCapital - calledCapital, 0)
    }

    var netAssetValue: Decimal {
        nav
    }

    var dpi: Double {
        guard calledCapital > 0 else { return 0 }
        return (distributedCapital as NSDecimalNumber).doubleValue
            / (calledCapital as NSDecimalNumber).doubleValue
    }
}

enum CapitalEventType: String, Codable {
    case capitalCall
    case distribution
}

struct CapitalEvent: Identifiable, Codable, Hashable {
    let id: UUID
    var investmentID: UUID
    var type: CapitalEventType
    var amount: Decimal
    var dueDate: Date
    var status: WorkflowStatus
    var reference: String
}

enum WorkflowStatus: String, Codable, CaseIterable {
    case pending
    case inReview
    case approved
    case settled

    var label: String {
        switch self {
        case .pending: "Pending"
        case .inReview: "In Review"
        case .approved: "Approved"
        case .settled: "Settled"
        }
    }
}

struct ValuationRecord: Identifiable, Codable, Hashable {
    let id: UUID
    var investmentID: UUID
    var asOfDate: Date
    var nav: Decimal
    var methodology: String
    var status: WorkflowStatus
}

struct OpsReport: Identifiable, Codable, Hashable {
    let id: UUID
    var title: String
    var periodEnd: Date
    var generatedAt: Date
    var status: WorkflowStatus
}

struct PortfolioSummary {
    var totalNAV: Decimal
    var totalCommitted: Decimal
    var totalCalled: Decimal
    var totalDistributed: Decimal
    var unfundedCommitments: Decimal
    var pendingCapitalCalls: Decimal
    var activeInvestments: Int
}

enum AutomationExecutionState: String, Codable {
    case running
    case paused
}

enum TradeSide: String, Codable {
    case buy
    case sell
}

enum TradeRecordStatus: String, Codable {
    /// Exchange/broker confirmed fill with a price.
    case filled
    /// Automation logged intent but did not execute (e.g. execution paused).
    case skipped
    case pending
}

/// A completed execution. `executionPrice` is frozen at fill time and must not be derived from live quotes.
struct Trade: Identifiable, Codable, Hashable {
    let id: UUID
    var symbol: String
    var side: TradeSide
    var quantity: Decimal
    /// Per-unit fill price captured when the trade was recorded. Zero means no fill occurred.
    var executionPrice: Decimal
    var executedAt: Date
    var orderReference: String
    var source: String
    var status: TradeRecordStatus
    /// Realized P&L for this fill only (e.g. on a sell). Nil for buys and non-fills.
    var realizedPnL: Decimal?

    var notional: Decimal {
        quantity * executionPrice
    }

    /// Only confirmed fills belong in trade history — not skipped intents or zero-price rows.
    var isSettledFill: Bool {
        status == .filled && executionPrice > 0 && quantity > 0
    }
}

struct OpenPosition: Identifiable, Codable, Hashable {
    let id: UUID
    var symbol: String
    var quantity: Decimal
    var averageEntryPrice: Decimal
    /// Mark-to-market P&L for the open position (not duplicated on each trade row).
    var unrealizedPnL: Decimal
    var quoteCurrency: String
}
