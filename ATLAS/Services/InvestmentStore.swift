import Foundation

@MainActor
final class InvestmentStore: ObservableObject {
    @Published private(set) var investments: [Investment] = []
    @Published private(set) var capitalEvents: [CapitalEvent] = []
    @Published private(set) var valuations: [ValuationRecord] = []
    @Published private(set) var reports: [OpsReport] = []
    private let tradeAutomation = TradeAutomationService()

    init() {
        loadSampleData()
        tradeAutomation.bootstrap()
    }

    func performCleanRestart() {
        tradeAutomation.performCleanRestart()
        objectWillChange.send()
    }

    var isExecutionPaused: Bool {
        tradeAutomation.isExecutionPaused
    }

    var settledTrades: [Trade] {
        tradeAutomation.settledFills
    }

    var skippedTradesWhilePaused: [Trade] {
        tradeAutomation.skippedWhilePaused
    }

    var openPositions: [OpenPosition] {
        tradeAutomation.openPositions
    }

    func openPosition(for symbol: String) -> OpenPosition? {
        tradeAutomation.openPositions.first { $0.symbol == symbol }
    }

    var summary: PortfolioSummary {
        let active = investments.filter { $0.status != .realized }
        let pendingCalls = capitalEvents
            .filter { $0.type == .capitalCall && $0.status != .settled }
            .map(\.amount)
            .reduce(0, +)

        return PortfolioSummary(
            totalNAV: active.map(\.nav).reduce(0, +),
            totalCommitted: investments.map(\.committedCapital).reduce(0, +),
            totalCalled: investments.map(\.calledCapital).reduce(0, +),
            totalDistributed: investments.map(\.distributedCapital).reduce(0, +),
            unfundedCommitments: active.map(\.unfundedCommitment).reduce(0, +),
            pendingCapitalCalls: pendingCalls,
            activeInvestments: active.count
        )
    }

    func investment(for id: UUID) -> Investment? {
        investments.first { $0.id == id }
    }

    func events(for investmentID: UUID) -> [CapitalEvent] {
        capitalEvents
            .filter { $0.investmentID == investmentID }
            .sorted { $0.dueDate > $1.dueDate }
    }

    func valuations(for investmentID: UUID) -> [ValuationRecord] {
        valuations
            .filter { $0.investmentID == investmentID }
            .sorted { $0.asOfDate > $1.asOfDate }
    }

    private func loadSampleData() {
        let fundA = Investment(
            id: UUID(uuidString: "A1000001-0001-4001-8001-000000000001")!,
            name: "North America Buyout Fund VII",
            manager: "Summit Partners",
            vintageYear: 2021,
            assetClass: .privateEquity,
            status: .active,
            committedCapital: 75_000_000,
            calledCapital: 52_500_000,
            distributedCapital: 18_200_000,
            nav: 61_400_000,
            currency: "USD"
        )
        let fundB = Investment(
            id: UUID(uuidString: "B2000002-0002-4002-8002-000000000002")!,
            name: "Global Infrastructure Co-Invest",
            manager: "Brookfield",
            vintageYear: 2022,
            assetClass: .infrastructure,
            status: .active,
            committedCapital: 40_000_000,
            calledCapital: 28_000_000,
            distributedCapital: 4_500_000,
            nav: 29_800_000,
            currency: "USD"
        )
        let fundC = Investment(
            id: UUID(uuidString: "C3000003-0003-4003-8003-000000000003")!,
            name: "Asia Real Estate Value Add",
            manager: "CapitaLand",
            vintageYear: 2020,
            assetClass: .realEstate,
            status: .fullyInvested,
            committedCapital: 25_000_000,
            calledCapital: 25_000_000,
            distributedCapital: 9_100_000,
            nav: 21_300_000,
            currency: "USD"
        )

        investments = [fundA, fundB, fundC]

        let calendar = Calendar.current
        capitalEvents = [
            CapitalEvent(
                id: UUID(),
                investmentID: fundA.id,
                type: .capitalCall,
                amount: 3_750_000,
                dueDate: calendar.date(byAdding: .day, value: 12, to: .now)!,
                status: .inReview,
                reference: "CC-2026-0142"
            ),
            CapitalEvent(
                id: UUID(),
                investmentID: fundB.id,
                type: .distribution,
                amount: 2_100_000,
                dueDate: calendar.date(byAdding: .day, value: -3, to: .now)!,
                status: .approved,
                reference: "DIST-2026-0088"
            ),
            CapitalEvent(
                id: UUID(),
                investmentID: fundC.id,
                type: .distribution,
                amount: 1_250_000,
                dueDate: calendar.date(byAdding: .day, value: 28, to: .now)!,
                status: .pending,
                reference: "DIST-2026-0091"
            )
        ]

        valuations = [
            ValuationRecord(
                id: UUID(),
                investmentID: fundA.id,
                asOfDate: calendar.date(from: DateComponents(year: 2026, month: 3, day: 31))!,
                nav: 61_400_000,
                methodology: "NAV from GP statement",
                status: .approved
            ),
            ValuationRecord(
                id: UUID(),
                investmentID: fundB.id,
                asOfDate: calendar.date(from: DateComponents(year: 2026, month: 3, day: 31))!,
                nav: 29_800_000,
                methodology: "Fair value model",
                status: .inReview
            )
        ]

        reports = [
            OpsReport(
                id: UUID(),
                title: "Q1 2026 Private Markets Official Report",
                periodEnd: calendar.date(from: DateComponents(year: 2026, month: 3, day: 31))!,
                generatedAt: calendar.date(byAdding: .day, value: -5, to: .now)!,
                status: .inReview
            ),
            OpsReport(
                id: UUID(),
                title: "March 2026 Capital Activity Summary",
                periodEnd: calendar.date(from: DateComponents(year: 2026, month: 3, day: 31))!,
                generatedAt: calendar.date(byAdding: .day, value: -1, to: .now)!,
                status: .pending
            )
        ]
    }
}
