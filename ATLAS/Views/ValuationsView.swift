import SwiftUI

struct ValuationsView: View {
    @EnvironmentObject private var store: InvestmentStore

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.valuations.sorted { $0.asOfDate > $1.asOfDate }) { record in
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
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button("Advance") {
                                store.advanceValuationStatus(record.id)
                            }
                            .tint(.blue)
                        }
                        .contextMenu {
                            Button("Advance status") {
                                store.advanceValuationStatus(record.id)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Valuations")
            .toolbar {
                ToolbarItem(placement: .bottomBar) {
                    Text("Swipe or long-press a row to advance status")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
