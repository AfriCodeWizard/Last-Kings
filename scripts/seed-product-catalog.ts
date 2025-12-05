import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { productCatalog } from '../data/product-catalog'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedProductCatalog() {
  console.log('🌱 Starting product catalog seed...')

  try {
    // First, delete all existing products, variants, and related data
    console.log('🗑️  Cleaning up existing data...')
    
    // Delete in order to respect foreign key constraints
    await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('received_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('stock_levels').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('brands').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('✅ Existing data cleaned')

    // Create brands and categories
    const brandMap: Record<string, string> = {}
    const categoryMap: Record<string, string> = {}

    // Process liquor products
    for (const { category, brands } of productCatalog.liquor) {
      // Create or get category
      let categoryId = categoryMap[category]
      if (!categoryId) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .insert({ name: category })
          .select()
          .single()

        if (catError && !catError.message.includes('duplicate')) {
          console.error(`Error creating category ${category}:`, catError)
        } else if (catData) {
          categoryId = catData.id
          categoryMap[category] = categoryId
          console.log(`✅ Created category: ${category}`)
        } else {
          // Category might already exist, fetch it
          const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('name', category)
            .single()
          if (existing) {
            categoryId = existing.id
            categoryMap[category] = categoryId
          }
        }
      }

      // Create brands for this category
      for (const brandName of brands) {
        if (!brandMap[brandName]) {
          const { data: brandData, error: brandError } = await supabase
            .from('brands')
            .insert({ name: brandName })
            .select()
            .single()

          if (brandError && !brandError.message.includes('duplicate')) {
            console.error(`Error creating brand ${brandName}:`, brandError)
          } else if (brandData) {
            brandMap[brandName] = brandData.id
            console.log(`✅ Created brand: ${brandName}`)
          } else {
            // Brand might already exist, fetch it
            const { data: existing } = await supabase
              .from('brands')
              .select('id')
              .eq('name', brandName)
              .single()
            if (existing) {
              brandMap[brandName] = existing.id
            }
          }
        }
      }
    }

    // Process beverage products
    for (const { category, brands } of productCatalog.beverage) {
      // Create or get category
      let categoryId = categoryMap[category]
      if (!categoryId) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .insert({ name: category })
          .select()
          .single()

        if (catError && !catError.message.includes('duplicate')) {
          console.error(`Error creating category ${category}:`, catError)
        } else if (catData) {
          categoryId = catData.id
          categoryMap[category] = categoryId
          console.log(`✅ Created category: ${category}`)
        } else {
          // Category might already exist, fetch it
          const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('name', category)
            .single()
          if (existing) {
            categoryId = existing.id
            categoryMap[category] = categoryId
          }
        }
      }

      // Create brands for this category
      for (const brandName of brands) {
        if (!brandMap[brandName]) {
          const { data: brandData, error: brandError } = await supabase
            .from('brands')
            .insert({ name: brandName })
            .select()
            .single()

          if (brandError && !brandError.message.includes('duplicate')) {
            console.error(`Error creating brand ${brandName}:`, brandError)
          } else if (brandData) {
            brandMap[brandName] = brandData.id
            console.log(`✅ Created brand: ${brandName}`)
          } else {
            // Brand might already exist, fetch it
            const { data: existing } = await supabase
              .from('brands')
              .select('id')
              .eq('name', brandName)
              .single()
            if (existing) {
              brandMap[brandName] = existing.id
            }
          }
        }
      }
    }

    console.log('✅ Product catalog seed completed!')
    console.log(`📊 Created ${Object.keys(brandMap).length} brands and ${Object.keys(categoryMap).length} categories`)

  } catch (error) {
    console.error('❌ Error seeding product catalog:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  seedProductCatalog()
    .then(() => {
      console.log('✨ Seed completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error)
      process.exit(1)
    })
}

export { seedProductCatalog }

