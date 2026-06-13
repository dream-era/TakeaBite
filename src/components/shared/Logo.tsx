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
  // Increased sizes by 20-30%
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-16 w-16",
    "2xl": "h-20 w-20",
  };

  const dimensions = sizeClasses[size] || sizeClasses.md;

  const IconSVG = (
    <div className={`relative flex items-center justify-center shrink-0 rounded-full bg-[#FFFFFF] border border-[#D6E8F4] shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-2.5 sm:p-3 ${withBackground ? 'bg-[#0B1020] border-[#0B1020]' : ''}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dimensions} shrink-0 drop-shadow-md`}
      >
        {withBackground && (
          <rect width="100" height="100" rx="50" fill="#0B1020" />
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
    </div>
  );

  if (variant === "icon") {
    return <div className={`flex items-center justify-center ${className}`}>{IconSVG}</div>;
  }

  // Full variant
  return (
    <div className={`group flex items-center gap-2.5 sm:gap-3 transition-opacity duration-200 hover:opacity-90 ${className}`}>
      {IconSVG}
      <div 
        className="flex items-center tracking-tight whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:drop-shadow-none" 
        style={{ 
          fontSize: size === 'sm' ? '16px' : size === 'md' ? '20px' : size === 'lg' ? '24px' : '28px',
          fontWeight: 800,
          fontFamily: 'var(--font-inter), system-ui, sans-serif'
        }}
      >
        <span className="text-[#111111] dark:text-white">Takea</span>
        <span className="text-[#D7303B]">Bite</span>
      </div>
    </div>
  );
}
