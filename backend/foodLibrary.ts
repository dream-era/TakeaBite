/**
 * ============================================================
 * SERVEFLOW — INDIAN FOOD LIBRARY
 * File: src/data/foodLibrary.ts
 *
 * A comprehensive library of Indian restaurant food items
 * covering all common categories found in Tamil Nadu /
 * South Indian restaurants, juice shops, cafes, and
 * fast food stalls.
 *
 * HOW IT IS USED:
 *  1. Owner types in the search box on Menu Management page
 *  2. Results filter from this library in real time
 *  3. Owner clicks "Add to menu" on any item
 *  4. OR owner types a comma-separated list like:
 *     "Dosa, Idli, Vada, Orange juice, Coffee"
 *     and the bulk parser creates all items at once
 *
 * STRUCTURE PER ITEM:
 *  - name: display name
 *  - category: maps to menu_items.category in Supabase
 *  - station: 'food' | 'juice' | 'both' — maps to kitchen routing
 *  - defaultPrice: suggested price in ₹ (owner can change)
 *  - isVeg: true/false
 *  - description: short default description
 *  - tags: for search — alternate names, ingredients, keywords
 * ============================================================
 */

export interface FoodLibraryItem {
  id: string
  name: string
  category: string
  station: 'food' | 'juice' | 'both'
  defaultPrice: number
  isVeg: boolean
  description: string
  tags: string[]
}

