import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl"; // Keep for backwards compatibility, though we enforce responsive sizes
  variant?: "full" | "icon"; // Kept for backwards compatibility
  withBackground?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  variant = "full",
  withBackground = false,
}: LogoProps) {
  // Enforce responsive width as requested:
  // Mobile: 100-130px -> w-[110px]
  // Tablet: 120-150px -> md:w-[135px]
  // Desktop: 140-180px -> lg:w-[160px]
  const widthClass = "w-[110px] md:w-[135px] lg:w-[160px]";
  const heightClass = "h-auto";

  return (
    <div className={`flex items-center justify-center transition-opacity duration-200 hover:opacity-90 ${className}`}>
      <Image
        src="/logo-official.png"
        alt="TakeaBite Logo"
        width={320}
        height={320}
        className={`${widthClass} ${heightClass} object-contain shrink-0`}
        priority
      />
    </div>
  );
}
