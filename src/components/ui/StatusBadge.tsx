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
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166549] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#166549]" aria-hidden="true" />
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
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D6373] whitespace-nowrap shrink-0">
        <Layers className="h-3.5 w-3.5 shrink-0 text-[#1D6373]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (
    normalized === 'approved' ||
    normalized === 'reserved' ||
    normalized === 'berlangsung' ||
    normalized === 'partially verified'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D6373] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1D6373]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C] whitespace-nowrap shrink-0">
        <XCircle className="h-3.5 w-3.5 shrink-0 text-[#B91C1C]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309] whitespace-nowrap shrink-0">
      <Clock className="h-3.5 w-3.5 shrink-0 text-[#B45309]" aria-hidden="true" />
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
      ? 'text-[#111E19] font-semibold'
      : role === 'Mitra'
        ? 'text-[#1D6373] font-medium'
        : role === 'Keluarga Rentan'
          ? 'text-[#1D6373] font-medium'
          : 'text-[#54625B] font-medium';

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
