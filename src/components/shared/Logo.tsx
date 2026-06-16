import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl"; // Keep for backwards compatibility, though we enforce responsive sizes
  variant?: "full" | "icon"; // Kept for backwards compatibility
  withBackground?: boolean;
}

export function Logo({
  className = "w-auto h-8", // Default to h-8 (32px) if no class provided
  size = "md",
  variant = "full",
  withBackground = false,
}: LogoProps) {
  return (
    <div className={`flex items-center justify-center transition-opacity duration-200 hover:opacity-90 ${className}`}>
      <Image
        src="/logo-official.png"
        alt="TakeaBite Logo"
        width={320}
        height={320}
        className="w-full h-full object-contain shrink-0"
        priority
      />
    </div>
  );
}
