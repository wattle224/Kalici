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

enum SterlingFormat {
    static let currency: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "GBP"
        formatter.locale = Locale(identifier: "en_GB")
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    static func string(from value: Decimal) -> String {
        currency.string(from: value as NSDecimalNumber) ?? "£0.00"
    }

    static func signedPnL(from value: Decimal) -> String {
        let formatted = string(from: abs(value))
        if value > 0 { return "+\(formatted)" }
        if value < 0 { return "−\(formatted)" }
        return formatted
    }
}

enum PriceFormat {
    /// Per-unit execution prices need fractional digits; whole-dollar formatting makes distinct fills look identical.
    static let perUnit: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 4
        return formatter
    }()

    static func string(from value: Decimal) -> String {
        perUnit.string(from: value as NSDecimalNumber) ?? "$0.00"
    }
}

enum DateFormat {
    static let medium: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    static let dateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
