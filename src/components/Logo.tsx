import React from 'react';

export default function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Circular background with two halves */}
        <circle cx="50" cy="50" r="48" fill="#F5F2ED" />
        <path d="M50 2 A48 48 0 0 1 50 98 A48 48 0 0 0 50 2" fill="#8DA399" />
        
        {/* Stylized S-curve separator */}
        <path 
          d="M50 2 C70 20 30 80 50 98" 
          fill="none" 
          stroke="#006D5B" 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        
        {/* Text */}
        <text 
          x="35" 
          y="45" 
          fontFamily="sans-serif" 
          fontSize="10" 
          fontWeight="bold" 
          fill="#1A1A1A"
          textAnchor="middle"
        >
          THE
        </text>
        <text 
          x="35" 
          y="58" 
          fontFamily="sans-serif" 
          fontSize="10" 
          fontWeight="bold" 
          fill="#1A1A1A"
          textAnchor="middle"
        >
          SUBTLE
        </text>
        <text 
          x="35" 
          y="71" 
          fontFamily="sans-serif" 
          fontSize="10" 
          fontWeight="bold" 
          fill="#1A1A1A"
          textAnchor="middle"
        >
          INFRA
        </text>
      </svg>
    </div>
  );
}
