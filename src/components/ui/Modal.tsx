import type { ReactNode } from 'react';
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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252B28]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-md border border-[#E3E8E4] bg-white shadow-lg`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E3E8E4] px-6 py-4">
          <div className="flex items-start gap-3">
            {leadingIcon}
            <div>
              <div id={titleId}>{title}</div>
              {subtitle && (
                <p className="mt-1 text-xs text-[#6B756F]">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded border border-[#E3E8E4] p-1.5 text-[#6B756F] hover:bg-[#F7F9F7] hover:text-[#252B28] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E8E4] bg-[#F7F9F7] px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
