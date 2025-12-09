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

async function checkKCGinger() {
  console.log('🔍 Checking KC Ginger 250ml specifically...\n');

  try {
    // Now check all variants for KC Ginger - get all variants first, then filter
    const { data: allVariants, error: allError } = await supabase
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

    if (allError) {
      console.error('Error querying all variants:', allError);
      return;
    }

    // Filter for KC or Ginger in brand name
    const variants = allVariants?.filter((v: any) => {
      const brandName = v.products?.brands?.name?.toLowerCase() || '';
      return brandName.includes('kc') || brandName.includes('ginger');
    }) || [];

    if (allError) {
      console.error('Error querying variants:', allError);
      return;
    }

    console.log('\n📦 All KC/Ginger Variants:');
    if (variants && variants.length > 0) {
      variants.forEach((v: any) => {
        const brandName = v.products?.brands?.name || 'Unknown';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'MISSING UPC';
        const upcStatus = v.upc ? '✅' : '❌';
        console.log(`  ${upcStatus} ${brandName} ${size}`);
        console.log(`     UPC: ${upc}`);
        console.log(`     SKU: ${v.sku}`);
        console.log(`     Variant ID: ${v.id}`);
        console.log('');
      });

      // Check specifically for 250ml
      const ginger250ml = variants.filter((v: any) => 
        v.size_ml === 250 && 
        (v.products?.brands?.name?.toLowerCase().includes('kc') || 
         v.products?.brands?.name?.toLowerCase().includes('ginger'))
      );

      if (ginger250ml.length > 0) {
        console.log('🎯 KC Ginger 250ml specifically:');
        ginger250ml.forEach((v: any) => {
          const brandName = v.products?.brands?.name || 'Unknown';
          const upc = v.upc || 'MISSING UPC';
          const upcStatus = v.upc ? '✅' : '❌';
          console.log(`  ${upcStatus} ${brandName} 250ml`);
          console.log(`     UPC: "${upc}" (length: ${upc?.length || 0})`);
          console.log(`     UPC trimmed: "${upc?.trim() || ''}" (length: ${upc?.trim()?.length || 0})`);
          console.log(`     SKU: ${v.sku}`);
          console.log(`     Variant ID: ${v.id}`);
          console.log('');
        });
      } else {
        console.log('❌ No KC Ginger 250ml found!');
      }
    } else {
      console.log('No variants found');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkKCGinger().catch(console.error);

