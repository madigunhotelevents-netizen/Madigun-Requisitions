import React from 'react';

interface MadigunLogoProps {
  className?: string;
  size?: number; // width/height
  iconOnly?: boolean;
  lightLogo?: boolean;
  customLogo?: string | null;
}

export default function MadigunLogo({ className = '', size = 48, iconOnly = false, lightLogo = false, customLogo = null }: MadigunLogoProps) {
  const emblemColor = lightLogo ? '#EAE5DB' : '#DFD9D0'; // soft warm beige/taupe
  const textColor = lightLogo ? '#FAF9F6' : '#3E312C'; // dark chocolate brown or light off-white
  const subtextColor = lightLogo ? '#DFD9D0' : '#8C7A6B'; // subtext taupe
  
  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ height: size }}>
      {customLogo ? (
        <img 
          src={customLogo} 
          alt="Brand Logo" 
          className="shrink-0 rounded-lg object-contain"
          style={{ width: size, height: size }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          {/* Symmetrical Madigun "M" Monogram Emblem matching the upload */}
          {/* Left Base column base */}
          <rect x="18" y="76" width="12" height="4" rx="1" fill={emblemColor} />
          
          {/* Arching external frame of 'M' */}
          <path 
            d="M24 76 V42 C24 33, 31 27, 40 27 C46 27, 49 31, 50 34 C51 31, 54 27, 60 27 C69 27, 76 33, 76 42 V76" 
            stroke={emblemColor} 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Right Base column base */}
          <rect x="70" y="76" width="12" height="4" rx="1" fill={emblemColor} />
          
          {/* Inner swooshes to represent the multi-stroke M */}
          <path 
            d="M32 76 V46 C32 40, 36 36, 42 36 C46 36, 49 39, 50 42 C51 39, 54 36, 58 36 C64 36, 68 40, 68 46 V76" 
            stroke={emblemColor} 
            strokeWidth="2" 
            strokeLinecap="round" 
          />
          
          {/* Central vertical stem */}
          <line x1="50" y1="46" x2="50" y2="76" stroke={emblemColor} strokeWidth="2.5" strokeLinecap="round" />

          {/* Central Top Diamond Rhombus */}
          <path d="M50 12 L55 20 L50 28 L45 20 Z" fill={emblemColor} />
          
          {/* Symmetrical Flourishes flaring outwards at the top */}
          <path d="M42 24 C34 23, 26 29, 24 37" stroke={emblemColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M58 24 C66 23, 74 29, 76 37" stroke={emblemColor} strokeWidth="2" strokeLinecap="round" />
          
          {/* Soft elegant foundation base stand lines */}
          <line x1="12" y1="83" x2="88" y2="83" stroke={emblemColor} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      
      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none select-none">
          <span 
            className="font-serif tracking-[0.18em] font-bold uppercase text-lg"
            style={{ color: textColor }}
          >
            Madigun
          </span>
          <span 
            className="text-[9.5px] font-sans tracking-[0.12em] font-medium mt-0.5"
            style={{ color: subtextColor }}
          >
            Hotel & Events
          </span>
        </div>
      )}
    </div>
  );
}
