import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsers() {
  console.log('🔍 Checking users in Supabase...\n');

  // Check auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  console.log(`📧 Found ${authUsers.users.length} users in Auth:\n`);
  
  for (const user of authUsers.users) {
    console.log(`Email: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`  Created: ${user.created_at}`);
    console.log(`  Last Sign In: ${user.last_sign_in_at || 'Never'}`);
    
    // Check if user exists in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.log(`  ❌ Not in users table: ${userError.message}`);
    } else {
      console.log(`  ✅ In users table: ${userData.role} role`);
    }
    
    console.log('');
  }

  // Check users table
  const { data: dbUsers, error: dbError } = await supabase
    .from('users')
    .select('*');
  
  if (dbError) {
    console.error('Error fetching users from database:', dbError);
  } else {
    console.log(`\n📊 Found ${dbUsers?.length || 0} users in users table:\n`);
    dbUsers?.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Full Name: ${user.full_name || 'N/A'}`);
      console.log('');
    });
  }
}

checkUsers().catch(console.error);

