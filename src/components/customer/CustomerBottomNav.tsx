"use client";

import React from 'react';
import Link from 'next/link';

interface CustomerBottomNavProps {
  workspaceId: string;
  tableId?: string;
  activeTab?: 'home' | 'search' | 'orders';
}

export function CustomerBottomNav({ workspaceId, tableId, activeTab = 'home' }: CustomerBottomNavProps) {
  const basePath = tableId ? `/shop/${workspaceId}/table/${tableId}` : `/shop/${workspaceId}`;

  return (
    <nav className="bg-surface dark:bg-inverse-surface fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-xl z-50 shadow-[0px_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md pb-safe">
      <div className="flex justify-around items-center h-16 w-full px-4">
        <Link 
          href={basePath}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-200 px-4 py-1 rounded-lg ${
            activeTab === 'home' 
              ? 'text-primary dark:text-inverse-primary font-bold' 
              : 'text-on-surface-variant dark:text-secondary-fixed-dim hover:bg-surface-container-low dark:hover:bg-on-tertiary-fixed-variant'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="font-label-md text-label-md">Home</span>
        </Link>
        
        <Link 
          href={`${basePath}/search`}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-200 px-4 py-1 rounded-lg ${
            activeTab === 'search' 
              ? 'text-primary dark:text-inverse-primary font-bold' 
              : 'text-on-surface-variant dark:text-secondary-fixed-dim hover:bg-surface-container-low dark:hover:bg-on-tertiary-fixed-variant'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'search' ? "'FILL' 1" : "'FILL' 0" }}>search</span>
          <span className="font-label-md text-label-md">Search</span>
        </Link>

        <Link 
          href={`${basePath}/order-tracking`}
          className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-200 px-4 py-1 rounded-lg ${
            activeTab === 'orders' 
              ? 'text-primary dark:text-inverse-primary font-bold' 
              : 'text-on-surface-variant dark:text-secondary-fixed-dim hover:bg-surface-container-low dark:hover:bg-on-tertiary-fixed-variant'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'orders' ? "'FILL' 1" : "'FILL' 0" }}>receipt_long</span>
          <span className="font-label-md text-label-md">Orders</span>
        </Link>

      </div>
    </nav>
  );
}
