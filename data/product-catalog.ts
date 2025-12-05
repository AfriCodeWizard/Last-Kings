// Product catalog data organized by category
export const productCatalog = {
  liquor: [
    {
      category: "Beers/Lagers/Stouts",
      brands: ["Tusker", "Lite", "Smooth", "Guinness", "Pilsner", "White Cap", "Manyatta", "Balozi", "Heineken"]
    },
    {
      category: "Ciders/RTDs",
      brands: ["Hunters", "Savanna", "Black Ice", "Pineapple Punch", "Guarana"]
    },
    {
      category: "Whisky",
      brands: ["J. Walker Red/Black", "Vat 69", "Bond 7", "County", "Napoleon", "Kenya Kane", "Kenya King", "Black & White", "Singleton"]
    },
    {
      category: "Vodka",
      brands: ["Chrome", "Best Vodka", "Regular Vodka"]
    },
    {
      category: "Gin",
      brands: ["Gilbey's", "Gordon's", "Best Gin Blue", "Gin/Vodka mix"]
    },
    {
      category: "Brandy",
      brands: ["Viceroy", "Richot", "Meakins", "Mr Dowell"]
    },
    {
      category: "Rum",
      brands: ["Captain Morgan", "Muckpit"]
    },
    {
      category: "Wines",
      brands: ["4th Street", "Four Cousins", "Drostdyhof", "Caprice", "Casabuena"]
    },
    {
      category: "Local Spirits",
      brands: ["Kibao", "KC Pineapple", "KC Ginger", "Triple Ace"]
    },
    {
      category: "Other Spirits",
      brands: ["Bond", "County", "Best Gin/Vodka"]
    }
  ],
  beverage: [
    {
      category: "Energy Drinks",
      brands: ["Red Bull", "Predator", "Monster"]
    },
    {
      category: "Soft Drinks",
      brands: ["Coca-Cola", "Sprite", "Pepsi", "Minute Maid", "Soda"]
    },
    {
      category: "Juices",
      brands: ["Delmonte 1L"]
    },
    {
      category: "Water",
      brands: ["Water 1L"]
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

