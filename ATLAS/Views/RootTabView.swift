import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.doc.horizontal")
                }

            PortfolioView()
                .tabItem {
                    Label("Portfolio", systemImage: "briefcase")
                }

            CapitalActivityView()
                .tabItem {
                    Label("Capital", systemImage: "arrow.left.arrow.right")
                }

            TradeHistoryView()
                .tabItem {
                    Label("Trades", systemImage: "clock.arrow.circlepath")
                }

            ValuationsView()
                .tabItem {
                    Label("Valuations", systemImage: "chart.line.uptrend.xyaxis")
                }

            ReportsView()
                .tabItem {
                    Label("Reports", systemImage: "doc.text")
                }
        }
        .tint(Color.atlasAccent)
    }
}

extension Color {
    static let atlasAccent = Color(red: 0.18, green: 0.55, blue: 0.82)
    static let atlasBackground = Color(red: 0.06, green: 0.08, blue: 0.11)
}
