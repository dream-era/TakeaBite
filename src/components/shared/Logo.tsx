import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "icon";
  withBackground?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  variant = "full",
  withBackground = false,
}: LogoProps) {
  // Height range 40px to 48px
  const heightClass = "h-[40px] md:h-[44px] lg:h-[48px]";
  const widthClass = "w-auto";

  const foxIcon = (
    <Image
      src="/fox-logo.png"
      alt="TakeaBite Logo"
      width={100}
      height={100}
      className={`${heightClass} ${widthClass} object-contain shrink-0`}
      priority
    />
  );

  if (variant === "icon") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {foxIcon}
      </div>
    );
  }

  // Full variant using the exact attached image and wordmark
  return (
    <div className={`flex items-center gap-3 transition-opacity duration-200 hover:opacity-90 ${className}`}>
      {foxIcon}
      <div className="flex items-center leading-none font-[800] text-xl md:text-2xl tracking-tight">
        <span style={{ color: '#111111' }}>Takea</span>
        <span style={{ color: '#D7303B' }}>Bite</span>
      </div>
    </div>
  );
}
