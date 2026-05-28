import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var store: InvestmentStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    metricsGrid
                    pendingSection
                }
                .padding()
            }
            .background(Color.atlasBackground.ignoresSafeArea())
            .navigationTitle("ATLAS")
            .navigationBarTitleDisplayMode(.large)
        }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Investment Operations")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("Private Markets")
                .font(.title2.weight(.semibold))
        }
    }

    private var metricsGrid: some View {
        let summary = store.summary
        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            MetricCard(
                title: "Total NAV",
                value: MoneyFormat.compact(from: summary.totalNAV),
                footnote: "\(summary.activeInvestments) active investments"
            )
            MetricCard(
                title: "Unfunded",
                value: MoneyFormat.compact(from: summary.unfundedCommitments),
                footnote: "Remaining commitments"
            )
            MetricCard(
                title: "Called Capital",
                value: MoneyFormat.compact(from: summary.totalCalled)
            )
            MetricCard(
                title: "Distributed",
                value: MoneyFormat.compact(from: summary.totalDistributed)
            )
        }
    }

    private var pendingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Requires attention")
                .font(.headline)

            if store.summary.pendingCapitalCalls > 0 {
                HStack {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundStyle(.orange)
                    VStack(alignment: .leading) {
                        Text("Pending capital calls")
                            .font(.subheadline.weight(.medium))
                        Text(MoneyFormat.string(from: store.summary.pendingCapitalCalls))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding()
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
            }

            ForEach(store.capitalEvents.filter { $0.status == .inReview }.prefix(3)) { event in
                if let investment = store.investment(for: event.investmentID) {
                    CapitalEventRow(event: event, investmentName: investment.name)
                }
            }
        }
    }
}
