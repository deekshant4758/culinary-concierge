// scripts/seed.js — uses Prisma client directly
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p) => bcrypt.hashSync(p, 10);

  // ── Users ────────────────────────────────────────────────────────────────
  await prisma.user.createMany({ data: [
    { name: 'Nick Fury',       email: 'nick@shield.com',    password: hash('admin123'),   role: 'admin',   region: 'global'  },
    { name: 'Captain Marvel',  email: 'marvel@shield.com',  password: hash('manager123'), role: 'manager', region: 'india'   },
    { name: 'Captain America', email: 'america@shield.com', password: hash('manager123'), role: 'manager', region: 'america' },
    { name: 'Thanos',          email: 'thanos@shield.com',  password: hash('member123'),  role: 'member',  region: 'india'   },
    { name: 'Thor',            email: 'thor@shield.com',    password: hash('member123'),  role: 'member',  region: 'india'   },
    { name: 'Travis',          email: 'travis@shield.com',  password: hash('member123'),  role: 'member',  region: 'america' },
  ]});

  // ── Restaurants ──────────────────────────────────────────────────────────
  const r1  = await prisma.restaurant.create({ data: { name: 'Bukhara Grill',     description: 'Award-winning North Indian fine dining with tandoor specialties',   cuisine: 'North Indian',  region: 'india',   city: 'New Delhi',   rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800' } });
  const r2  = await prisma.restaurant.create({ data: { name: 'Spice Terrace',     description: 'Contemporary fusion cuisine blending Indian and global flavors',    cuisine: 'Fusion',        region: 'india',   city: 'Bengaluru',   rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800' } });
  const r3  = await prisma.restaurant.create({ data: { name: 'Masala Library',    description: 'Avant-garde molecular Indian cuisine experience',                   cuisine: 'Modern Indian', region: 'india',   city: 'Mumbai',      rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' } });
  const r4  = await prisma.restaurant.create({ data: { name: 'The Saffron Route', description: 'Authentic North Indian fine dining experience',                     cuisine: 'North Indian',  region: 'india',   city: 'Mumbai',      rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800' } });
  const r5  = await prisma.restaurant.create({ data: { name: 'Nizam Table',       description: 'Hyderabadi royal cuisine with heritage recipes',                    cuisine: 'Hyderabadi',    region: 'india',   city: 'Hyderabad',   rating: 4.6, imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' } });
  const r6  = await prisma.restaurant.create({ data: { name: 'Mumbai Bistro',     description: 'Quick bites and Mumbai street food reimagined',                     cuisine: 'Street Food',   region: 'india',   city: 'Mumbai',      rating: 4.3, imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800' } });
  const r7  = await prisma.restaurant.create({ data: { name: 'The Brooklyn Grill',description: 'Premium USDA beef burgers and craft cocktails',                     cuisine: 'American BBQ',  region: 'america', city: 'New York',    rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800' } });
  const r8  = await prisma.restaurant.create({ data: { name: 'Pacific Fusion',    description: 'West Coast inspired California fresh cuisine',                      cuisine: 'California',    region: 'america', city: 'Los Angeles', rating: 4.6, imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' } });
  const r9  = await prisma.restaurant.create({ data: { name: 'Texas Smokehouse',  description: 'Authentic slow-smoked Texas BBQ and ribs',                          cuisine: 'BBQ',           region: 'america', city: 'Houston',     rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800' } });
  const r10 = await prisma.restaurant.create({ data: { name: 'Manhattan Bites',   description: 'Upscale New York deli and cafe fare',                               cuisine: 'Deli',          region: 'america', city: 'New York',    rating: 4.5, imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800' } });

  // ── Menu Items (with imageUrl for every dish) ────────────────────────────
  await prisma.menuItem.createMany({ data: [

    // Bukhara Grill (r1) — North Indian, Delhi
    { restaurantId: r1.id, name: 'Butter Chicken Deluxe',  description: 'Tender chicken in rich tomato-cream sauce',            price: 850,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
    { restaurantId: r1.id, name: 'Paneer Tikka Platter',   description: 'Marinated cottage cheese with mint chutney',           price: 620,  category: 'Starter',     isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400' },
    { restaurantId: r1.id, name: 'Dal Makhani Bowl',       description: 'Slow-cooked black lentils with buttery finish',        price: 480,  category: 'Main Course', isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400' },
    { restaurantId: r1.id, name: 'Tandoori Roti Basket',   description: 'Freshly baked tandoor breads, served warm',            price: 120,  category: 'Bread',       isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400' },

    // Spice Terrace (r2) — Fusion, Bengaluru
    { restaurantId: r2.id, name: 'Goan Fish Curry',        description: 'Tangy coconut-based curry with fresh kingfish',        price: 920,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400' },
    { restaurantId: r2.id, name: 'Palak Paneer',           description: 'Cottage cheese in creamed spinach sauce',              price: 540,  category: 'Main Course', isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
    { restaurantId: r2.id, name: 'Mysore Masala Dosa',     description: 'Crispy crepe with spicy chutney and potato filling',   price: 350,  category: 'Breakfast',   isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400' },

    // Masala Library (r3) — Modern Indian, Mumbai
    { restaurantId: r3.id, name: 'Hyderabadi Biryani',     description: 'Slow-cooked rice with aromatic spices and meat',       price: 780,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
    { restaurantId: r3.id, name: 'Gulab Jamun Pair',       description: 'Milk solid dumplings in warm saffron syrup',           price: 220,  category: 'Dessert',     isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1666487882768-3d5b02e733c7?w=400' },
    { restaurantId: r3.id, name: 'Chicken Tikka Masala',   description: 'Grilled chicken in spiced tomato gravy',               price: 760,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400' },

    // The Saffron Route (r4) — North Indian, Mumbai
    { restaurantId: r4.id, name: 'Crunchy Veg Samosa',     description: 'Crispy pastry with spiced potato filling',             price: 180,  category: 'Starter',     isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1601050690117-94f5f7974ef6?w=400' },
    { restaurantId: r4.id, name: 'Lamb Roganjosh',         description: 'Tender lamb in Kashmiri spice blend',                  price: 980,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400' },
    { restaurantId: r4.id, name: 'Mango Lassi',            description: 'Chilled yoghurt drink with Alphonso mango',            price: 150,  category: 'Beverages',   isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400' },

    // Nizam Table (r5) — Hyderabadi, Hyderabad
    { restaurantId: r5.id, name: 'Haleem',                 description: 'Slow-cooked wheat and mutton stew',                    price: 650,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1564671165093-20688ff1fffa?w=400' },
    { restaurantId: r5.id, name: 'Double Ka Meetha',       description: 'Traditional Hyderabadi bread pudding',                 price: 280,  category: 'Dessert',     isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400' },
    { restaurantId: r5.id, name: 'Mirchi Ka Salan',        description: 'Green chillies in rich peanut and sesame gravy',       price: 320,  category: 'Main Course', isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },

    // Mumbai Bistro (r6) — Street Food, Mumbai
    { restaurantId: r6.id, name: 'Masala Chai',            description: 'Spiced Indian tea with ginger and cardamom',           price: 80,   category: 'Beverages',   isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=400' },
    { restaurantId: r6.id, name: 'Vada Pav',               description: 'Mumbai street food with spiced potato fritter',        price: 120,  category: 'Snacks',      isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    { restaurantId: r6.id, name: 'Pav Bhaji',              description: 'Spiced mashed vegetables with buttered bread rolls',   price: 200,  category: 'Snacks',      isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400' },

    // The Brooklyn Grill (r7) — American BBQ, New York
    { restaurantId: r7.id, name: 'The Brooklyn Burger',    description: 'USDA Prime beef with aged cheddar and truffle aioli',  price: 22,   category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
    { restaurantId: r7.id, name: 'BBQ Baby Back Ribs',     description: 'Slow-smoked fall-off-the-bone ribs with house sauce',  price: 38,   category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
    { restaurantId: r7.id, name: 'Truffle Mac & Cheese',   description: 'Creamy 4-cheese mac with black truffle shavings',      price: 18,   category: 'Sides',       isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400' },
    { restaurantId: r7.id, name: 'Craft Lemonade',         description: 'House-made lemonade with fresh mint and basil',        price: 7,    category: 'Beverages',   isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400' },

    // Pacific Fusion (r8) — California, Los Angeles
    { restaurantId: r8.id, name: 'Avocado Toast',          description: 'Sourdough with smashed avo, poached eggs, microgreens', price: 16,  category: 'Breakfast',   isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=400' },
    { restaurantId: r8.id, name: 'Grilled Salmon Bowl',    description: 'Pacific salmon over quinoa with seasonal vegetables',   price: 28,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
    { restaurantId: r8.id, name: 'California Garden Wrap', description: 'Hummus, roasted veggies, feta in whole wheat wrap',     price: 14,  category: 'Lunch',       isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400' },
    { restaurantId: r8.id, name: 'Acai Berry Bowl',        description: 'Frozen acai with granola, banana, and honey drizzle',   price: 13,  category: 'Breakfast',   isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400' },

    // Texas Smokehouse (r9) — BBQ, Houston
    { restaurantId: r9.id, name: 'Texas Brisket Plate',    description: '12-hour smoked beef brisket with two sides',            price: 24,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400' },
    { restaurantId: r9.id, name: 'Loaded Baked Potato',    description: 'Giant potato with sour cream, bacon and chives',        price: 12,  category: 'Sides',       isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400' },
    { restaurantId: r9.id, name: 'Smoked Sausage Links',   description: 'Homemade jalapeño cheddar sausages, grilled',           price: 16,  category: 'Main Course', isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400' },
    { restaurantId: r9.id, name: 'Southern Coleslaw',      description: 'Creamy house-made coleslaw with apple cider dressing',  price: 6,   category: 'Sides',       isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },

    // Manhattan Bites (r10) — Deli, New York
    { restaurantId: r10.id, name: 'NY Pastrami Sandwich',  description: 'Hand-carved pastrami on rye with stone-ground mustard', price: 18,  category: 'Sandwich',    isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400' },
    { restaurantId: r10.id, name: 'Classic Cheesecake',    description: 'New York style with strawberry coulis',                 price: 10,  category: 'Dessert',     isVegetarian: true,  imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400' },
    { restaurantId: r10.id, name: 'Chicken Caesar Salad',  description: 'Romaine, parmesan, croutons with house Caesar dressing',price: 15,  category: 'Salads',      isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400' },
    { restaurantId: r10.id, name: 'Manhattan Clam Chowder',description: 'Tomato-based clam chowder with oyster crackers',        price: 12,  category: 'Soups',       isVegetarian: false, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' },
  ]});

  // ── Payment Methods ──────────────────────────────────────────────────────
  await prisma.paymentMethod.createMany({ data: [
    { label: 'Global Corporate Visa',    type: 'card', lastFour: '8842', cardholderName: 'NICHOLAS J. FURY', expiry: '12/26', region: 'global',  isPrimary: true  },
    { label: 'India Operations Account', type: 'bank', region: 'india',  isPrimary: false },
    { label: 'America Billing Visa',     type: 'card', lastFour: '4521', cardholderName: 'SHIELD AMERICA',   expiry: '09/25', region: 'america', isPrimary: false },
  ]});

  console.log('✅ Database seeded successfully!');
  console.log('\n🧑‍💼 Test Credentials:');
  console.log('  Admin:   nick@shield.com     / admin123   (Global)');
  console.log('  Manager: marvel@shield.com   / manager123 (India)');
  console.log('  Manager: america@shield.com  / manager123 (America)');
  console.log('  Member:  thanos@shield.com   / member123  (India)');
  console.log('  Member:  travis@shield.com   / member123  (America)');
}

seed()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());