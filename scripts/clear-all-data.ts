import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role key for admin operations, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are set in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearAllData() {
  console.log('🚨 WARNING: This will delete ALL business data from the system!');
  console.log('📋 The following will be preserved:');
  console.log('   - Brands (for dropdown)');
  console.log('   - Categories (for dropdown)');
  console.log('   - Inventory locations (for dropdown)');
  console.log('   - Users (system accounts)');
  console.log('   - Distributors (for dropdown)');
  console.log('   - Tax rates (system configuration)');
  console.log('');
  console.log('🗑️  The following will be DELETED:');
  console.log('   - All sales and sale items');
  console.log('   - All tabs');
  console.log('   - All inventory stock levels and transactions');
  console.log('   - All receiving sessions and received items');
  console.log('   - All purchase orders and PO items');
  console.log('   - All customers and allocations');
  console.log('   - All products and product variants');
  console.log('');

    try {
      console.log('Starting data clearing process...\n');

    // Helper function to delete all rows from a table
    async function deleteAllFromTable(tableName: string, step: number) {
      console.log(`${step}. Clearing ${tableName}...`);
      let deletedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        // Fetch a batch of IDs
        const { data, error: fetchError } = await supabase
          .from(tableName)
          .select('id')
          .limit(1000);
        
        if (fetchError) {
          console.error(`   Error fetching ${tableName}:`, fetchError.message);
          break;
        }
        
        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }
        
        // Delete the batch
        const ids = data.map(row => row.id);
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in('id', ids);
        
        if (deleteError) {
          console.error(`   Error deleting from ${tableName}:`, deleteError.message);
          break;
        }
        
        deletedCount += ids.length;
        console.log(`   Deleted ${deletedCount} rows from ${tableName}...`);
        
        // If we got less than 1000, we're done
        if (data.length < 1000) {
          hasMore = false;
        }
      }
      
      console.log(`   ✓ ${tableName} cleared (${deletedCount} rows)`);
    }

    // Clear tabs (must be before sales due to foreign key)
    await deleteAllFromTable('tabs', 2);

    // Clear sale items first (due to foreign key)
    await deleteAllFromTable('sale_items', 3);

    // Clear sales
    await deleteAllFromTable('sales', 4);

    // Clear inventory transactions
    await deleteAllFromTable('inventory_transactions', 5);

    // Clear stock levels
    await deleteAllFromTable('stock_levels', 6);

    // Clear received items
    await deleteAllFromTable('received_items', 7);

    // Clear receiving sessions
    await deleteAllFromTable('receiving_sessions', 8);

    // Clear PO items
    await deleteAllFromTable('po_items', 9);

    // Clear purchase orders
    await deleteAllFromTable('purchase_orders', 10);

    // Clear allocations
    await deleteAllFromTable('allocations', 11);

    // Clear customers
    await deleteAllFromTable('customers', 12);

    // Clear product variants (must be before products)
    await deleteAllFromTable('product_variants', 13);

    // Clear products (but keep brands and categories)
    await deleteAllFromTable('products', 14);

    // NOTE: Users table is NEVER touched - all user accounts are preserved
    console.log('15. Verifying users are preserved...');
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✓ Users preserved (${userCount || 0} user accounts remain)`);

    console.log('\n✅ Data clearing completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - All transactional data has been cleared');
    console.log('   - All products and variants have been cleared');
    console.log('   - Brands, categories, locations, users, and distributors are preserved');
    console.log('   - ⚠️  IMPORTANT: All user accounts remain intact and were NOT deleted');
    console.log('\n🎉 Your system is now ready for a fresh start!');

  } catch (error: any) {
    console.error('\n❌ Error during data clearing:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
clearAllData().catch(console.error);

