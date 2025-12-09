import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPOSQuery() {
  console.log('🔍 Testing POS query for all products...\n');

  try {
    // Get all variants with UPC
    const { data: allVariants, error: allError } = await supabase
      .from('product_variants')
      .select(`
        id,
        upc,
        size_ml,
        sku
      `)
      .not('upc', 'is', null);

    if (allError) {
      console.error('Error querying variants:', allError);
      return;
    }

    if (!allVariants || allVariants.length === 0) {
      console.log('No products with UPC found.');
      return;
    }

    console.log(`📊 Testing ${allVariants.length} products with UPC...\n`);

    let successCount = 0;
    let failCount = 0;
    const failedProducts: any[] = [];

    // Test each product with the exact POS query
    for (const variant of allVariants) {
      if (!variant.upc || variant.upc.trim().length === 0) {
        continue;
      }

      const upc = variant.upc.trim();
      
      // Use the exact same query as POS
      const { data: posResult, error: posError } = await supabase
        .from("product_variants")
        .select(`
          id,
          size_ml,
          price,
          sku,
          upc,
          products!inner(
            product_type,
            brands!inner(name),
            categories!inner(name)
          )
        `)
        .eq("upc", upc)
        .limit(1);

      if (posError) {
        console.error(`❌ Error querying UPC ${upc}:`, posError.message);
        failCount++;
        failedProducts.push({
          upc,
          variantId: variant.id,
          sku: variant.sku,
          size: variant.size_ml,
          error: posError.message
        });
        continue;
      }

      if (!posResult || posResult.length === 0) {
        console.warn(`⚠️  UPC ${upc} not found with inner join query`);
        failCount++;
        failedProducts.push({
          upc,
          variantId: variant.id,
          sku: variant.sku,
          size: variant.size_ml,
          error: 'No result with inner join (missing brand/category?)'
        });
        continue;
      }

      const result = posResult[0] as any;
      
      // Check if all required fields are present
      const hasUPC = result.upc && result.upc.trim().length > 0;
      const hasBrand = result.products?.brands?.name;
      const hasCategory = result.products?.categories?.name;
      const hasProductType = result.products?.product_type;
      const hasPrice = result.price && result.price > 0;

      if (!hasUPC || !hasBrand || !hasCategory || !hasProductType || !hasPrice) {
        const issues: string[] = [];
        if (!hasUPC) issues.push('Missing UPC');
        if (!hasBrand) issues.push('Missing Brand');
        if (!hasCategory) issues.push('Missing Category');
        if (!hasProductType) issues.push('Missing Product Type');
        if (!hasPrice) issues.push('Invalid Price');

        failCount++;
        failedProducts.push({
          upc,
          variantId: variant.id,
          sku: variant.sku,
          size: variant.size_ml,
          brand: result.products?.brands?.name || 'Unknown',
          error: `Missing fields: ${issues.join(', ')}`
        });
      } else {
        successCount++;
      }
    }

    console.log('\n📊 RESULTS:\n');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}\n`);

    if (failedProducts.length > 0) {
      console.log('❌ PRODUCTS THAT WILL FAIL POS SCANNING:\n');
      failedProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. UPC: ${product.upc}`);
        console.log(`      Brand: ${product.brand || 'Unknown'}`);
        console.log(`      Size: ${product.size === 1000 ? '1L' : `${product.size}ml`}`);
        console.log(`      SKU: ${product.sku}`);
        console.log(`      Issue: ${product.error}`);
        console.log(`      Variant ID: ${product.variantId}`);
        console.log('');
      });
    } else {
      console.log('✅ All products passed the POS query test!');
      console.log('   All products should scan correctly in the POS system.\n');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testPOSQuery().catch(console.error);

