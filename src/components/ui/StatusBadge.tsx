import {
  CheckCircle2,
  Clock,
  Layers,
  XCircle,
} from 'lucide-react';
import type { ContributorSegment, UserRole } from '../../types/traceco';

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  pending: 'Menunggu Verifikasi',
  'pending review': 'Menunggu Review',
  verified: 'Terverifikasi',
  'partially verified': 'Terverifikasi Sebagian',
  rejected: 'Ditolak',
  approved: 'Disetujui',
  'handed over': 'Diserahterimakan',
  utilized: 'Dimanfaatkan',
  available: 'Tersedia',
  reserved: 'Direservasi',
  distributed: 'Didistribusikan',
  completed: 'Selesai',
  paid: 'Dibayarkan',
};

export function StatusTag({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const displayLabel = STATUS_DISPLAY_LABELS[normalized] ?? status;

  if (
    normalized === 'verified' ||
    normalized === 'terverifikasi' ||
    normalized === 'paid' ||
    normalized === 'completed' ||
    normalized === 'terjawab' ||
    normalized === 'selesai' ||
    normalized === 'aktif' ||
    normalized === 'available'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B5E43] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1B5E43]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (
    normalized === 'utilized' ||
    normalized === 'handed over' ||
    normalized === 'distributed'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B5E6B] whitespace-nowrap shrink-0">
        <Layers className="h-3.5 w-3.5 shrink-0 text-[#2B5E6B]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (
    normalized === 'approved' ||
    normalized === 'berlangsung' ||
    normalized === 'partially verified'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B5E6B] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#2B5E6B]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A62626] whitespace-nowrap shrink-0">
        <XCircle className="h-3.5 w-3.5 shrink-0 text-[#A62626]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A15C17] whitespace-nowrap shrink-0">
      <Clock className="h-3.5 w-3.5 shrink-0 text-[#A15C17]" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}

export function RoleTag({
  role,
  segment,
  variant = 'inline',
}: {
  role: UserRole | ContributorSegment | string;
  segment?: string;
  variant?: 'inline' | 'badge';
}) {
  const label =
    segment && segment !== role ? `${role} · ${segment}` : role;

  const toneClass =
    role === 'Admin'
      ? 'text-[#141B17] font-semibold'
      : role === 'Mitra'
        ? 'text-[#2B5E6B] font-medium'
        : role === 'Keluarga Rentan'
          ? 'text-[#2B5E6B] font-medium'
          : 'text-[#58655E] font-medium';

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center text-xs whitespace-nowrap shrink-0 ${toneClass}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] whitespace-nowrap shrink-0 ${toneClass}`}
    >
      {label}
    </span>
  );
}
