import { CheckCircle2, Clock, XCircle } from 'lucide-react';
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
      <span className="inline-flex items-center gap-1 rounded border border-[#C6DBC9] bg-[#E7F0E8] px-2 py-0.5 text-[11px] font-medium text-[#245C45] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3 w-3 text-[#245C45]" aria-hidden="true" />
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
      <span className="inline-flex items-center gap-1 rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-medium text-[#1E40AF] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3 w-3 text-[#2563EB]" aria-hidden="true" />
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
      <span className="inline-flex items-center gap-1 rounded border border-[#C6DBC9] bg-[#F2F7F3] px-2 py-0.5 text-[11px] font-medium text-[#245C45] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3 w-3 text-[#4F8A68]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-medium text-[#991B1B] whitespace-nowrap shrink-0">
        <XCircle className="h-3 w-3 text-[#B91C1C]" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-[#E5D3B3] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-medium text-[#92400E] whitespace-nowrap shrink-0">
      <Clock className="h-3 w-3 text-[#B45309]" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}

export function RoleTag({ role }: { role: UserRole | ContributorSegment | string }) {
  const styles: Record<string, string> = {
    Kontributor: 'bg-[#E7F0E8] text-[#245C45] border-[#C6DBC9]',
    Santri: 'bg-[#E7F0E8] text-[#245C45] border-[#C6DBC9]',
    Warga: 'bg-[#F7F9F7] text-[#252B28] border-[#DCE4DE]',
    'Keluarga Rentan': 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
    Admin: 'bg-[#245C45] text-white border-[#245C45]',
    Mitra: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]',
  };

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${
        styles[role] ?? 'bg-[#F7F9F7] text-[#252B28] border-[#DCE4DE]'
      }`}
    >
      {role}
    </span>
  );
}
