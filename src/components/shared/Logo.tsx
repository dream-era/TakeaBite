import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl"; // Keep for backwards compatibility, though we enforce responsive sizes
  variant?: "full" | "icon"; // Kept for backwards compatibility
  withBackground?: boolean;
}

export function Logo({
  className = "h-8", // Default to h-8 (32px) if no class provided
  size = "md",
  variant = "full",
  withBackground = false,
}: LogoProps) {
  const icon = (
    <Image
      src="/logo-icon.png"
      alt="TakeaBite Logo"
      width={320}
      height={320}
      className="h-full w-auto object-contain shrink-0"
      priority
    />
  );

  if (variant === "icon") {
    return (
      <div className={`flex items-center justify-center transition-opacity duration-200 hover:opacity-90 ${className}`}>
        {icon}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-[0.35rem] transition-opacity duration-200 hover:opacity-90 ${className}`}>
      {icon}
      <span className="font-bold text-[1.25em] tracking-tight leading-none pt-1">
        <span className="text-[#0C0E0B]">Takea</span>
        <span className="text-[#D7303B]">Bite</span>
      </span>
    </div>
  );
}
