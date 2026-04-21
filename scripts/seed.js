// scripts/seed.js — uses Prisma client directly
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  const USER_IDS = {
    admin: 1,
    managerIndia: 2,
    managerAmerica: 3,
    memberIndiaA: 4,
    memberIndiaB: 5,
    memberAmerica: 6,
  };

  const PAYMENT_METHOD_IDS = {
    globalCard: 1,
    indiaBank: 2,
    americaCard: 3,
  };

  // Clear in dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p) => bcrypt.hashSync(p, 10);

  // Users
  await prisma.user.createMany({ data: [
    { id: USER_IDS.admin,          name: 'Nick Fury',        email: 'nick@shield.com',    password: hash('admin123'),   role: 'admin',   region: 'global'  },
    { id: USER_IDS.managerIndia,   name: 'Captain Marvel',   email: 'marvel@shield.com',  password: hash('manager123'), role: 'manager', region: 'india'   },
    { id: USER_IDS.managerAmerica, name: 'Captain America',  email: 'america@shield.com', password: hash('manager123'), role: 'manager', region: 'america' },
    { id: USER_IDS.memberIndiaA,   name: 'Thanos',           email: 'thanos@shield.com',  password: hash('member123'),  role: 'member',  region: 'india'   },
    { id: USER_IDS.memberIndiaB,   name: 'Thor',             email: 'thor@shield.com',    password: hash('member123'),  role: 'member',  region: 'india'   },
    { id: USER_IDS.memberAmerica,  name: 'Travis',           email: 'travis@shield.com',  password: hash('member123'),  role: 'member',  region: 'america' },
  ]});

  // Restaurants — India
  const r1 = await prisma.restaurant.create({ data: { name: 'Bukhara Grill',    description: 'Award-winning North Indian fine dining with tandoor specialties',   cuisine: 'North Indian',  region: 'india',   city: 'New Delhi',  rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800' } });
  const r2 = await prisma.restaurant.create({ data: { name: 'Spice Terrace',    description: 'Contemporary fusion cuisine blending Indian and global flavors',    cuisine: 'Fusion',        region: 'india',   city: 'Bengaluru',  rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800' } });
  const r3 = await prisma.restaurant.create({ data: { name: 'Masala Library',   description: 'Avant-garde molecular Indian cuisine experience',                   cuisine: 'Modern Indian', region: 'india',   city: 'Mumbai',     rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' } });
  const r4 = await prisma.restaurant.create({ data: { name: 'The Saffron Route',description: 'Authentic North Indian fine dining experience',                    cuisine: 'North Indian',  region: 'india',   city: 'Mumbai',     rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800' } });
  const r5 = await prisma.restaurant.create({ data: { name: 'Nizam Table',      description: 'Hyderabadi royal cuisine with heritage recipes',                   cuisine: 'Hyderabadi',    region: 'india',   city: 'Hyderabad',  rating: 4.6, imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' } });
  const r6 = await prisma.restaurant.create({ data: { name: 'Mumbai Bistro',    description: 'Quick bites and Mumbai street food reimagined',                    cuisine: 'Street Food',   region: 'india',   city: 'Mumbai',     rating: 4.3, imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800' } });
  // Restaurants — America
  const r7 = await prisma.restaurant.create({ data: { name: 'The Brooklyn Grill',description: 'Premium USDA beef burgers and craft cocktails',                   cuisine: 'American BBQ',  region: 'america', city: 'New York',   rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800' } });
  const r8 = await prisma.restaurant.create({ data: { name: 'Pacific Fusion',   description: 'West Coast inspired California fresh cuisine',                    cuisine: 'California',    region: 'america', city: 'Los Angeles',rating: 4.6, imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' } });
  const r9 = await prisma.restaurant.create({ data: { name: 'Texas Smokehouse', description: 'Authentic slow-smoked Texas BBQ and ribs',                         cuisine: 'BBQ',           region: 'america', city: 'Houston',    rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800' } });
  const r10= await prisma.restaurant.create({ data: { name: 'Manhattan Bites',  description: 'Upscale New York deli and cafe fare',                             cuisine: 'Deli',          region: 'america', city: 'New York',   rating: 4.5, imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800' } });

  // Menu items
  await prisma.menuItem.createMany({ data: [
    { restaurantId: r1.id, name: 'Butter Chicken Deluxe',  description: 'Tender chicken in rich tomato-cream sauce',           price: 850,  category: 'Main Course', isVegetarian: false },
    { restaurantId: r1.id, name: 'Paneer Tikka Platter',   description: 'Marinated cottage cheese with mint chutney',          price: 620,  category: 'Starter',     isVegetarian: true  },
    { restaurantId: r1.id, name: 'Dal Makhani Bowl',        description: 'Slow-cooked black lentils with buttery finish',       price: 480,  category: 'Main Course', isVegetarian: true  },
    { restaurantId: r1.id, name: 'Tandoori Roti Basket',   description: 'Freshly baked tandoor breads',                        price: 120,  category: 'Bread',       isVegetarian: true  },
    { restaurantId: r2.id, name: 'Goan Fish Curry',         description: 'Tangy coconut-based curry with fresh kingfish',       price: 920,  category: 'Main Course', isVegetarian: false },
    { restaurantId: r2.id, name: 'Palak Paneer',            description: 'Cottage cheese in creamed spinach sauce',             price: 540,  category: 'Main Course', isVegetarian: true  },
    { restaurantId: r2.id, name: 'Mysore Masala Dosa',      description: 'Crispy crepe with spicy chutney and potato filling',  price: 350,  category: 'Breakfast',   isVegetarian: true  },
    { restaurantId: r3.id, name: 'Hyderabadi Biryani',      description: 'Slow-cooked rice with aromatic spices',               price: 780,  category: 'Main Course', isVegetarian: false },
    { restaurantId: r3.id, name: 'Gulab Jamun Pair',        description: 'Milk solid dumplings in saffron syrup',               price: 220,  category: 'Dessert',     isVegetarian: true  },
    { restaurantId: r3.id, name: 'Chicken Tikka Masala',    description: 'Grilled chicken in spiced tomato gravy',              price: 760,  category: 'Main Course', isVegetarian: false },
    { restaurantId: r4.id, name: 'Crunchy Veg Samosa',      description: 'Crispy pastry with spiced potato filling',            price: 180,  category: 'Starter',     isVegetarian: true  },
    { restaurantId: r4.id, name: 'Lamb Roganjosh',           description: 'Tender lamb in Kashmiri spice blend',                 price: 980,  category: 'Main Course', isVegetarian: false },
    { restaurantId: r5.id, name: 'Haleem',                  description: 'Slow-cooked wheat and mutton stew',                   price: 650,  category: 'Main Course', isVegetarian: false },
    { restaurantId: r5.id, name: 'Double Ka Meetha',        description: 'Traditional Hyderabadi bread pudding',                price: 280,  category: 'Dessert',     isVegetarian: true  },
    { restaurantId: r6.id, name: 'Masala Chai',             description: 'Spiced Indian tea with ginger and cardamom',          price: 80,   category: 'Beverages',   isVegetarian: true  },
    { restaurantId: r6.id, name: 'Vada Pav',                description: 'Mumbai street food with spiced potato fritter',       price: 120,  category: 'Snacks',      isVegetarian: true  },
    { restaurantId: r7.id, name: 'The Brooklyn Burger',     description: 'USDA Prime beef with aged cheddar and truffle aioli', price: 22,   category: 'Main Course', isVegetarian: false },
    { restaurantId: r7.id, name: 'BBQ Baby Back Ribs',      description: 'Slow-smoked fall-off-the-bone ribs',                  price: 38,   category: 'Main Course', isVegetarian: false },
    { restaurantId: r7.id, name: 'Truffle Mac & Cheese',    description: 'Creamy 4-cheese mac with black truffle',              price: 18,   category: 'Sides',       isVegetarian: true  },
    { restaurantId: r8.id, name: 'Avocado Toast',           description: 'Sourdough with smashed avo and poached eggs',         price: 16,   category: 'Breakfast',   isVegetarian: true  },
    { restaurantId: r8.id, name: 'Grilled Salmon Bowl',     description: 'Pacific salmon over quinoa with seasonal veggies',    price: 28,   category: 'Main Course', isVegetarian: false },
    { restaurantId: r8.id, name: 'California Garden Wrap',  description: 'Hummus, roasted veggies, feta in whole wheat wrap',   price: 14,   category: 'Lunch',       isVegetarian: true  },
    { restaurantId: r9.id, name: 'Texas Brisket Plate',     description: '12-hour smoked beef brisket with two sides',          price: 24,   category: 'Main Course', isVegetarian: false },
    { restaurantId: r9.id, name: 'Loaded Baked Potato',     description: 'Giant potato with all the fixings',                   price: 12,   category: 'Sides',       isVegetarian: true  },
    { restaurantId: r10.id,name: 'NY Pastrami Sandwich',    description: 'Hand-carved pastrami on rye with mustard',            price: 18,   category: 'Sandwich',    isVegetarian: false },
    { restaurantId: r10.id,name: 'Classic Cheesecake',      description: 'New York style with strawberry coulis',               price: 10,   category: 'Dessert',     isVegetarian: true  },
  ]});

  // Payment methods
  await prisma.paymentMethod.createMany({ data: [
    { id: PAYMENT_METHOD_IDS.globalCard,  label: 'Global Corporate Visa',    type: 'card', lastFour: '8842', cardholderName: 'NICHOLAS J. FURY', expiry: '12/26', region: 'global',  isPrimary: true  },
    { id: PAYMENT_METHOD_IDS.indiaBank,   label: 'India Operations Account', type: 'bank', region: 'india',  isPrimary: false },
    { id: PAYMENT_METHOD_IDS.americaCard, label: 'America Billing Visa',     type: 'card', lastFour: '4521', cardholderName: 'SHIELD AMERICA',   expiry: '09/25', region: 'america', isPrimary: false },
  ]});

  const [bukharaButterChicken, bukharaPaneerTikka] = await prisma.menuItem.findMany({
    where: { restaurantId: r1.id },
    orderBy: { id: 'asc' },
    take: 2,
  });

  const brooklynBurger = await prisma.menuItem.findFirst({
    where: { restaurantId: r7.id, name: 'The Brooklyn Burger' },
  });

  if (!bukharaButterChicken || !bukharaPaneerTikka || !brooklynBurger) {
    throw new Error('Expected seed menu items were not created.');
  }

  // Sample draft order that uses shared collaborator fields from updated schema.
  await prisma.order.create({
    data: {
      userId: USER_IDS.memberIndiaA,
      sharedWithUserId: USER_IDS.memberIndiaB,
      restaurantId: r1.id,
      region: r1.region,
      status: 'draft',
      totalAmount: 1543.5,
      items: {
        create: [
          {
            menuItemId: bukharaButterChicken.id,
            quantity: 1,
            unitPrice: bukharaButterChicken.price,
            subtotal: bukharaButterChicken.price,
          },
          {
            menuItemId: bukharaPaneerTikka.id,
            quantity: 1,
            unitPrice: bukharaPaneerTikka.price,
            subtotal: bukharaPaneerTikka.price,
          },
        ],
      },
    },
  });

  // Sample placed order with payment method and placed timestamp.
  await prisma.order.create({
    data: {
      userId: USER_IDS.memberAmerica,
      restaurantId: r7.id,
      paymentMethodId: PAYMENT_METHOD_IDS.americaCard,
      region: r7.region,
      status: 'placed',
      placedAt: new Date(),
      totalAmount: 46.2,
      items: {
        create: [
          {
            menuItemId: brooklynBurger.id,
            quantity: 2,
            unitPrice: brooklynBurger.price,
            subtotal: 44,
          },
        ],
      },
    },
  });

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
