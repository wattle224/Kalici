import SwiftUI

struct ValuationsView: View {
    @EnvironmentObject private var store: InvestmentStore

    var body: some View {
        NavigationStack {
            List(store.valuations.sorted { $0.asOfDate > $1.asOfDate }) { record in
                if let investment = store.investment(for: record.investmentID) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(investment.name)
                            .font(.headline)
                        Text("As of \(DateFormat.medium.string(from: record.asOfDate))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(record.methodology)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        HStack {
                            Text(MoneyFormat.string(from: record.nav))
                                .font(.subheadline.weight(.semibold))
                                .monospacedDigit()
                            Spacer()
                            StatusBadge(status: record.status)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Valuations")
        }
        .preferredColorScheme(.dark)
    }
}
