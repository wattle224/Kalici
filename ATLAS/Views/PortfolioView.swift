import SwiftUI

struct PortfolioView: View {
    @EnvironmentObject private var store: InvestmentStore

    var body: some View {
        NavigationStack {
            List(store.investments) { investment in
                NavigationLink(value: investment) {
                    InvestmentRow(investment: investment)
                }
            }
            .navigationTitle("Portfolio")
            .navigationDestination(for: Investment.self) { investment in
                InvestmentDetailView(investment: investment)
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct InvestmentRow: View {
    let investment: Investment

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(investment.name)
                .font(.headline)
            Text("\(investment.manager) · \(investment.assetClass.rawValue)")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Text("NAV \(MoneyFormat.compact(from: investment.nav))")
                Spacer()
                Text("Unfunded \(MoneyFormat.compact(from: investment.unfundedCommitment))")
            }
            .font(.caption)
            .monospacedDigit()
        }
        .padding(.vertical, 4)
    }
}

struct InvestmentDetailView: View {
    @EnvironmentObject private var store: InvestmentStore
    let investment: Investment

    var body: some View {
        List {
            Section("Overview") {
                LabeledContent("Manager", value: investment.manager)
                LabeledContent("Vintage", value: String(investment.vintageYear))
                LabeledContent("Asset class", value: investment.assetClass.rawValue)
                LabeledContent("Status", value: investment.status.rawValue.capitalized)
            }

            Section("Capital") {
                LabeledContent("Committed", value: MoneyFormat.string(from: investment.committedCapital))
                LabeledContent("Called", value: MoneyFormat.string(from: investment.calledCapital))
                LabeledContent("Distributed", value: MoneyFormat.string(from: investment.distributedCapital))
                LabeledContent("DPI", value: String(format: "%.2fx", investment.dpi))
            }

            Section("Recent capital events") {
                ForEach(store.events(for: investment.id)) { event in
                    CapitalEventRow(event: event, investmentName: investment.name, showInvestment: false)
                }
            }
        }
        .navigationTitle(investment.name)
        .navigationBarTitleDisplayMode(.inline)
        .preferredColorScheme(.dark)
    }
}
