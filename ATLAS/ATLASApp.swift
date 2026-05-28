import SwiftUI

@main
struct ATLASApp: App {
    @StateObject private var store = InvestmentStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
        }
    }
}
