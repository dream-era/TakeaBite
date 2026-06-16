"use client";

import React, { useState } from "react";
import { nameToImageSlug } from "@/data/foodLibrary";
import type { CartItem } from "@/store/useCartStore";

interface CartItemCardProps {
  item: CartItem;
  workspaceId: string;
  updateQuantity: (id: string, workspaceId: string, delta: number) => void;
}

export function CartItemCard({ item, workspaceId, updateQuantity }: CartItemCardProps) {
  const [imgError, setImgError] = useState(false);

  const getItemImage = (cartItem: CartItem): string | null => {
    // Priority 1: custom uploaded image from DB
    if (cartItem.imageUrl && cartItem.imageUrl.startsWith("http")) return cartItem.imageUrl;
    // Priority 2: library image from public folder
    const slug = nameToImageSlug(cartItem.name);
    return `/food-images/${slug}`;
  };

  const imgSrc = getItemImage(item);

  return (
    <div className="flex gap-4">
      <div className="w-20 h-20 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
        {!imgError && imgSrc ? (
          <img /* eslint-disable-next-line @next/next/no-img-element */
            src={imgSrc}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full rounded-lg bg-[#E8570C20] flex items-center justify-center text-2xl font-bold text-[#E8570C]"
          >
            {item.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-label-md text-on-surface line-clamp-2 leading-tight">
            {item.name}
          </h3>
          <span className="font-price-display text-primary block mt-1">
            ${(item.price || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center bg-surface-container-high rounded-lg p-1 gap-3">
            <button
              onClick={() => updateQuantity(item.id, workspaceId, -1)}
              className="w-6 h-6 rounded-md bg-surface-container-lowest flex items-center justify-center shadow-sm text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="font-label-md min-w-[12px] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, workspaceId, 1)}
              className="w-6 h-6 rounded-md bg-surface-container-lowest flex items-center justify-center shadow-sm text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
