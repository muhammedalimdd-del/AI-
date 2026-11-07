import React from 'react';

export const AI_TIMES_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_l9mivgl9mivgl9mi_4016af0e.png';
export const ZENVORA_LOGO_URL = AI_TIMES_LOGO_URL;

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const AiVideoCameraLogo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* AI TIMES Golden Royal Emblem Logo */}
      <div
        className={`${sizeClasses[size]} relative rounded-2xl p-[1.5px] bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 shadow-xl shadow-amber-500/25 shrink-0 group overflow-hidden`}
      >
        <div className="w-full h-full bg-[#070B14] rounded-[14px] flex items-center justify-center relative overflow-hidden">
          <img
            src={AI_TIMES_LOGO_URL}
            alt="AI TIMES Logo"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {showText && (
        <div>
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-wider bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent ${textSizes[size]}`}
            >
              AI TIMES
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-amber-200/80 font-semibold tracking-wider mt-1">
            Dream. Create. Beyond Limits.
          </p>
        </div>
      )}
    </div>
  );
};

