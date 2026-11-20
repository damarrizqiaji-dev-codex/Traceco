import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  leadingIcon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
  titleId?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  leadingIcon,
  footer,
  children,
  maxWidthClass = 'max-w-3xl',
  titleId = 'modal-title',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111E19]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`animate-traceco-modal max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-lg border border-[#D8DFDA] bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D8DFDA] px-6 py-4">
          <div className="flex items-start gap-3">
            {leadingIcon}
            <div>
              <div id={titleId}>{title}</div>
              {subtitle && (
                <p className="mt-1 text-xs leading-relaxed text-[#54625B]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-md border border-[#D8DFDA] p-1.5 text-[#54625B] hover:bg-[#F2F4F2] hover:text-[#17201C] transition-colors duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D8DFDA] bg-[#F8FAF8] px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
