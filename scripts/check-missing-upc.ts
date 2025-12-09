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

async function checkMissingUPC() {
  console.log('🔍 Checking for products without UPC/Barcode...\n');

  try {
    // Query all product variants with their product and brand information
    const { data: variants, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        upc,
        size_ml,
        sku,
        products!inner(
          id,
          product_type,
          brands!inner(name),
          categories!inner(name)
        )
      `);

    if (error) {
      console.error('Error querying database:', error);
      return;
    }

    if (!variants || variants.length === 0) {
      console.log('No products found in the system.');
      return;
    }

    // Filter variants without UPC
    const variantsWithoutUPC = variants.filter((v: any) => 
      !v.upc || v.upc.trim().length === 0
    );

    const variantsWithUPC = variants.filter((v: any) => 
      v.upc && v.upc.trim().length > 0
    );

    console.log('📊 Summary:');
    console.log(`   Total products: ${variants.length}`);
    console.log(`   Products WITH UPC: ${variantsWithUPC.length}`);
    console.log(`   Products WITHOUT UPC: ${variantsWithoutUPC.length}\n`);

    if (variantsWithoutUPC.length > 0) {
      console.log('❌ Products WITHOUT UPC/Barcode:\n');
      
      // Group by product type
      const liquorProducts = variantsWithoutUPC.filter((v: any) => 
        v.products?.product_type === 'liquor'
      );
      const beverageProducts = variantsWithoutUPC.filter((v: any) => 
        v.products?.product_type === 'beverage'
      );

      if (liquorProducts.length > 0) {
        console.log('🍷 LIQUOR PRODUCTS:');
        liquorProducts.forEach((variant: any, index: number) => {
          const brandName = variant.products?.brands?.name || 'Unknown Brand';
          const categoryName = variant.products?.categories?.name || 'Unknown Category';
          const size = variant.size_ml === 1000 ? '1L' : `${variant.size_ml}ml`;
          const sku = variant.sku || 'N/A';
          console.log(`   ${index + 1}. ${brandName} - ${categoryName} (${size})`);
          console.log(`      SKU: ${sku}`);
          console.log(`      Variant ID: ${variant.id}`);
          console.log('');
        });
      }

      if (beverageProducts.length > 0) {
        console.log('🥤 BEVERAGE PRODUCTS:');
        beverageProducts.forEach((variant: any, index: number) => {
          const brandName = variant.products?.brands?.name || 'Unknown Brand';
          const categoryName = variant.products?.categories?.name || 'Unknown Category';
          const size = variant.size_ml === 1000 ? '1L' : `${variant.size_ml}ml`;
          const sku = variant.sku || 'N/A';
          console.log(`   ${index + 1}. ${brandName} - ${categoryName} (${size})`);
          console.log(`      SKU: ${sku}`);
          console.log(`      Variant ID: ${variant.id}`);
          console.log('');
        });
      }

      console.log('\n⚠️  These products need UPC/Barcode to be added before they can be received.');
      console.log('   You can add UPC by editing the product in the product catalog.\n');
    } else {
      console.log('✅ All products have UPC/Barcode logged!');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkMissingUPC().catch(console.error);