export const FOOD_LIBRARY: FoodLibraryItem[] = [

  // ──────────────────────────────────────────
  // SOUTH INDIAN BREAKFAST
  // ──────────────────────────────────────────
  {
    id: 'si-001', name: 'Plain Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Crispy thin rice and lentil crepe served with chutney and sambar',
    tags: ['dosa', 'south indian', 'breakfast', 'crepe', 'rice']
  },
  {
    id: 'si-002', name: 'Masala Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 60, isVeg: true,
    description: 'Crispy dosa filled with spiced potato masala',
    tags: ['dosa', 'masala', 'potato', 'south indian', 'breakfast']
  },
  {
    id: 'si-003', name: 'Onion Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 50, isVeg: true,
    description: 'Dosa topped with finely chopped onions',
    tags: ['dosa', 'onion', 'south indian']
  },
  {
    id: 'si-004', name: 'Ghee Roast Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 70, isVeg: true,
    description: 'Crispy dosa roasted in ghee until golden',
    tags: ['dosa', 'ghee', 'roast', 'south indian']
  },
  {
    id: 'si-005', name: 'Egg Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 65, isVeg: false,
    description: 'Dosa with egg cooked on top',
    tags: ['dosa', 'egg', 'south indian']
  },
  {
    id: 'si-006', name: 'Rava Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 55, isVeg: true,
    description: 'Crispy semolina and rice flour dosa',
    tags: ['dosa', 'rava', 'semolina', 'south indian']
  },
  {
    id: 'si-007', name: 'Set Dosa', category: 'South Indian',
    station: 'food', defaultPrice: 50, isVeg: true,
    description: 'Soft spongy small dosas served in a set of 3',
    tags: ['dosa', 'set', 'soft', 'south indian']
  },
  {
    id: 'si-008', name: 'Paper Roast', category: 'South Indian',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Extra thin and crispy dosa',
    tags: ['dosa', 'paper', 'crispy', 'south indian']
  },
  {
    id: 'si-009', name: 'Idli', category: 'South Indian',
    station: 'food', defaultPrice: 30, isVeg: true,
    description: 'Steamed rice cakes served with chutney and sambar',
    tags: ['idli', 'steam', 'rice', 'south indian', 'breakfast']
  },
  {
    id: 'si-010', name: 'Mini Idli', category: 'South Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Small idlis served in sambar',
    tags: ['idli', 'mini', 'sambar', 'south indian']
  },
  {
    id: 'si-011', name: 'Vada', category: 'South Indian',
    station: 'food', defaultPrice: 30, isVeg: true,
    description: 'Crispy lentil donut served with chutney',
    tags: ['vada', 'lentil', 'donut', 'crispy', 'south indian']
  },
  {
    id: 'si-012', name: 'Sambar Vada', category: 'South Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Vada soaked in hot sambar',
    tags: ['vada', 'sambar', 'south indian']
  },
  {
    id: 'si-013', name: 'Curd Vada', category: 'South Indian',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Soft vada soaked in seasoned curd',
    tags: ['vada', 'curd', 'yogurt', 'south indian']
  },
  {
    id: 'si-014', name: 'Pongal', category: 'South Indian',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Soft rice and moong dal khichdi with ghee and pepper',
    tags: ['pongal', 'rice', 'dal', 'south indian', 'breakfast']
  },
  {
    id: 'si-015', name: 'Upma', category: 'South Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Semolina porridge with vegetables and mustard',
    tags: ['upma', 'semolina', 'rava', 'south indian', 'breakfast']
  },
  {
    id: 'si-016', name: 'Kichadi', category: 'South Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Semolina upma with tomato and onion',
    tags: ['kichadi', 'semolina', 'south indian']
  },
  {
    id: 'si-017', name: 'Poori', category: 'South Indian',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Deep fried wheat bread served with potato masala',
    tags: ['poori', 'puri', 'fried', 'wheat', 'south indian']
  },
  {
    id: 'si-018', name: 'Chapati', category: 'South Indian',
    station: 'food', defaultPrice: 15, isVeg: true,
    description: 'Soft wheat flatbread',
    tags: ['chapati', 'roti', 'wheat', 'flatbread']
  },
  {
    id: 'si-019', name: 'Parotta', category: 'South Indian',
    station: 'food', defaultPrice: 20, isVeg: true,
    description: 'Layered flaky wheat bread',
    tags: ['parotta', 'paratha', 'layered', 'wheat', 'south indian']
  },
  {
    id: 'si-020', name: 'Egg Parotta', category: 'South Indian',
    station: 'food', defaultPrice: 55, isVeg: false,
    description: 'Flaky parotta with scrambled egg',
    tags: ['parotta', 'egg', 'south indian']
  },
  {
    id: 'si-021', name: 'Kothu Parotta', category: 'South Indian',
    station: 'food', defaultPrice: 80, isVeg: false,
    description: 'Shredded parotta stir-fried with egg, onion and masala',
    tags: ['kothu', 'parotta', 'egg', 'south indian']
  },
  {
    id: 'si-022', name: 'Veg Kothu Parotta', category: 'South Indian',
    station: 'food', defaultPrice: 65, isVeg: true,
    description: 'Shredded parotta stir-fried with vegetables and masala',
    tags: ['kothu', 'parotta', 'veg', 'south indian']
  },
  {
    id: 'si-023', name: 'Idiyappam', category: 'South Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'String hoppers made from rice flour',
    tags: ['idiyappam', 'string hopper', 'rice', 'south indian']
  },
  {
    id: 'si-024', name: 'Appam', category: 'South Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Soft rice bowl-shaped pancake with crispy edges',
    tags: ['appam', 'rice', 'south indian', 'breakfast']
  },
  {
    id: 'si-025', name: 'Pesarattu', category: 'South Indian',
    station: 'food', defaultPrice: 50, isVeg: true,
    description: 'Green moong dal dosa with ginger',
    tags: ['pesarattu', 'moong', 'green', 'dosa', 'south indian']
  },

  // ──────────────────────────────────────────
  // RICE DISHES
  // ──────────────────────────────────────────
  {
    id: 'rice-001', name: 'Sambar Rice', category: 'Rice',
    station: 'food', defaultPrice: 60, isVeg: true,
    description: 'Rice mixed with tangy lentil sambar',
    tags: ['rice', 'sambar', 'south indian', 'meals']
  },
  {
    id: 'rice-002', name: 'Curd Rice', category: 'Rice',
    station: 'food', defaultPrice: 55, isVeg: true,
    description: 'Cooling rice mixed with curd and tempering',
    tags: ['rice', 'curd', 'yogurt', 'south indian', 'meals']
  },
  {
    id: 'rice-003', name: 'Lemon Rice', category: 'Rice',
    station: 'food', defaultPrice: 55, isVeg: true,
    description: 'Rice with lemon, peanuts, and tempering',
    tags: ['rice', 'lemon', 'south indian']
  },
  {
    id: 'rice-004', name: 'Tomato Rice', category: 'Rice',
    station: 'food', defaultPrice: 55, isVeg: true,
    description: 'Rice cooked with tangy tomato masala',
    tags: ['rice', 'tomato', 'south indian']
  },
  {
    id: 'rice-005', name: 'Coconut Rice', category: 'Rice',
    station: 'food', defaultPrice: 55, isVeg: true,
    description: 'Rice mixed with fresh coconut and tempering',
    tags: ['rice', 'coconut', 'south indian']
  },
  {
    id: 'rice-006', name: 'Tamarind Rice', category: 'Rice',
    station: 'food', defaultPrice: 55, isVeg: true,
    description: 'Tangy rice with tamarind paste and peanuts',
    tags: ['rice', 'tamarind', 'puliyodarai', 'south indian']
  },
  {
    id: 'rice-007', name: 'Veg Biryani', category: 'Rice',
    station: 'food', defaultPrice: 90, isVeg: true,
    description: 'Fragrant basmati rice cooked with vegetables and spices',
    tags: ['biryani', 'rice', 'veg', 'fragrant']
  },
  {
    id: 'rice-008', name: 'Chicken Biryani', category: 'Rice',
    station: 'food', defaultPrice: 130, isVeg: false,
    description: 'Fragrant basmati rice cooked with tender chicken',
    tags: ['biryani', 'chicken', 'rice', 'fragrant']
  },
  {
    id: 'rice-009', name: 'Egg Biryani', category: 'Rice',
    station: 'food', defaultPrice: 100, isVeg: false,
    description: 'Fragrant rice with boiled eggs',
    tags: ['biryani', 'egg', 'rice']
  },
  {
    id: 'rice-010', name: 'Mutton Biryani', category: 'Rice',
    station: 'food', defaultPrice: 160, isVeg: false,
    description: 'Slow-cooked fragrant rice with tender mutton',
    tags: ['biryani', 'mutton', 'rice', 'lamb']
  },
  {
    id: 'rice-011', name: 'Fried Rice', category: 'Rice',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Wok-tossed rice with vegetables',
    tags: ['fried rice', 'veg', 'chinese']
  },
  {
    id: 'rice-012', name: 'Egg Fried Rice', category: 'Rice',
    station: 'food', defaultPrice: 90, isVeg: false,
    description: 'Wok-tossed rice with scrambled egg',
    tags: ['fried rice', 'egg', 'chinese']
  },
  {
    id: 'rice-013', name: 'Chicken Fried Rice', category: 'Rice',
    station: 'food', defaultPrice: 110, isVeg: false,
    description: 'Wok-tossed rice with chicken pieces',
    tags: ['fried rice', 'chicken', 'chinese']
  },

  // ──────────────────────────────────────────
  // NOODLES AND CHINESE
  // ──────────────────────────────────────────
  {
    id: 'nood-001', name: 'Veg Noodles', category: 'Noodles',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Stir-fried noodles with mixed vegetables',
    tags: ['noodles', 'veg', 'chinese', 'chowmein']
  },
  {
    id: 'nood-002', name: 'Egg Noodles', category: 'Noodles',
    station: 'food', defaultPrice: 90, isVeg: false,
    description: 'Stir-fried noodles with egg',
    tags: ['noodles', 'egg', 'chinese', 'chowmein']
  },
  {
    id: 'nood-003', name: 'Chicken Noodles', category: 'Noodles',
    station: 'food', defaultPrice: 110, isVeg: false,
    description: 'Stir-fried noodles with chicken',
    tags: ['noodles', 'chicken', 'chinese', 'chowmein']
  },
  {
    id: 'nood-004', name: 'Hakka Noodles', category: 'Noodles',
    station: 'food', defaultPrice: 90, isVeg: true,
    description: 'Chinese-style tossed noodles with soy sauce',
    tags: ['noodles', 'hakka', 'chinese']
  },
  {
    id: 'nood-005', name: 'Maggi', category: 'Snacks',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Classic Maggi instant noodles with masala',
    tags: ['maggi', 'noodles', 'instant', 'snack']
  },
  {
    id: 'nood-006', name: 'Masala Maggi', category: 'Snacks',
    station: 'food', defaultPrice: 50, isVeg: true,
    description: 'Maggi with extra spices, onion, and tomato',
    tags: ['maggi', 'masala', 'noodles', 'spicy', 'snack']
  },
  {
    id: 'nood-007', name: 'Egg Maggi', category: 'Snacks',
    station: 'food', defaultPrice: 55, isVeg: false,
    description: 'Maggi noodles with egg',
    tags: ['maggi', 'egg', 'noodles', 'snack']
  },

  // ──────────────────────────────────────────
  // SNACKS AND STREET FOOD
  // ──────────────────────────────────────────
  {
    id: 'snack-001', name: 'Veg Burger', category: 'Snacks',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Soft bun with veggie patty, lettuce, and sauces',
    tags: ['burger', 'veg', 'bun', 'snack', 'fast food']
  },
  {
    id: 'snack-002', name: 'Chicken Burger', category: 'Snacks',
    station: 'food', defaultPrice: 110, isVeg: false,
    description: 'Crispy chicken patty in a soft bun',
    tags: ['burger', 'chicken', 'bun', 'snack', 'fast food']
  },
  {
    id: 'snack-003', name: 'Veg Sandwich', category: 'Snacks',
    station: 'food', defaultPrice: 50, isVeg: true,
    description: 'Fresh vegetables in toasted bread with chutney',
    tags: ['sandwich', 'veg', 'toast', 'bread', 'snack']
  },
  {
    id: 'snack-004', name: 'Grilled Sandwich', category: 'Snacks',
    station: 'food', defaultPrice: 65, isVeg: true,
    description: 'Cheese and vegetable sandwich grilled to perfection',
    tags: ['sandwich', 'grilled', 'cheese', 'snack']
  },
  {
    id: 'snack-005', name: 'Egg Sandwich', category: 'Snacks',
    station: 'food', defaultPrice: 60, isVeg: false,
    description: 'Boiled egg and vegetable sandwich',
    tags: ['sandwich', 'egg', 'snack']
  },
  {
    id: 'snack-006', name: 'French Fries', category: 'Snacks',
    station: 'food', defaultPrice: 60, isVeg: true,
    description: 'Golden crispy potato fries with seasoning',
    tags: ['fries', 'potato', 'crispy', 'snack', 'fast food']
  },
  {
    id: 'snack-007', name: 'Masala Fries', category: 'Snacks',
    station: 'food', defaultPrice: 70, isVeg: true,
    description: 'Crispy fries tossed in Indian spice mix',
    tags: ['fries', 'masala', 'potato', 'spicy', 'snack']
  },
  {
    id: 'snack-008', name: 'Samosa', category: 'Snacks',
    station: 'food', defaultPrice: 20, isVeg: true,
    description: 'Crispy pastry filled with spiced potato',
    tags: ['samosa', 'fried', 'potato', 'snack', 'street food']
  },
  {
    id: 'snack-009', name: 'Puff', category: 'Snacks',
    station: 'food', defaultPrice: 25, isVeg: true,
    description: 'Flaky pastry puff with vegetable filling',
    tags: ['puff', 'pastry', 'bakery', 'snack']
  },
  {
    id: 'snack-010', name: 'Egg Puff', category: 'Snacks',
    station: 'food', defaultPrice: 30, isVeg: false,
    description: 'Flaky pastry puff with boiled egg',
    tags: ['puff', 'egg', 'pastry', 'bakery', 'snack']
  },
  {
    id: 'snack-011', name: 'Chicken Puff', category: 'Snacks',
    station: 'food', defaultPrice: 40, isVeg: false,
    description: 'Flaky pastry puff with spiced chicken',
    tags: ['puff', 'chicken', 'pastry', 'bakery', 'snack']
  },
  {
    id: 'snack-012', name: 'Veg Roll', category: 'Snacks',
    station: 'food', defaultPrice: 60, isVeg: true,
    description: 'Spiced vegetables wrapped in a thin roti',
    tags: ['roll', 'wrap', 'veg', 'snack']
  },
  {
    id: 'snack-013', name: 'Paneer Roll', category: 'Snacks',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Spiced paneer wrapped in a soft roti',
    tags: ['roll', 'paneer', 'wrap', 'snack']
  },
  {
    id: 'snack-014', name: 'Egg Roll', category: 'Snacks',
    station: 'food', defaultPrice: 70, isVeg: false,
    description: 'Egg and vegetables in a thin roti wrap',
    tags: ['roll', 'egg', 'wrap', 'snack']
  },
  {
    id: 'snack-015', name: 'Chicken Roll', category: 'Snacks',
    station: 'food', defaultPrice: 90, isVeg: false,
    description: 'Spiced chicken in a soft roti wrap',
    tags: ['roll', 'chicken', 'wrap', 'snack']
  },
  {
    id: 'snack-016', name: 'Pani Puri', category: 'Snacks',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Crispy hollow puris filled with tangy water',
    tags: ['pani puri', 'golgappa', 'street food', 'snack', 'chaat']
  },
  {
    id: 'snack-017', name: 'Bhel Puri', category: 'Snacks',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Puffed rice with chutneys, vegetables',
    tags: ['bhel', 'puri', 'street food', 'chaat', 'snack']
  },
  {
    id: 'snack-018', name: 'Sev Puri', category: 'Snacks',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Crispy puris topped with sev and chutneys',
    tags: ['sev puri', 'chaat', 'street food', 'snack']
  },
  {
    id: 'snack-019', name: 'Bread Omelette', category: 'Snacks',
    station: 'food', defaultPrice: 50, isVeg: false,
    description: 'Egg omelette served with buttered bread',
    tags: ['bread', 'omelette', 'egg', 'snack', 'breakfast']
  },
  {
    id: 'snack-020', name: 'Boiled Egg', category: 'Snacks',
    station: 'food', defaultPrice: 15, isVeg: false,
    description: 'Hard boiled egg with salt and pepper',
    tags: ['egg', 'boiled', 'snack']
  },
  {
    id: 'snack-021', name: 'Aloo Bajji', category: 'Snacks',
    station: 'food', defaultPrice: 30, isVeg: true,
    description: 'Crispy batter-fried potato slices',
    tags: ['bajji', 'bonda', 'potato', 'fried', 'snack', 'street food']
  },
  {
    id: 'snack-022', name: 'Onion Bajji', category: 'Snacks',
    station: 'food', defaultPrice: 30, isVeg: true,
    description: 'Crispy batter-fried onion rings',
    tags: ['bajji', 'onion', 'fried', 'snack', 'street food']
  },
  {
    id: 'snack-023', name: 'Mirchi Bajji', category: 'Snacks',
    station: 'food', defaultPrice: 30, isVeg: true,
    description: 'Large green chilli dipped in batter and fried',
    tags: ['bajji', 'chilli', 'mirchi', 'fried', 'snack']
  },
  {
    id: 'snack-024', name: 'Bread Bajji', category: 'Snacks',
    station: 'food', defaultPrice: 25, isVeg: true,
    description: 'Bread slices dipped in batter and fried',
    tags: ['bajji', 'bread', 'fried', 'snack']
  },

  // ──────────────────────────────────────────
  // PASTA AND WESTERN
  // ──────────────────────────────────────────
  {
    id: 'pasta-001', name: 'Veg Pasta', category: 'Pasta',
    station: 'food', defaultPrice: 90, isVeg: true,
    description: 'Penne pasta in tomato sauce with vegetables',
    tags: ['pasta', 'veg', 'penne', 'italian', 'western']
  },
  {
    id: 'pasta-002', name: 'Masala Pasta', category: 'Pasta',
    station: 'food', defaultPrice: 90, isVeg: true,
    description: 'Penne pasta in spicy Indian masala sauce',
    tags: ['pasta', 'masala', 'spicy', 'indian style']
  },
  {
    id: 'pasta-003', name: 'White Sauce Pasta', category: 'Pasta',
    station: 'food', defaultPrice: 100, isVeg: true,
    description: 'Creamy béchamel sauce pasta',
    tags: ['pasta', 'white sauce', 'cream', 'cheese', 'western']
  },
  {
    id: 'pasta-004', name: 'Red Sauce Pasta', category: 'Pasta',
    station: 'food', defaultPrice: 95, isVeg: true,
    description: 'Pasta in tangy tomato red sauce',
    tags: ['pasta', 'red sauce', 'tomato', 'italian']
  },
  {
    id: 'pasta-005', name: 'Pizza', category: 'Snacks',
    station: 'food', defaultPrice: 120, isVeg: true,
    description: 'Thin crust pizza with cheese and toppings',
    tags: ['pizza', 'cheese', 'western', 'fast food']
  },

  // ──────────────────────────────────────────
  // NORTH INDIAN
  // ──────────────────────────────────────────
  {
    id: 'ni-001', name: 'Paneer Butter Masala', category: 'North Indian',
    station: 'food', defaultPrice: 130, isVeg: true,
    description: 'Paneer cubes in rich buttery tomato gravy',
    tags: ['paneer', 'butter', 'masala', 'gravy', 'north indian']
  },
  {
    id: 'ni-002', name: 'Dal Makhani', category: 'North Indian',
    station: 'food', defaultPrice: 100, isVeg: true,
    description: 'Slow-cooked black lentils in creamy butter sauce',
    tags: ['dal', 'makhani', 'lentil', 'north indian']
  },
  {
    id: 'ni-003', name: 'Dal Fry', category: 'North Indian',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Yellow lentils tempered with spices',
    tags: ['dal', 'fry', 'lentil', 'north indian']
  },
  {
    id: 'ni-004', name: 'Chicken Curry', category: 'North Indian',
    station: 'food', defaultPrice: 150, isVeg: false,
    description: 'Tender chicken in spiced onion-tomato gravy',
    tags: ['chicken', 'curry', 'gravy', 'north indian']
  },
  {
    id: 'ni-005', name: 'Butter Chicken', category: 'North Indian',
    station: 'food', defaultPrice: 160, isVeg: false,
    description: 'Creamy tomato-butter sauce with tender chicken',
    tags: ['butter chicken', 'murgh makhani', 'chicken', 'north indian']
  },
  {
    id: 'ni-006', name: 'Naan', category: 'North Indian',
    station: 'food', defaultPrice: 25, isVeg: true,
    description: 'Soft leavened bread baked in tandoor',
    tags: ['naan', 'bread', 'tandoor', 'north indian']
  },
  {
    id: 'ni-007', name: 'Butter Naan', category: 'North Indian',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Soft naan topped with butter',
    tags: ['naan', 'butter', 'bread', 'north indian']
  },
  {
    id: 'ni-008', name: 'Garlic Naan', category: 'North Indian',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Soft naan topped with garlic and butter',
    tags: ['naan', 'garlic', 'bread', 'north indian']
  },
  {
    id: 'ni-009', name: 'Tandoori Chicken', category: 'North Indian',
    station: 'food', defaultPrice: 180, isVeg: false,
    description: 'Marinated chicken roasted in a clay oven',
    tags: ['tandoori', 'chicken', 'grilled', 'north indian']
  },

  // ──────────────────────────────────────────
  // FRESH JUICES
  // ──────────────────────────────────────────
  {
    id: 'juice-001', name: 'Fresh Orange Juice', category: 'Juices',
    station: 'juice', defaultPrice: 60, isVeg: true,
    description: 'Cold-pressed juice from 4 fresh oranges',
    tags: ['juice', 'orange', 'fresh', 'vitamin c', 'citrus']
  },
  {
    id: 'juice-002', name: 'Watermelon Juice', category: 'Juices',
    station: 'juice', defaultPrice: 50, isVeg: true,
    description: 'Cool and sweet fresh watermelon juice',
    tags: ['juice', 'watermelon', 'summer', 'fresh', 'cooler']
  },
  {
    id: 'juice-003', name: 'Mango Juice', category: 'Juices',
    station: 'juice', defaultPrice: 70, isVeg: true,
    description: 'Fresh sweet mango pulp juice',
    tags: ['juice', 'mango', 'alphonso', 'fresh', 'tropical']
  },
  {
    id: 'juice-004', name: 'Pineapple Juice', category: 'Juices',
    station: 'juice', defaultPrice: 60, isVeg: true,
    description: 'Tangy fresh pineapple juice',
    tags: ['juice', 'pineapple', 'fresh', 'tropical', 'tangy']
  },
  {
    id: 'juice-005', name: 'Apple Juice', category: 'Juices',
    station: 'juice', defaultPrice: 70, isVeg: true,
    description: 'Fresh pressed apple juice',
    tags: ['juice', 'apple', 'fresh']
  },
  {
    id: 'juice-006', name: 'Pomegranate Juice', category: 'Juices',
    station: 'juice', defaultPrice: 80, isVeg: true,
    description: 'Rich ruby-red fresh pomegranate juice',
    tags: ['juice', 'pomegranate', 'anar', 'fresh', 'antioxidant']
  },
  {
    id: 'juice-007', name: 'Grape Juice', category: 'Juices',
    station: 'juice', defaultPrice: 65, isVeg: true,
    description: 'Fresh pressed grape juice',
    tags: ['juice', 'grape', 'fresh']
  },
  {
    id: 'juice-008', name: 'Mosambi Juice', category: 'Juices',
    station: 'juice', defaultPrice: 60, isVeg: true,
    description: 'Fresh sweet lime juice',
    tags: ['juice', 'mosambi', 'sweet lime', 'citrus', 'fresh']
  },
  {
    id: 'juice-009', name: 'Guava Juice', category: 'Juices',
    station: 'juice', defaultPrice: 55, isVeg: true,
    description: 'Fresh guava juice with a hint of salt',
    tags: ['juice', 'guava', 'peru', 'fresh']
  },
  {
    id: 'juice-010', name: 'Papaya Juice', category: 'Juices',
    station: 'juice', defaultPrice: 55, isVeg: true,
    description: 'Smooth fresh papaya juice',
    tags: ['juice', 'papaya', 'fresh']
  },
  {
    id: 'juice-011', name: 'Sugarcane Juice', category: 'Juices',
    station: 'juice', defaultPrice: 40, isVeg: true,
    description: 'Fresh sugarcane pressed with ginger and lemon',
    tags: ['juice', 'sugarcane', 'karumbu', 'fresh', 'street']
  },
  {
    id: 'juice-012', name: 'Coconut Water', category: 'Juices',
    station: 'juice', defaultPrice: 55, isVeg: true,
    description: 'Tender coconut water served chilled',
    tags: ['coconut', 'tender', 'water', 'refreshing', 'natural']
  },
  {
    id: 'juice-013', name: 'Mixed Fruit Juice', category: 'Juices',
    station: 'juice', defaultPrice: 70, isVeg: true,
    description: 'Blend of seasonal fresh fruits',
    tags: ['juice', 'mixed', 'fruit', 'blend', 'fresh']
  },

  // ──────────────────────────────────────────
  // SMOOTHIES AND MILKSHAKES
  // ──────────────────────────────────────────
  {
    id: 'shake-001', name: 'Mango Milkshake', category: 'Shakes',
    station: 'juice', defaultPrice: 80, isVeg: true,
    description: 'Thick and creamy mango milkshake',
    tags: ['milkshake', 'mango', 'shake', 'thick', 'creamy']
  },
  {
    id: 'shake-002', name: 'Banana Milkshake', category: 'Shakes',
    station: 'juice', defaultPrice: 70, isVeg: true,
    description: 'Creamy banana milkshake',
    tags: ['milkshake', 'banana', 'shake', 'creamy']
  },
  {
    id: 'shake-003', name: 'Chocolate Milkshake', category: 'Shakes',
    station: 'juice', defaultPrice: 90, isVeg: true,
    description: 'Rich creamy chocolate milkshake',
    tags: ['milkshake', 'chocolate', 'shake', 'creamy', 'sweet']
  },
  {
    id: 'shake-004', name: 'Strawberry Milkshake', category: 'Shakes',
    station: 'juice', defaultPrice: 85, isVeg: true,
    description: 'Fresh strawberry blended milkshake',
    tags: ['milkshake', 'strawberry', 'shake', 'pink']
  },
  {
    id: 'shake-005', name: 'Vanilla Milkshake', category: 'Shakes',
    station: 'juice', defaultPrice: 80, isVeg: true,
    description: 'Classic vanilla flavoured milkshake',
    tags: ['milkshake', 'vanilla', 'shake', 'classic']
  },
  {
    id: 'shake-006', name: 'Avocado Shake', category: 'Shakes',
    station: 'juice', defaultPrice: 100, isVeg: true,
    description: 'Creamy avocado blended with milk and honey',
    tags: ['shake', 'avocado', 'creamy', 'healthy']
  },
  {
    id: 'shake-007', name: 'Oreo Shake', category: 'Shakes',
    station: 'juice', defaultPrice: 100, isVeg: true,
    description: 'Creamy milkshake blended with Oreo cookies',
    tags: ['shake', 'oreo', 'cookie', 'creamy', 'sweet']
  },

  // ──────────────────────────────────────────
  // LASSI AND CURD DRINKS
  // ──────────────────────────────────────────
  {
    id: 'lassi-001', name: 'Sweet Lassi', category: 'Lassi',
    station: 'juice', defaultPrice: 50, isVeg: true,
    description: 'Chilled sweetened yogurt drink',
    tags: ['lassi', 'sweet', 'curd', 'yogurt', 'drink']
  },
  {
    id: 'lassi-002', name: 'Salted Lassi', category: 'Lassi',
    station: 'juice', defaultPrice: 45, isVeg: true,
    description: 'Chilled salted yogurt drink',
    tags: ['lassi', 'salted', 'curd', 'yogurt', 'drink']
  },
  {
    id: 'lassi-003', name: 'Mango Lassi', category: 'Lassi',
    station: 'juice', defaultPrice: 65, isVeg: true,
    description: 'Thick yogurt drink blended with mango',
    tags: ['lassi', 'mango', 'curd', 'yogurt', 'drink']
  },
  {
    id: 'lassi-004', name: 'Rose Lassi', category: 'Lassi',
    station: 'juice', defaultPrice: 60, isVeg: true,
    description: 'Chilled yogurt drink with rose flavour',
    tags: ['lassi', 'rose', 'curd', 'yogurt', 'drink']
  },
  {
    id: 'lassi-005', name: 'Chaas', category: 'Lassi',
    station: 'juice', defaultPrice: 35, isVeg: true,
    description: 'Thin spiced buttermilk with cumin and coriander',
    tags: ['chaas', 'buttermilk', 'moru', 'spiced', 'cooling']
  },

  // ──────────────────────────────────────────
  // HOT BEVERAGES
  // ──────────────────────────────────────────
  {
    id: 'hot-001', name: 'Filter Coffee', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 25, isVeg: true,
    description: 'Traditional South Indian filter coffee with milk',
    tags: ['coffee', 'filter', 'south indian', 'kaapi', 'hot']
  },
  {
    id: 'hot-002', name: 'Tea', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 15, isVeg: true,
    description: 'Hot brewed tea with milk and sugar',
    tags: ['tea', 'chai', 'milk tea', 'hot', 'beverage']
  },
  {
    id: 'hot-003', name: 'Masala Tea', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 25, isVeg: true,
    description: 'Spiced tea with ginger, cardamom, and cinnamon',
    tags: ['tea', 'masala', 'chai', 'spiced', 'ginger', 'hot']
  },
  {
    id: 'hot-004', name: 'Green Tea', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 30, isVeg: true,
    description: 'Refreshing green tea',
    tags: ['tea', 'green', 'healthy', 'hot', 'beverage']
  },
  {
    id: 'hot-005', name: 'Hot Chocolate', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 60, isVeg: true,
    description: 'Rich creamy hot chocolate',
    tags: ['chocolate', 'hot', 'cocoa', 'beverage', 'winter']
  },
  {
    id: 'hot-006', name: 'Badam Milk', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 50, isVeg: true,
    description: 'Warm milk with almonds, saffron, and cardamom',
    tags: ['badam', 'almond', 'milk', 'hot', 'traditional', 'beverage']
  },
  {
    id: 'hot-007', name: 'Horlicks', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 30, isVeg: true,
    description: 'Hot malt-based health drink',
    tags: ['horlicks', 'malt', 'hot', 'health drink', 'beverage']
  },
  {
    id: 'hot-008', name: 'Boost', category: 'Hot Beverages',
    station: 'juice', defaultPrice: 30, isVeg: true,
    description: 'Hot chocolate malt energy drink',
    tags: ['boost', 'chocolate', 'malt', 'hot', 'health drink']
  },

  // ──────────────────────────────────────────
  // COLD BEVERAGES AND COOLERS
  // ──────────────────────────────────────────
  {
    id: 'cold-001', name: 'Lemon Juice', category: 'Coolers',
    station: 'juice', defaultPrice: 35, isVeg: true,
    description: 'Fresh lemon juice with salt or sugar',
    tags: ['lemon', 'juice', 'nimbu', 'fresh', 'cooler']
  },
  {
    id: 'cold-002', name: 'Lemon Mint Soda', category: 'Coolers',
    station: 'juice', defaultPrice: 45, isVeg: true,
    description: 'Sparkling lemon soda with fresh mint leaves',
    tags: ['lemon', 'mint', 'soda', 'fizzy', 'cooler']
  },
  {
    id: 'cold-003', name: 'Jeera Soda', category: 'Coolers',
    station: 'juice', defaultPrice: 35, isVeg: true,
    description: 'Cumin-spiced soda with salt and lemon',
    tags: ['jeera', 'soda', 'cumin', 'spiced', 'fizzy', 'digestive']
  },
  {
    id: 'cold-004', name: 'Virgin Mojito', category: 'Coolers',
    station: 'juice', defaultPrice: 70, isVeg: true,
    description: 'Mint, lime, and soda refresher',
    tags: ['mojito', 'mint', 'lime', 'soda', 'mocktail', 'cooler']
  },
  {
    id: 'cold-005', name: 'Blue Lagoon', category: 'Coolers',
    station: 'juice', defaultPrice: 75, isVeg: true,
    description: 'Blue curacao flavoured mocktail',
    tags: ['blue lagoon', 'mocktail', 'cooler', 'blue']
  },
  {
    id: 'cold-006', name: 'Masala Soda', category: 'Coolers',
    station: 'juice', defaultPrice: 35, isVeg: true,
    description: 'Spiced soda water with chaat masala',
    tags: ['masala', 'soda', 'spiced', 'cooler']
  },
  {
    id: 'cold-007', name: 'Rose Milk', category: 'Coolers',
    station: 'juice', defaultPrice: 40, isVeg: true,
    description: 'Chilled milk with rose syrup',
    tags: ['rose', 'milk', 'sweet', 'pink', 'cooler']
  },
  {
    id: 'cold-008', name: 'Badam Milk (Cold)', category: 'Coolers',
    station: 'juice', defaultPrice: 55, isVeg: true,
    description: 'Chilled almond-flavoured milk',
    tags: ['badam', 'almond', 'milk', 'cold', 'cooler']
  },
  {
    id: 'cold-009', name: 'Jal Jeera', category: 'Coolers',
    station: 'juice', defaultPrice: 30, isVeg: true,
    description: 'Traditional cumin water with herbs',
    tags: ['jal jeera', 'cumin', 'water', 'cooler', 'traditional']
  },

  // ──────────────────────────────────────────
  // ICE CREAM AND DESSERTS
  // ──────────────────────────────────────────
  {
    id: 'ice-001', name: 'Ice Cream (Single Scoop)', category: 'Desserts',
    station: 'juice', defaultPrice: 40, isVeg: true,
    description: 'Choice of flavour — vanilla, chocolate, strawberry',
    tags: ['ice cream', 'scoop', 'dessert', 'sweet', 'cold']
  },
  {
    id: 'ice-002', name: 'Ice Cream Sundae', category: 'Desserts',
    station: 'juice', defaultPrice: 80, isVeg: true,
    description: 'Two scoops with chocolate sauce and nuts',
    tags: ['sundae', 'ice cream', 'chocolate', 'dessert']
  },
  {
    id: 'ice-003', name: 'Falooda', category: 'Desserts',
    station: 'juice', defaultPrice: 80, isVeg: true,
    description: 'Rose milk with vermicelli, basil seeds, and ice cream',
    tags: ['falooda', 'rose', 'dessert', 'sweet', 'cold']
  },
  {
    id: 'ice-004', name: 'Kulfi', category: 'Desserts',
    station: 'juice', defaultPrice: 50, isVeg: true,
    description: 'Traditional dense frozen milk dessert',
    tags: ['kulfi', 'ice cream', 'traditional', 'dessert', 'cold']
  },
  {
    id: 'ice-005', name: 'Gulab Jamun', category: 'Desserts',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Soft fried milk balls in sugar syrup',
    tags: ['gulab jamun', 'sweet', 'dessert', 'milk', 'sugar syrup']
  },
  {
    id: 'ice-006', name: 'Halwa', category: 'Desserts',
    station: 'food', defaultPrice: 45, isVeg: true,
    description: 'Semolina or carrot pudding with ghee and nuts',
    tags: ['halwa', 'sweet', 'dessert', 'rava', 'carrot']
  },
  {
    id: 'ice-007', name: 'Payasam', category: 'Desserts',
    station: 'food', defaultPrice: 45, isVeg: true,
    description: 'Sweet milk pudding with vermicelli or rice',
    tags: ['payasam', 'kheer', 'sweet', 'dessert', 'milk', 'south indian']
  },

  // ──────────────────────────────────────────
  // BAKERY
  // ──────────────────────────────────────────
  {
    id: 'bake-001', name: 'Plain Cake', category: 'Bakery',
    station: 'food', defaultPrice: 30, isVeg: true,
    description: 'Soft and moist plain sponge cake slice',
    tags: ['cake', 'bakery', 'sweet', 'slice']
  },
  {
    id: 'bake-002', name: 'Chocolate Cake', category: 'Bakery',
    station: 'food', defaultPrice: 40, isVeg: true,
    description: 'Rich chocolate cake slice',
    tags: ['cake', 'chocolate', 'bakery', 'sweet']
  },
  {
    id: 'bake-003', name: 'Bun', category: 'Bakery',
    station: 'food', defaultPrice: 15, isVeg: true,
    description: 'Soft sweet bread bun',
    tags: ['bun', 'bread', 'bakery', 'soft']
  },
  {
    id: 'bake-004', name: 'Cream Bun', category: 'Bakery',
    station: 'food', defaultPrice: 25, isVeg: true,
    description: 'Soft bun filled with sweet cream',
    tags: ['bun', 'cream', 'sweet', 'bakery']
  },
  {
    id: 'bake-005', name: 'Rusk', category: 'Bakery',
    station: 'food', defaultPrice: 10, isVeg: true,
    description: 'Crispy twice-baked bread for dunking in tea',
    tags: ['rusk', 'crispy', 'tea', 'bakery', 'biscuit']
  },
  {
    id: 'bake-006', name: 'Muffin', category: 'Bakery',
    station: 'food', defaultPrice: 35, isVeg: true,
    description: 'Soft fluffy muffin — blueberry or chocolate chip',
    tags: ['muffin', 'bakery', 'sweet', 'soft']
  },
  {
    id: 'bake-007', name: 'Cookie', category: 'Bakery',
    station: 'food', defaultPrice: 20, isVeg: true,
    description: 'Crunchy cookie — chocolate chip or butter',
    tags: ['cookie', 'biscuit', 'bakery', 'crunchy', 'sweet']
  },

  // ──────────────────────────────────────────
  // MEALS AND COMBOS
  // ──────────────────────────────────────────
  {
    id: 'meal-001', name: 'Mini Meals', category: 'Meals',
    station: 'food', defaultPrice: 80, isVeg: true,
    description: 'Rice, sambar, rasam, dal, vegetables, and papad',
    tags: ['meals', 'mini', 'rice', 'south indian', 'thali']
  },
  {
    id: 'meal-002', name: 'Full Meals', category: 'Meals',
    station: 'food', defaultPrice: 120, isVeg: true,
    description: 'Unlimited rice with sambar, rasam, 2 curries, papad, dessert',
    tags: ['meals', 'full', 'unlimited', 'rice', 'thali', 'south indian']
  },
  {
    id: 'meal-003', name: 'Chicken Meals', category: 'Meals',
    station: 'food', defaultPrice: 160, isVeg: false,
    description: 'Rice with chicken curry, rasam, dal, and papad',
    tags: ['meals', 'chicken', 'rice', 'non veg', 'thali']
  },
  {
    id: 'meal-004', name: 'Veg Combo', category: 'Meals',
    station: 'food', defaultPrice: 100, isVeg: true,
    description: 'Rice or parotta with choice of curry and a drink',
    tags: ['combo', 'veg', 'meal', 'value']
  },
]

