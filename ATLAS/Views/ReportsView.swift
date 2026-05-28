import SwiftUI

struct ReportsView: View {
    @EnvironmentObject private var store: InvestmentStore

    var body: some View {
        NavigationStack {
            List(store.reports) { report in
                VStack(alignment: .leading, spacing: 8) {
                    Text(report.title)
                        .font(.headline)
                    Text("Period end \(DateFormat.medium.string(from: report.periodEnd))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    HStack {
                        Text("Generated \(DateFormat.medium.string(from: report.generatedAt))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        Spacer()
                        StatusBadge(status: report.status)
                    }
                }
                .padding(.vertical, 4)
            }
            .navigationTitle("Reports")
        }
        .preferredColorScheme(.dark)
    }
}
