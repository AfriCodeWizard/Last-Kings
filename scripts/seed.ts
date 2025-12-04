import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { Database } from '../types/supabase';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use admin client if service role key is available, otherwise use anon key
const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const premiumProducts = [
  // Tequila
  { name: 'Don Julio 1942', brand: 'Don Julio', category: 'Tequila', description: 'Ultra-premium añejo tequila', sizes: [750, 1500], collectible: true },
  { name: 'Clase Azul Reposado', brand: 'Clase Azul', category: 'Tequila', description: 'Hand-painted ceramic bottle', sizes: [750], collectible: true, allocation: true },
  { name: 'Patrón Extra Añejo', brand: 'Patrón', category: 'Tequila', description: 'Aged 3+ years', sizes: [750] },
  { name: 'Casa Dragones Joven', brand: 'Casa Dragones', category: 'Tequila', description: 'Small batch sipping tequila', sizes: [750], collectible: true },
  { name: 'Herradura Selección Suprema', brand: 'Herradura', category: 'Tequila', description: 'Extra añejo', sizes: [750], collectible: true },
  
  // Whiskey - Bourbon
  { name: 'Pappy Van Winkle 23 Year', brand: 'Old Rip Van Winkle', category: 'Bourbon', description: 'Ultra-rare allocated bourbon', sizes: [750], collectible: true, allocation: true },
  { name: 'Blanton\'s Original Single Barrel', brand: 'Blanton\'s', category: 'Bourbon', description: 'Single barrel bourbon', sizes: [750], collectible: true },
  { name: 'Booker\'s Bourbon', brand: 'Jim Beam', category: 'Bourbon', description: 'Uncut, unfiltered', sizes: [750] },
  { name: 'Woodford Reserve Double Oaked', brand: 'Woodford Reserve', category: 'Bourbon', description: 'Double barrel aged', sizes: [750, 1000] },
  { name: 'Angel\'s Envy Cask Strength', brand: 'Angel\'s Envy', category: 'Bourbon', description: 'Port wine finished', sizes: [750], collectible: true },
  { name: 'Four Roses Limited Edition', brand: 'Four Roses', category: 'Bourbon', description: 'Annual limited release', sizes: [750], collectible: true, allocation: true },
  
  // Whiskey - Scotch
  { name: 'Macallan 25 Year', brand: 'Macallan', category: 'Scotch', description: 'Sherry oak cask', sizes: [750], collectible: true, allocation: true },
  { name: 'Johnnie Walker Blue Label', brand: 'Johnnie Walker', category: 'Scotch', description: 'Blended scotch whisky', sizes: [750, 1000] },
  { name: 'Glenfiddich 21 Year', brand: 'Glenfiddich', category: 'Scotch', description: 'Rum cask finished', sizes: [750] },
  { name: 'Lagavulin 16 Year', brand: 'Lagavulin', category: 'Scotch', description: 'Islay single malt', sizes: [750] },
  { name: 'Ardbeg Uigeadail', brand: 'Ardbeg', category: 'Scotch', description: 'Peated single malt', sizes: [750] },
  { name: 'Dalmore King Alexander III', brand: 'Dalmore', category: 'Scotch', description: 'Six cask finish', sizes: [750], collectible: true },
  
  // Whiskey - Japanese
  { name: 'Yamazaki 18 Year', brand: 'Yamazaki', category: 'Japanese Whiskey', description: 'Rare aged Japanese whisky', sizes: [750], collectible: true, allocation: true },
  { name: 'Hibiki 21 Year', brand: 'Hibiki', category: 'Japanese Whiskey', description: 'Harmony blended whisky', sizes: [750], collectible: true, allocation: true },
  { name: 'Nikka Taketsuru Pure Malt', brand: 'Nikka', category: 'Japanese Whiskey', description: 'Blended malt whisky', sizes: [750] },
  { name: 'Hakushu 12 Year', brand: 'Hakushu', category: 'Japanese Whiskey', description: 'Single malt', sizes: [750], collectible: true },
  
  // Cognac
  { name: 'Hennessy Paradis', brand: 'Hennessy', category: 'Cognac', description: 'Extra old cognac', sizes: [750], collectible: true },
  { name: 'Rémy Martin Louis XIII', brand: 'Rémy Martin', category: 'Cognac', description: 'Ultra-premium cognac', sizes: [750], collectible: true, allocation: true },
  { name: 'Courvoisier XO', brand: 'Courvoisier', category: 'Cognac', description: 'Extra old', sizes: [750] },
  { name: 'Martell Cordon Bleu', brand: 'Martell', category: 'Cognac', description: 'Premium blend', sizes: [750] },
  
  // Vodka
  { name: 'Belvedere Heritage 176', brand: 'Belvedere', category: 'Vodka', description: 'Limited edition', sizes: [750], collectible: true },
  { name: 'Grey Goose VX', brand: 'Grey Goose', category: 'Vodka', description: 'Cognac finished', sizes: [750] },
  { name: 'Ciroc Ten', brand: 'Ciroc', category: 'Vodka', description: 'Aged 10 years', sizes: [750] },
  { name: 'Ketel One Vodka', brand: 'Ketel One', category: 'Vodka', description: 'Dutch vodka', sizes: [750, 1000, 1750] },
  
  // Rum
  { name: 'Appleton Estate 21 Year', brand: 'Appleton Estate', category: 'Rum', description: 'Jamaican rum', sizes: [750], collectible: true },
  { name: 'Zacapa 23', brand: 'Zacapa', category: 'Rum', description: 'Guatemalan rum', sizes: [750] },
  { name: 'Diplomatico Reserva Exclusiva', brand: 'Diplomatico', category: 'Rum', description: 'Venezuelan rum', sizes: [750] },
  { name: 'Plantation XO', brand: 'Plantation', category: 'Rum', description: 'Barbados rum', sizes: [750] },
  
  // Gin
  { name: 'Hendrick\'s Midsummer Solstice', brand: 'Hendrick\'s', category: 'Gin', description: 'Limited edition', sizes: [750], collectible: true },
  { name: 'Monkey 47', brand: 'Monkey 47', category: 'Gin', description: 'Black Forest gin', sizes: [500, 750] },
  { name: 'Bombay Sapphire', brand: 'Bombay', category: 'Gin', description: 'London dry gin', sizes: [750, 1000] },
  { name: 'Tanqueray No. Ten', brand: 'Tanqueray', category: 'Gin', description: 'Premium gin', sizes: [750] },
  
  // Liqueurs
  { name: 'Grand Marnier Cuvée du Centenaire', brand: 'Grand Marnier', category: 'Liqueur', description: 'Centenary blend', sizes: [750], collectible: true },
  { name: 'Chartreuse VEP', brand: 'Chartreuse', category: 'Liqueur', description: 'Aged in oak', sizes: [750], collectible: true },
  { name: 'Domaine de Canton', brand: 'Domaine de Canton', category: 'Liqueur', description: 'Ginger liqueur', sizes: [750] },
  
  // Champagne
  { name: 'Dom Pérignon', brand: 'Moët & Chandon', category: 'Champagne', description: 'Vintage champagne', sizes: [750], collectible: true },
  { name: 'Krug Grande Cuvée', brand: 'Krug', category: 'Champagne', description: 'Multi-vintage', sizes: [750], collectible: true },
  { name: 'Cristal', brand: 'Louis Roederer', category: 'Champagne', description: 'Prestige cuvée', sizes: [750], collectible: true, allocation: true },
  { name: 'Veuve Clicquot La Grande Dame', brand: 'Veuve Clicquot', category: 'Champagne', description: 'Prestige cuvée', sizes: [750], collectible: true },
  
  // Wine - Red
  { name: 'Opus One', brand: 'Opus One', category: 'Wine', description: 'Bordeaux blend', sizes: [750], collectible: true },
  { name: 'Screaming Eagle', brand: 'Screaming Eagle', category: 'Wine', description: 'Napa Valley cabernet', sizes: [750], collectible: true, allocation: true },
  { name: 'Domaine de la Romanée-Conti', brand: 'DRC', category: 'Wine', description: 'Burgundy pinot noir', sizes: [750], collectible: true, allocation: true },
  
  // Wine - White
  { name: 'Domaine Leflaive Montrachet', brand: 'Domaine Leflaive', category: 'Wine', description: 'Burgundy chardonnay', sizes: [750], collectible: true, allocation: true },
  
  // Other
  { name: 'Aperol', brand: 'Aperol', category: 'Aperitif', description: 'Italian aperitif', sizes: [750, 1000] },
  { name: 'Campari', brand: 'Campari', category: 'Aperitif', description: 'Italian bitter', sizes: [750, 1000] },
  { name: 'Fernet-Branca', brand: 'Fernet-Branca', category: 'Amaro', description: 'Italian amaro', sizes: [750] },
];

