import Foundation

enum MoneyFormat {
    static let currency: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    static func string(from value: Decimal) -> String {
        currency.string(from: value as NSDecimalNumber) ?? "$0"
    }

    static func compact(from value: Decimal) -> String {
        let amount = (value as NSDecimalNumber).doubleValue
        switch amount {
        case 1_000_000_000...:
            return String(format: "$%.1fB", amount / 1_000_000_000)
        case 1_000_000...:
            return String(format: "$%.1fM", amount / 1_000_000)
        case 1_000...:
            return String(format: "$%.0fK", amount / 1_000)
        default:
            return string(from: value)
        }
    }
}

enum DateFormat {
    static let medium: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
}