// ─────────────────────────────────────────────
// SEARCH FUNCTION
// Called as user types in the search box.
// Searches name, category, tags, and description.
// Returns top 20 results sorted by relevance.
// ─────────────────────────────────────────────
export function searchFoodLibrary(query: string): FoodLibraryItem[] {
  if (!query.trim()) return []

  const q = query.toLowerCase().trim()

  const scored = FOOD_LIBRARY.map(item => {
    let score = 0

    // Exact name match = highest score
    if (item.name.toLowerCase() === q) score += 100

    // Name starts with query
    if (item.name.toLowerCase().startsWith(q)) score += 50

    // Name contains query
    if (item.name.toLowerCase().includes(q)) score += 30

    // Category match
    if (item.category.toLowerCase().includes(q)) score += 20

    // Tag match
    if (item.tags.some(tag => tag.toLowerCase().includes(q))) score += 15

    // Description match
    if (item.description.toLowerCase().includes(q)) score += 5

    return { item, score }
  })

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(r => r.item)
}

// ─────────────────────────────────────────────
// BULK PARSER FUNCTION
// Takes a comma/newline-separated string of food names
// and returns matched library items + unmatched names.
//
// Input: "Dosa, Idli, Mango Juice, Orange Juice, Coffee"
// Output: {
//   matched: [FoodLibraryItem, ...],    ← found in library
//   unmatched: ["Coffee"],              ← not found, create manually
// }
// ─────────────────────────────────────────────
export function parseBulkFoodInput(input: string): {
  matched: FoodLibraryItem[]
  unmatched: string[]
} {
  // Split by comma, newline, or semicolon
  const names = input
    .split(/[,\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1)

  const matched: FoodLibraryItem[] = []
  const unmatched: string[] = []
  const seen = new Set<string>()

  for (const name of names) {
    const q = name.toLowerCase()

    // Try exact match first
    const exact = FOOD_LIBRARY.find(
      item => item.name.toLowerCase() === q
    )

    if (exact && !seen.has(exact.id)) {
      matched.push(exact)
      seen.add(exact.id)
      continue
    }

    // Try partial match
    const partial = FOOD_LIBRARY.find(
      item =>
        item.name.toLowerCase().includes(q) ||
        q.includes(item.name.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase() === q)
    )

    if (partial && !seen.has(partial.id)) {
      matched.push(partial)
      seen.add(partial.id)
      continue
    }

    // Not found in library — will need manual entry
    unmatched.push(name)
  }

  return { matched, unmatched }
}

// ─────────────────────────────────────────────
// GET ALL CATEGORIES
// Used to populate the category filter dropdown
// ─────────────────────────────────────────────
export function getAllCategories(): string[] {
  const cats = new Set(FOOD_LIBRARY.map(item => item.category))
  return Array.from(cats).sort()
}

// ─────────────────────────────────────────────
// GET ITEMS BY CATEGORY
// Used for browsing the library by category
// ─────────────────────────────────────────────
export function getItemsByCategory(category: string): FoodLibraryItem[] {
  return FOOD_LIBRARY.filter(item => item.category === category)
}
