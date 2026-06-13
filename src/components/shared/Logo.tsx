import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "icon";
  withBackground?: boolean;
}

import Image from "next/image";

export function Logo({
  className = "",
  size = "md",
  variant = "full",
  withBackground = false,
}: LogoProps) {
  // Desktop: 48px, Tablet: 44px, Mobile: 40px
  const heightClass = "h-[40px] md:h-[44px] lg:h-[48px]";
  const widthClass = "w-auto";

  if (variant === "icon") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Image
          src="/icon.png"
          alt="TakeaBite Icon"
          width={397}
          height={397}
          className={`${heightClass} ${widthClass} object-contain shrink-0`}
          priority
        />
      </div>
    );
  }

  // Full variant using the exact attached image as requested
  return (
    <div className={`flex items-center transition-opacity duration-200 hover:opacity-90 ${className}`}>
      <Image
        src="/takeabite-logo.png"
        alt="TakeaBite Logo"
        width={1024}
        height={397}
        className={`${heightClass} ${widthClass} object-contain shrink-0`}
        priority
      />
    </div>
  );
}
