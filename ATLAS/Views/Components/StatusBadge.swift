import SwiftUI

struct StatusBadge: View {
    let status: WorkflowStatus

    var body: some View {
        Text(status.label)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.18), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch status {
        case .pending: .orange
        case .inReview: .blue
        case .approved: .green
        case .settled: .gray
        }
    }
}