const sizePrices: Record<number, { cost: number; price: number }> = {
  50: { cost: 5, price: 12 },
  200: { cost: 15, price: 35 },
  375: { cost: 20, price: 45 },
  500: { cost: 25, price: 55 },
  750: { cost: 30, price: 70 },
  1000: { cost: 40, price: 90 },
  1500: { cost: 50, price: 120 },
  1750: { cost: 60, price: 140 },
};

async function seed() {
  console.log('🌱 Starting seed...');

  // Create brands
  const brandsMap = new Map<string, string>();
  const uniqueBrands = [...new Set(premiumProducts.map(p => p.brand))];
  
  for (const brandName of uniqueBrands) {
    const { data, error } = await ((supabase
      .from('brands') as any)
      .upsert({ name: brandName }, { onConflict: 'name' })
      .select()
      .single());
    
    if (error && !error.message.includes('duplicate')) {
      console.error(`Error creating brand ${brandName}:`, error);
    } else if (data) {
      brandsMap.set(brandName, (data as any).id);
      console.log(`✓ Brand: ${brandName}`);
    }
  }

  // Create categories
  const categoriesMap = new Map<string, string>();
  const uniqueCategories = [...new Set(premiumProducts.map(p => p.category))];
  
  for (const categoryName of uniqueCategories) {
    const { data, error } = await ((supabase
      .from('categories') as any)
      .upsert({ name: categoryName }, { onConflict: 'name' })
      .select()
      .single());
    
    if (error && !error.message.includes('duplicate')) {
      console.error(`Error creating category ${categoryName}:`, error);
    } else if (data) {
      categoriesMap.set(categoryName, (data as any).id);
      console.log(`✓ Category: ${categoryName}`);
    }
  }

  // Create products and variants
  for (const product of premiumProducts) {
    const brandId = brandsMap.get(product.brand);
    const categoryId = categoriesMap.get(product.category);
    
    if (!brandId || !categoryId) {
      console.error(`Missing brand or category for ${product.name}`);
      continue;
    }

    // Create product
    const { data: productData, error: productError } = await ((supabase
      .from('products') as any)
      .upsert({
        name: product.name,
        brand_id: brandId,
        category_id: categoryId,
        description: product.description,
      }, { onConflict: 'name' })
      .select()
      .single());

    if (productError && !productError.message.includes('duplicate')) {
      console.error(`Error creating product ${product.name}:`, productError);
      continue;
    }

    if (!productData) continue;

    console.log(`✓ Product: ${product.name}`);

    // Create variants
    for (const size of product.sizes) {
      const pricing = sizePrices[size] || { cost: 30, price: 70 };
      const sku = `${product.brand.toUpperCase().replace(/\s/g, '')}-${product.name.toUpperCase().replace(/\s/g, '')}-${size}`;
      const upc = `8${Math.random().toString().slice(2, 11)}`;

      const { error: variantError } = await ((supabase
        .from('product_variants') as any)
        .upsert({
          product_id: (productData as any).id,
          size_ml: size,
          sku,
          upc,
          cost: pricing.cost * (product.collectible ? 1.5 : 1),
          price: pricing.price * (product.collectible ? 2 : 1) * (product.allocation ? 1.3 : 1),
          collectible: product.collectible || false,
          allocation_only: product.allocation || false,
        }, { onConflict: 'sku' });

      if (variantError && !variantError.message.includes('duplicate')) {
        console.error(`Error creating variant for ${product.name} ${size}ml:`, variantError);
      }
    }
  }

  // Create default locations
  const locations = [
    { name: 'Main Floor', type: 'floor' },
    { name: 'Back Room', type: 'backroom' },
    { name: 'Warehouse', type: 'warehouse' },
  ];

  for (const location of locations) {
    const { error } = await ((supabase.from('inventory_locations') as any)
      .upsert(location, { onConflict: 'name' }));
    
    if (error && !error.message.includes('duplicate')) {
      console.error(`Error creating location ${location.name}:`, error);
    } else {
      console.log(`✓ Location: ${location.name}`);
    }
  }

  // Create default tax rates
  const taxRates = [
    { name: 'State Sales Tax', rate: 0.08, type: 'sales', active: true },
    { name: 'Federal Excise Tax', rate: 0.05, type: 'excise', active: true },
  ];

  for (const rate of taxRates) {
    const { error } = await ((supabase.from('tax_rates') as any)
      .upsert(rate, { onConflict: 'name' }));
    
    if (error && !error.message.includes('duplicate')) {
      console.error(`Error creating tax rate ${rate.name}:`, error);
    } else {
      console.log(`✓ Tax Rate: ${rate.name}`);
    }
  }

  // Create demo users (requires service role key)
  const demoUsers = [
    { email: 'admin@lastkings.com', password: 'admin123', full_name: 'Admin User', role: 'admin' },
    { email: 'manager@lastkings.com', password: 'manager123', full_name: 'Manager User', role: 'manager' },
    { email: 'staff@lastkings.com', password: 'staff123', full_name: 'Staff User', role: 'staff' },
  ];

  console.log('\n📧 Creating demo users...');
  for (const user of demoUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠ User ${user.email} already exists, skipping...`);
          continue;
        }
        throw authError;
      }

      if (authData.user) {
        // Create user record in users table
        const { error: userError } = await ((supabase.from('users') as any)
          .upsert({
            id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          }, { onConflict: 'id' });

        if (userError) {
          console.error(`Error creating user record for ${user.email}:`, userError);
        } else {
          console.log(`✓ User: ${user.email} (${user.role}) - Password: ${user.password}`);
        }
      }
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
      // If service role key is not available, skip user creation
      if (error instanceof Error && error.message.includes('JWT')) {
        console.log('⚠ Service role key not found. Skipping user creation.');
        console.log('   You can create users manually through the registration page.');
        break;
      }
    }
  }

  console.log('\n✅ Seed completed!');
  console.log('\n📝 Demo Credentials:');
  console.log('   Admin:   admin@lastkings.com / admin123');
  console.log('   Manager: manager@lastkings.com / manager123');
  console.log('   Staff:   staff@lastkings.com / staff123');
}

seed().catch(console.error);

