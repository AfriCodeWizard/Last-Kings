/**
 * KRA (Kenya Revenue Authority) Tax Calculation Utilities
 * Compliant with Kenyan liquor taxation system
 */

// KRA Excise Duty rates per liter (as of 2024)
export const KRA_EXCISE_RATES = {
  // Beer: KES 142.44 per liter
  'Beer': 142.44,
  // Spirits (Whiskey, Vodka, Gin, Rum, Tequila, etc.): KES 356.42 per liter
  'Bourbon': 356.42,
  'Whiskey': 356.42,
  'Scotch': 356.42,
  'Vodka': 356.42,
  'Gin': 356.42,
  'Rum': 356.42,
  'Tequila': 356.42,
  'Cognac': 356.42,
  'Brandy': 356.42,
  'Spirits': 356.42,
  // Wine: KES 229.94 per liter
  'Wine': 229.94,
  'Champagne': 229.94,
  // Liqueurs and other: Use spirits rate
  'Liqueur': 356.42,
  'Aperitif': 356.42,
  'Amaro': 356.42,
  // Default rate for unknown categories
  'default': 356.42,
} as const

// KRA VAT rate: 16%
export const KRA_VAT_RATE = 0.16

/**
 * Calculate excise duty for a product based on category and volume
 * @param categoryName Product category name
 * @param volumeMl Volume in milliliters
 * @returns Excise duty amount in KES
 */
export function calculateExciseDuty(categoryName: string | undefined, volumeMl: number): number {
  const category = categoryName || 'default'
  const ratePerLiter = KRA_EXCISE_RATES[category as keyof typeof KRA_EXCISE_RATES] || KRA_EXCISE_RATES.default
  const volumeLiters = volumeMl / 1000
  return ratePerLiter * volumeLiters
}

/**
 * Calculate total excise duty for cart items
 * @param items Cart items with category and volume information
 * @returns Total excise duty in KES
 */
export function calculateTotalExciseDuty(items: Array<{ category_name?: string; size_ml: number; quantity: number }>): number {
  return items.reduce((total, item) => {
    const excisePerUnit = calculateExciseDuty(item.category_name, item.size_ml)
    return total + (excisePerUnit * item.quantity)
  }, 0)
}

/**
 * Calculate KRA-compliant taxes for a sale
 * Prices are inclusive of VAT, so we need to extract VAT from the price first
 * Then add excise duty and recalculate VAT on the total
 * @param subtotal Subtotal (prices are inclusive of VAT)
 * @param exciseDuty Total excise duty amount
 * @returns Object with VAT amount and total
 */
export function calculateKRATaxes(subtotal: number, exciseDuty: number) {
  // Since prices are inclusive of VAT, extract the base price (excluding VAT)
  // If price is 1000 and VAT is 16%, base = 1000 / (1 + 0.16) = 862.07
  const basePrice = subtotal / (1 + KRA_VAT_RATE)
  
  // VAT is calculated on (base price + excise duty)
  const vatBase = basePrice + exciseDuty
  const vat = vatBase * KRA_VAT_RATE
  
  // Total is base price + excise duty + VAT
  const total = basePrice + exciseDuty + vat
  
  return {
    vat,
    exciseDuty,
    total,
    vatRate: KRA_VAT_RATE,
    basePrice,
  }
}

