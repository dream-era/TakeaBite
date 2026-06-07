import React from 'react';

const CATEGORY_IMAGES: Record<string, string> = {
  'South Indian': '/food-images/masala-dosa.jpg',
  'Rice':         '/food-images/chicken-biryani.jpg',
  'Noodles':      '/food-images/hakka-noodles.jpg',
  'Snacks':       '/food-images/french-fries.jpg',
  'Pasta':        '/food-images/veg-pasta.jpg',
  'North Indian': '/food-images/paneer-butter-masala.jpg',
  'Juices':       '/food-images/fresh-orange-juice.jpg',
  'Shakes':       '/food-images/mango-milkshake.jpg',
  'Lassi':        '/food-images/mango-lassi.jpg',
  'Hot Beverages':'/food-images/filter-coffee.jpg',
  'Coolers':      '/food-images/lemon-mint-soda.jpg',
  'Desserts':     '/food-images/gulab-jamun.jpg',
  'Bakery':       '/food-images/chocolate-cake.jpg',
  'Meals':        '/food-images/full-meals.jpg',
};

interface CategoryChipsProps {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export function CategoryChips({ categories, activeCategory, onSelect }: CategoryChipsProps) {
  return (
    <section className="py-element-gap-md overflow-x-auto no-scrollbar -mx-container-padding px-container-padding flex gap-3 mb-4 snap-x snap-mandatory">
      {categories.map((cat) => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[72px] rounded-2xl transition-all active:scale-95 whitespace-nowrap border snap-start ${
            activeCategory === cat 
              ? 'bg-primary/5 border-primary text-primary shadow-sm' 
              : 'bg-surface-container-lowest border-surface-container text-secondary hover:bg-surface-container-low'
          }`}
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0">
            <img
              src={CATEGORY_IMAGES[cat] ?? '/food-images/veg-combo.jpg'}
              alt={cat}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <span className={`text-[11px] leading-tight text-center ${activeCategory === cat ? 'font-bold' : 'font-medium'}`}>
            {cat}
          </span>
        </button>
      ))}
    </section>
  );
}
