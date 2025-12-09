// Product catalog data organized by category
// Updated with official brand list
export const productCatalog = {
  liquor: [
    {
      category: "Beers/Lagers/Stouts",
      brands: ["Tusker", "Tusker Lite", "Tusker Smooth", "Guinness", "Pilsner", "White Cap", "Manyatta", "Balozi", "Heineken"]
    },
    {
      category: "Ciders/RTDs",
      brands: ["Hunters", "Savanna", "Pineapple Punch", "Black Ice", "Guarana"]
    },
    {
      category: "Wines",
      brands: ["4th Street", "Four Cousins", "Drostdy-Hof", "Caprice", "Casabuena"]
    },
    {
      category: "Whisky",
      brands: ["Johnnie Walker Red Label", "Johnnie Walker Black Label", "Black & White", "Vat 69", "Bond 7", "County", "Napoleon", "Kenya Kane", "Kenya King", "Singleton"]
    },
    {
      category: "Vodka",
      brands: ["Chrome", "Best Vodka", "Generic Vodka"]
    },
    {
      category: "Gin",
      brands: ["Gilbey's", "Gordon's", "Best Gin", "Best Gin/Vodka"]
    },
    {
      category: "Brandy",
      brands: ["Viceroy", "Richot", "General Meakins", "Mr Dowells"]
    },
    {
      category: "Rum",
      brands: ["Captain Morgan", "Muckpit"]
    },
    {
      category: "Local Spirits",
      brands: ["Kibao", "KC Pineapple", "KC Ginger", "KC smooth", "Triple Ace"]
    }
  ],
  beverage: [
    {
      category: "Energy Drinks",
      brands: ["Red Bull", "Predator", "Monster"]
    },
    {
      category: "Soft Drinks",
      brands: ["Coca-Cola", "Sprite", "Pepsi", "Minute Maid"]
    },
    {
      category: "Juices",
      brands: ["Delmonte"]
    },
    {
      category: "Water",
      brands: ["Drinking Water"]
    }
  ]
}

// Create a map of brand to category for quick lookup
export const brandToCategoryMap: Record<string, { category: string; productType: 'liquor' | 'beverage' }> = {}

Object.entries(productCatalog).forEach(([productType, categories]) => {
  categories.forEach(({ category, brands }) => {
    brands.forEach((brand) => {
      brandToCategoryMap[brand.toLowerCase()] = {
        category,
        productType: productType as 'liquor' | 'beverage'
      }
    })
  })
})

// Get all brands for a product type
export function getBrandsForType(productType: 'liquor' | 'beverage'): string[] {
  return productCatalog[productType].flatMap(cat => cat.brands)
}

// Get category for a brand
export function getCategoryForBrand(brand: string): { category: string; productType: 'liquor' | 'beverage' } | null {
  return brandToCategoryMap[brand.toLowerCase()] || null
}

// Get all categories for a product type
export function getCategoriesForType(productType: 'liquor' | 'beverage'): string[] {
  return productCatalog[productType].map(cat => cat.category)
}

