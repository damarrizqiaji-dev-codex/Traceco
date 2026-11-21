import { useState } from 'react';
import { Leaf } from 'lucide-react';

interface TracecoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'light' | 'dark';
  className?: string;
}

const LOGO_SRC = '/assets/aistudio/Interlocking_Green_Eco-Tech_Emblem_811ef0e5.png';

export function TracecoLogo({
  size = 'md',
  tone = 'light',
  className = '',
}: TracecoLogoProps) {
  const [imgError, setImgError] = useState(false);

  const boxSizes = {
    sm: 'h-7 w-7 rounded',
    md: 'h-10 w-10 rounded-md',
    lg: 'h-12 w-12 rounded-md',
  };

  if (imgError) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${
          tone === 'dark'
            ? 'border border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
            : 'border border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
        } ${boxSizes[size]} ${className}`}
        aria-label="Logo TRACECO"
      >
        <Leaf className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden bg-white shrink-0 ${
        tone === 'dark'
          ? 'border border-[#D9E0DC]'
          : 'border border-[#D9E0DC]'
      } ${boxSizes[size]} ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt="Logo TRACECO"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="h-full w-full object-contain scale-125"
      />
    </span>
  );
}
