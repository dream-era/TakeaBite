import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CustomerTopBarProps {
  shopName: string;
  shopLogoUrl?: string;
}

export function CustomerTopBar({ 
  shopName, 
  shopLogoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAVUGivKj4QVwoE66Fj2qqexCQx0w1KhtQ9VrWMHh1JmwWuXh7u9EKEr5GIfpauLcJS2xtkUbSSjYorIFAKhcBYmwp41PX0BWZGJwet74G3lzuxX3MP922TxF6THuWst2b0Pf_6_gvVqvThws4Z2WqTsObDD0LViLY_Cj94-1LWrN4YDAGvGZAZD665-a0zXTLBL1SibySJ6hJYKQMQE_PPnisI6_RRTHgu0df1bc3a_hHt86_QNBKRlig1SAZncULhjiwjOeAtmp8" 
}: CustomerTopBarProps) {
  const router = useRouter();

  return (
    <header className="bg-background dark:bg-on-surface sticky top-0 z-40 w-full">
      <div className="flex justify-between items-center w-full px-container-padding py-4">
        <button onClick={() => router.back()} className="text-on-surface dark:text-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 p-2 -ml-2 flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">arrow_back</span>
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-widest text-on-surface dark:text-surface uppercase truncate max-w-[200px] text-center flex items-center justify-center gap-1.5">
          {shopName}
          <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-50 shrink-0" />
        </h1>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-surface-container-high hover:opacity-80 transition-opacity active:scale-95 duration-150 shrink-0">
          <img 
            alt="Shop Logo" 
            className="w-full h-full object-cover" 
            src={shopLogoUrl} 
          />
        </div>
      </div>
    </header>
  );
}
