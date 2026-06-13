import React from "react";

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
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
    "2xl": "h-16 w-16",
  };

  const dimensions = sizeClasses[size] || sizeClasses.md;

  const IconSVG = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dimensions} shrink-0`}
    >
      {/* Optional dark background */}
      {withBackground && (
        <rect width="100" height="100" rx="20" fill="#0B1020" />
      )}
      
      {/* Outer Circle */}
      <circle cx="50" cy="50" r="45" stroke="#D6E8F4" strokeWidth="3" />

      {/* Fox Head (Light Blue) */}
      <path
        d="M 33 65 
           C 30 50, 35 30, 45 22 
           L 49 32 
           L 54 26 
           L 58 35 
           C 65 40, 75 42, 80 45 
           C 70 48, 62 48, 55 49 
           C 48 50, 42 55, 33 65 Z"
        fill="#D6E8F4"
      />

      {/* Fox Eye */}
      <path
        d="M 58 40 C 60 41, 62 41, 64 42 C 60 43, 58 42, 58 40 Z"
        fill={withBackground ? "#0B1020" : "#0B1020"}
      />

      {/* Fox Swoosh / Lower Body (Red) */}
      <path
        d="M 35 63 
           C 42 50, 60 52, 75 73 
           C 60 85, 40 80, 35 63 Z"
        fill="#D7303B"
      />
    </svg>
  );

  if (variant === "icon") {
    return <div className={className}>{IconSVG}</div>;
  }

  // Full variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {IconSVG}
      <span className="font-bold tracking-tight text-neutral-900 dark:text-white" style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '18px' : size === 'lg' ? '22px' : '26px' }}>
        TakeaBite
      </span>
    </div>
  );
}
