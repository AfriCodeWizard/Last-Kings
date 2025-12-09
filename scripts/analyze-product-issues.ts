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

async function analyzeProductIssues() {
  console.log('🔍 Analyzing system for potential product scanning issues...\n');

  try {
    // Get all product variants with full details
    const { data: allVariants, error: allError } = await supabase
      .from('product_variants')
      .select(`
        id,
        upc,
        size_ml,
        sku,
        price,
        cost,
        products(
          id,
          product_type,
          brand_id,
          category_id,
          brands(name),
          categories(name)
        )
      `);

    if (allError) {
      console.error('Error querying variants:', allError);
      return;
    }

    if (!allVariants || allVariants.length === 0) {
      console.log('No products found in the system.');
      return;
    }

    console.log(`📊 Total products analyzed: ${allVariants.length}\n`);

    // Issue 1: Missing UPC
    const missingUPC = allVariants.filter((v: any) => 
      !v.upc || v.upc.trim().length === 0
    );

    // Issue 2: Missing or null brand
    const missingBrand = allVariants.filter((v: any) => 
      !v.products?.brands || !v.products?.brands?.name || v.products?.brands?.name.trim().length === 0
    );

    // Issue 3: Missing or null category
    const missingCategory = allVariants.filter((v: any) => 
      !v.products?.categories || !v.products?.categories?.name || v.products?.categories?.name.trim().length === 0
    );

    // Issue 4: Missing product_type
    const missingProductType = allVariants.filter((v: any) => 
      !v.products?.product_type
    );

    // Issue 5: UPC with whitespace issues
    const upcWhitespaceIssues = allVariants.filter((v: any) => 
      v.upc && v.upc.trim() !== v.upc
    );

    // Issue 6: Products that would fail inner join queries (missing brand_id or category_id)
    const missingRelations = allVariants.filter((v: any) => 
      !v.products?.brand_id || !v.products?.category_id
    );

    // Issue 7: Zero or negative prices
    const invalidPrices = allVariants.filter((v: any) => 
      !v.price || v.price <= 0
    );

    // Issue 8: Zero or negative sizes
    const invalidSizes = allVariants.filter((v: any) => 
      !v.size_ml || v.size_ml <= 0
    );

    // Print summary
    console.log('📋 ISSUE SUMMARY:\n');
    console.log(`   ❌ Missing UPC: ${missingUPC.length}`);
    console.log(`   ❌ Missing Brand: ${missingBrand.length}`);
    console.log(`   ❌ Missing Category: ${missingCategory.length}`);
    console.log(`   ❌ Missing Product Type: ${missingProductType.length}`);
    console.log(`   ⚠️  UPC Whitespace Issues: ${upcWhitespaceIssues.length}`);
    console.log(`   ❌ Missing Relations (brand_id/category_id): ${missingRelations.length}`);
    console.log(`   ❌ Invalid Prices (≤0): ${invalidPrices.length}`);
    console.log(`   ❌ Invalid Sizes (≤0): ${invalidSizes.length}\n`);

    // Detailed reports
    if (missingUPC.length > 0) {
      console.log('❌ PRODUCTS MISSING UPC:\n');
      missingUPC.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const categoryName = v.products?.categories?.name || 'Unknown Category';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        console.log(`   ${index + 1}. ${brandName} - ${categoryName} (${size})`);
        console.log(`      SKU: ${v.sku || 'N/A'}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    }

    if (missingBrand.length > 0) {
      console.log('❌ PRODUCTS MISSING BRAND:\n');
      missingBrand.forEach((v: any, index: number) => {
        const categoryName = v.products?.categories?.name || 'Unknown Category';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'No UPC';
        console.log(`   ${index + 1}. ${categoryName} (${size})`);
        console.log(`      UPC: ${upc}`);
        console.log(`      SKU: ${v.sku || 'N/A'}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log(`      Brand ID: ${v.products?.brand_id || 'MISSING'}`);
        console.log('');
      });
    }

    if (missingCategory.length > 0) {
      console.log('❌ PRODUCTS MISSING CATEGORY:\n');
      missingCategory.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'No UPC';
        console.log(`   ${index + 1}. ${brandName} (${size})`);
        console.log(`      UPC: ${upc}`);
        console.log(`      SKU: ${v.sku || 'N/A'}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log(`      Category ID: ${v.products?.category_id || 'MISSING'}`);
        console.log('');
      });
    }

    if (missingProductType.length > 0) {
      console.log('❌ PRODUCTS MISSING PRODUCT TYPE:\n');
      missingProductType.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const categoryName = v.products?.categories?.name || 'Unknown Category';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'No UPC';
        console.log(`   ${index + 1}. ${brandName} - ${categoryName} (${size})`);
        console.log(`      UPC: ${upc}`);
        console.log(`      SKU: ${v.sku || 'N/A'}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    }

    if (upcWhitespaceIssues.length > 0) {
      console.log('⚠️  PRODUCTS WITH UPC WHITESPACE ISSUES:\n');
      upcWhitespaceIssues.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        console.log(`   ${index + 1}. ${brandName} (${size})`);
        console.log(`      UPC (raw): "${v.upc}"`);
        console.log(`      UPC (trimmed): "${v.upc.trim()}"`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    }

    if (missingRelations.length > 0) {
      console.log('❌ PRODUCTS WITH MISSING RELATIONS (will fail inner join queries):\n');
      missingRelations.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const categoryName = v.products?.categories?.name || 'Unknown Category';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'No UPC';
        console.log(`   ${index + 1}. ${brandName} - ${categoryName} (${size})`);
        console.log(`      UPC: ${upc}`);
        console.log(`      Brand ID: ${v.products?.brand_id || 'MISSING'}`);
        console.log(`      Category ID: ${v.products?.category_id || 'MISSING'}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    }

    if (invalidPrices.length > 0) {
      console.log('❌ PRODUCTS WITH INVALID PRICES (≤0):\n');
      invalidPrices.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'No UPC';
        console.log(`   ${index + 1}. ${brandName} (${size})`);
        console.log(`      Price: ${v.price || 0}`);
        console.log(`      UPC: ${upc}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    }

    if (invalidSizes.length > 0) {
      console.log('❌ PRODUCTS WITH INVALID SIZES (≤0):\n');
      invalidSizes.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'Unknown Brand';
        const upc = v.upc || 'No UPC';
        console.log(`   ${index + 1}. ${brandName}`);
        console.log(`      Size: ${v.size_ml || 0}ml`);
        console.log(`      UPC: ${upc}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    }

    // Products that would fail POS scanning (critical issues)
    const criticalIssues = allVariants.filter((v: any) => {
      return (
        !v.upc || v.upc.trim().length === 0 ||
        !v.products?.brands?.name ||
        !v.products?.categories?.name ||
        !v.products?.product_type ||
        !v.products?.brand_id ||
        !v.products?.category_id ||
        !v.price || v.price <= 0
      );
    });

    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL: Products that will FAIL POS scanning:\n');
      criticalIssues.forEach((v: any, index: number) => {
        const brandName = v.products?.brands?.name || 'MISSING BRAND';
        const categoryName = v.products?.categories?.name || 'MISSING CATEGORY';
        const size = v.size_ml === 1000 ? '1L' : `${v.size_ml}ml`;
        const upc = v.upc || 'MISSING UPC';
        const issues: string[] = [];
        
        if (!v.upc || v.upc.trim().length === 0) issues.push('Missing UPC');
        if (!v.products?.brands?.name) issues.push('Missing Brand');
        if (!v.products?.categories?.name) issues.push('Missing Category');
        if (!v.products?.product_type) issues.push('Missing Product Type');
        if (!v.products?.brand_id) issues.push('Missing Brand ID');
        if (!v.products?.category_id) issues.push('Missing Category ID');
        if (!v.price || v.price <= 0) issues.push('Invalid Price');

        console.log(`   ${index + 1}. ${brandName} - ${categoryName} (${size})`);
        console.log(`      Issues: ${issues.join(', ')}`);
        console.log(`      UPC: ${upc}`);
        console.log(`      SKU: ${v.sku || 'N/A'}`);
        console.log(`      Variant ID: ${v.id}`);
        console.log('');
      });
    } else {
      console.log('✅ No critical issues found! All products should scan correctly.\n');
    }

    // Summary
    const totalIssues = missingUPC.length + missingBrand.length + missingCategory.length + 
                       missingProductType.length + missingRelations.length + 
                       invalidPrices.length + invalidSizes.length;
    
    if (totalIssues === 0) {
      console.log('✅ System analysis complete: No issues found!');
    } else {
      console.log(`\n⚠️  Total issues found: ${totalIssues}`);
      console.log('   Please fix these issues to ensure all products can be scanned correctly.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

analyzeProductIssues().catch(console.error);

