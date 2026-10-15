import SwiftUI

struct CapitalActivityView: View {
    @EnvironmentObject private var store: InvestmentStore

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.capitalEvents.sorted { $0.dueDate < $1.dueDate }) { event in
                    if let investment = store.investment(for: event.investmentID) {
                        CapitalEventRow(event: event, investmentName: investment.name)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button("Advance") {
                                    store.advanceCapitalEventStatus(event.id)
                                }
                                .tint(.blue)
                            }
                            .contextMenu {
                                Button("Advance status") {
                                    store.advanceCapitalEventStatus(event.id)
                                }
                            }
                    }
                }
            }
            .navigationTitle("Capital Activity")
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

struct CapitalEventRow: View {
    let event: CapitalEvent
    let investmentName: String
    var showInvestment: Bool = true

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: event.type == .capitalCall ? "arrow.down.circle" : "arrow.up.circle")
                .foregroundStyle(event.type == .capitalCall ? .orange : .green)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text(event.type == .capitalCall ? "Capital Call" : "Distribution")
                    .font(.subheadline.weight(.semibold))
                if showInvestment {
                    Text(investmentName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text(event.reference)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                Text("Due \(DateFormat.medium.string(from: event.dueDate))")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 6) {
                Text(MoneyFormat.compact(from: event.amount))
                    .font(.subheadline.weight(.semibold))
                    .monospacedDigit()
                StatusBadge(status: event.status)
            }
        }
        .padding(.vertical, 2)
    }
}
