import React, { useState } from 'react';
import FoodImage from '@/components/shared/FoodImage';
import { nameToImageSlug } from '@/data/foodLibrary';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isVeg?: boolean | null;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  quantity?: number;
  onAdd: (id: string) => void;
  onUpdateQuantity?: (id: string, delta: number) => void;
}

export const ProductCard = React.memo(function ProductCard({ 
  id, name, price, imageUrl, isVeg, isAvailable = true, isBestSeller, quantity = 0, onAdd, onUpdateQuantity 
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAdd = () => {
    if (!isAvailable) return;
    setIsAdding(true);
    setTimeout(() => {
      onAdd(id);
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 400); // simulated loading animation
  };

  return (
    <div className={`bg-surface-container-lowest rounded-2xl p-3 flex flex-col h-full shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 ${!isAvailable ? 'opacity-60 grayscale-[0.3]' : ''}`}>
      
      {/* Image Section */}
      <div className="relative aspect-square w-full mb-3 rounded-xl overflow-hidden flex-shrink-0 bg-surface-variant">
        <FoodImage
          imageUrl={imageUrl}
          imageSlug={nameToImageSlug(name)}
          itemName={name}
          size="lg"
          className="w-full h-full transition-transform hover:scale-105 duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {isBestSeller && (
            <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm tracking-wide">
              BEST SELLER
            </span>
          )}
          {!isAvailable && (
            <span className="bg-surface-variant text-on-surface text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-outline/20">
              OUT OF STOCK
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-1 gap-2">
          <p className="font-body-md text-on-surface font-semibold leading-tight line-clamp-2">
            {name}
          </p>
          {isVeg !== undefined && (
            <div className={`flex-shrink-0 mt-0.5 w-3.5 h-3.5 border flex items-center justify-center rounded-sm ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
            </div>
          )}
        </div>
        <span className="font-price-display text-on-surface font-bold mb-3 mt-auto">
          ₹{(price || 0).toFixed(2)}
        </span>
      </div>

      {/* Action Section */}
      <div className="mt-auto pt-1 w-full">
        {!isAvailable ? (
          <button disabled className="w-full h-11 rounded-xl bg-surface-variant text-secondary font-bold text-sm tracking-wide">
            UNAVAILABLE
          </button>
        ) : quantity > 0 && onUpdateQuantity ? (
          <div className="w-full h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between px-2 overflow-hidden">
            <button 
              onClick={() => onUpdateQuantity(id, -1)}
              className="w-10 h-full flex items-center justify-center text-primary text-xl active:scale-95 transition-transform"
            >
              −
            </button>
            <span className="font-bold text-primary">{quantity}</span>
            <button 
              onClick={() => onUpdateQuantity(id, 1)}
              className="w-10 h-full flex items-center justify-center text-primary text-xl active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAdd}
            disabled={isAdding || showSuccess}
            className={`w-full h-11 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2
              ${showSuccess ? 'bg-green-600 text-white' : 'bg-primary text-on-primary hover:opacity-90'}
            `}
          >
            {isAdding ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : showSuccess ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span> ADDED
              </>
            ) : (
              'ADD TO CART'
            )}
          </button>
        )}
      </div>
    </div>
  );
});
