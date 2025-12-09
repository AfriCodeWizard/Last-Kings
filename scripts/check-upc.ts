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

async function checkUPC(upc: string) {
  console.log(`🔍 Checking UPC: ${upc}\n`);

  try {
    // Query with exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('product_variants')
      .select(`
        id,
        upc,
        size_ml,
        sku,
        price,
        cost,
        products!inner(
          id,
          product_type,
          brands!inner(name),
          categories!inner(name)
        )
      `)
      .eq('upc', upc.trim())
      .limit(1)
      .maybeSingle();

    if (exactError) {
      console.error('Error querying database:', exactError);
      return;
    }

    if (exactMatch) {
      console.log('✅ PRODUCT FOUND:\n');
      const variant = exactMatch as any;
      const brandName = variant.products?.brands?.name || 'Unknown Brand';
      const categoryName = variant.products?.categories?.name || 'Unknown Category';
      const productType = variant.products?.product_type || 'Unknown';
      const size = variant.size_ml === 1000 ? '1L' : `${variant.size_ml}ml`;
      
      console.log(`   Brand: ${brandName}`);
      console.log(`   Category: ${categoryName}`);
      console.log(`   Product Type: ${productType}`);
      console.log(`   Size: ${size}`);
      console.log(`   SKU: ${variant.sku || 'N/A'}`);
      console.log(`   Price: KES ${variant.price || 0}`);
      console.log(`   Cost: KES ${variant.cost || 0}`);
      console.log(`   UPC: ${variant.upc}`);
      console.log(`   Variant ID: ${variant.id}`);
      console.log(`   Product ID: ${variant.products?.id}`);
      console.log('');
      console.log('✅ This UPC can be scanned in the POS system!');
    } else {
      console.log('❌ PRODUCT NOT FOUND\n');
      console.log(`   UPC "${upc}" is not in the system.`);
      console.log('');
      
      // Try case-insensitive search
      const { data: caseInsensitive, error: ciError } = await supabase
        .from('product_variants')
        .select('upc, size_ml, products(brands(name))')
        .ilike('upc', upc.trim())
        .limit(5);

      if (!ciError && caseInsensitive && caseInsensitive.length > 0) {
        console.log('⚠️  Found similar UPCs (case mismatch?):');
        caseInsensitive.forEach((v: any) => {
          const brandName = v.products?.brands?.name || 'Unknown';
          const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
          console.log(`   - ${brandName} ${size}: "${v.upc}"`);
        });
        console.log('');
      }

      // Try partial match (first 10 digits)
      if (upc.trim().length >= 10) {
        const partial = upc.trim().substring(0, 10);
        const { data: partialMatch, error: partialError } = await supabase
          .from('product_variants')
          .select('upc, size_ml, products(brands(name))')
          .like('upc', `${partial}%`)
          .limit(5);

        if (!partialError && partialMatch && partialMatch.length > 0) {
          console.log(`⚠️  Found UPCs starting with "${partial}":`);
          partialMatch.forEach((v: any) => {
            const brandName = v.products?.brands?.name || 'Unknown';
            const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
            console.log(`   - ${brandName} ${size}: "${v.upc}"`);
          });
          console.log('');
        }
      }

      console.log('💡 This UPC needs to be added to the system before it can be scanned.');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Get UPC from command line argument or use the provided one
const upc = process.argv[2] || '6161101607476';
checkUPC(upc).catch(console.error);

