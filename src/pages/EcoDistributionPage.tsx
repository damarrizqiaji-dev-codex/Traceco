import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, Plus, Search, Send } from 'lucide-react';
import type {
  DistributionRequest,
  DistributionStatus,
  RequesterType,
  TracecoState,
  UtilizationCategory,
  UtilizationRecord,
} from '../types/traceco';
import {
  computePlatformMetrics,
  computeVerifiedInventory,
  isAdminRole,
  isMitraRole,
  type InventoryItem,
} from '../utils/tracecoLogic';
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';

interface EcoDistributionPageProps {
  state: TracecoState;
  pageMode?: 'inventory' | 'distribution' | 'requests';
  activeSubTab?: string;
  onChangeSubTab?: (sub: string) => void;
  onCreateDistributionRequest: (payload: {
    batchId: string;
    requesterId?: string;
    requesterName: string;
    requesterType: RequesterType;
    requestedCount: number;
    utilizationCategory: UtilizationCategory;
    location?: string;
    neededDate?: string;
    utilizationDetail: string;
  }) => Promise<{ error?: string }> | { error?: string };
  onUpdateDistributionStatus: (
    requestId: string,
    nextStatus: DistributionStatus,
    receiverName?: string,
    documentationNote?: string
  ) => void;
  onInspectTarget: (targetId: string) => void;
  onOpenTraceDetail?: (targetId: string) => void;
}

const REQUESTER_TYPES: RequesterType[] = [
  'Pesantren',
  'Komunitas',
  'Pengrajin',
  'Mitra Pemanfaat',
];

const UTILIZATION_CATEGORIES: UtilizationCategory[] = [
  'Fasilitas Pesantren',
  'Kegiatan Komunitas',
  'Produk Kerajinan',
  'Proyek Mitra',
];

export function EcoDistributionPage({
  state,
  pageMode = 'distribution',
  activeSubTab = '',
  onChangeSubTab = () => {},
  onCreateDistributionRequest,
  onUpdateDistributionStatus,
  onInspectTarget,
  onOpenTraceDetail,
}: EcoDistributionPageProps) {
  const isAdmin = isAdminRole(state.activeRole);
  const isMitra = isMitraRole(state.activeRole);
  const activeActorId = state.currentUserId ?? '';
  const activeActor = state.contributors.find((c) => c.id === activeActorId);

  const metrics = computePlatformMetrics(state);
  const inventory = computeVerifiedInventory(
    state.ecobrick_batches,
    state.distribution_requests,
    state.contributors
  );
  const availableBatches = inventory.filter((i) => i.availableCount > 0);

  const [batchId, setBatchId] = useState(
    availableBatches[0]?.batchId ?? inventory[0]?.batchId ?? ''
  );
  const [requesterType, setRequesterType] = useState<RequesterType>(
    isMitra ? 'Mitra Pemanfaat' : 'Pesantren'
  );
  const [requesterName, setRequesterName] = useState(
    isMitra ? activeActor?.name ?? 'Sanggar Bambu Krajan' : ''
  );
  const [requestedCount, setRequestedCount] = useState('5');
  const [utilizationCategory, setUtilizationCategory] =
    useState<UtilizationCategory>(
      isMitra ? 'Proyek Mitra' : 'Fasilitas Pesantren'
    );
  const [location, setLocation] = useState('');
  const [neededDate, setNeededDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [utilizationDetail, setUtilizationDetail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminCreateForm, setShowAdminCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isMitra) {
      setRequesterType('Mitra Pemanfaat');
      setRequesterName(activeActor?.name ?? 'Sanggar Bambu Krajan');
      setUtilizationCategory('Proyek Mitra');
    } else {
      setRequesterType('Pesantren');
      setRequesterName('');
      setUtilizationCategory('Fasilitas Pesantren');
    }
  }, [isMitra, activeActor?.name]);

  useEffect(() => {
    if (!batchId && availableBatches[0]) {
      setBatchId(availableBatches[0].batchId);
    }
  }, [availableBatches, batchId]);

  const selectedBatch = availableBatches.find((b) => b.batchId === batchId);

  const openDetail = (id: string) => {
    if (onOpenTraceDetail) {
      onOpenTraceDetail(id);
    } else {
      onInspectTarget(id);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);
    setFormSuccess(null);

    const qty = parseInt(requestedCount, 10);
    if (!batchId) {
      setFormError('Pilih batch ecobrick terverifikasi yang tersedia.');
      return;
    }
    if (!requesterName.trim()) {
      setFormError('Nama pemohon atau lembaga wajib diisi.');
      return;
    }
    if (!utilizationDetail.trim()) {
      setFormError('Deskripsi kegiatan pemanfaatan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onCreateDistributionRequest({
        batchId,
        requesterId: isMitra ? activeActorId : undefined,
        requesterName: requesterName.trim(),
        requesterType,
        requestedCount: qty,
        utilizationCategory,
        location: location.trim() || undefined,
        neededDate: neededDate || undefined,
        utilizationDetail: utilizationDetail.trim(),
      });

      if (res.error) {
        setFormError(res.error);
        return;
      }

      setFormSuccess(
        `Pengajuan ${qty} unit dari batch ${batchId} berhasil dikirim (Menunggu Review).`
      );
      setUtilizationDetail('');
      setLocation('');
      setShowAdminCreateForm(false);
      if (selectedBatch) {
        const remaining = Math.max(1, selectedBatch.availableCount - qty);
        setRequestedCount(String(Math.min(5, remaining)));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const mitraRequests = state.distribution_requests.filter(
    (r) => r.requesterId === activeActorId
  );
  const scopedRequests = isMitra ? mitraRequests : state.distribution_requests;

  const q = searchQuery.trim().toLowerCase();
  const matchRequestQuery = (r: DistributionRequest) =>
    !q ||
    r.id.toLowerCase().includes(q) ||
    r.batchId.toLowerCase().includes(q) ||
    r.requesterName.toLowerCase().includes(q) ||
    (r.location ?? '').toLowerCase().includes(q) ||
    r.utilizationDetail.toLowerCase().includes(q);

  const pendingRequests = scopedRequests.filter(
    (r) => r.status === 'Pending Review' && matchRequestQuery(r)
  );
  const activeDistributions = scopedRequests.filter(
    (r) =>
      (r.status === 'Approved' || r.status === 'Handed Over') &&
      matchRequestQuery(r)
  );
  const historyRequests = scopedRequests.filter(
    (r) =>
      (r.status === 'Utilized' || r.status === 'Rejected') &&
      matchRequestQuery(r)
  );

  const scopedUtilizationRecords = (
    isMitra
      ? state.utilization_records.filter((u) =>
          mitraRequests.some((r) => r.id === u.requestId)
        )
      : state.utilization_records
  ).filter(
    (u) =>
      !q ||
      u.id.toLowerCase().includes(q) ||
      u.batchId.toLowerCase().includes(q) ||
      u.recipientName.toLowerCase().includes(q) ||
      u.purpose.toLowerCase().includes(q)
  );

  const filteredInventory = (
    activeSubTab === 'movement' ? inventory : availableBatches
  ).filter(
    (item) =>
      !q ||
      item.batchId.toLowerCase().includes(q) ||
      item.submissionId.toLowerCase().includes(q) ||
      item.contributorName.toLowerCase().includes(q) ||
      item.bottleSize.toLowerCase().includes(q)
  );

  const inventoryColumns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'batchId',
      header: 'Batch ID',
      render: (item) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(item.batchId);
            }}
            className="font-mono text-xs font-semibold text-[#245C45] hover:underline"
          >
            {item.batchId}
          </button>
          <p className="font-mono text-[11px] text-[#6B756F]">
            {item.submissionId}
          </p>
        </div>
      ),
    },
    {
      key: 'contributor',
      header: 'Kontributor Asal',
      render: (item) => (
        <div className="text-xs">
          <p className="font-medium text-[#252B28]">{item.contributorName}</p>
          <p className="text-[11px] text-[#6B756F]">{item.bottleSize}</p>
        </div>
      ),
    },
    {
      key: 'verifiedAt',
      header: 'Verified',
      align: 'right',
      render: (item) => (
        <span className="font-mono text-xs tabular-nums whitespace-nowrap">
          {item.totalVerifiedCount} unit
        </span>
      ),
    },
    {
      key: 'reserved',
      header: 'Reserved',
      align: 'right',
      render: (item) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {item.reservedCount}
        </span>
      ),
    },
    {
      key: 'distributed',
      header: 'Distributed',
      align: 'right',
      render: (item) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {item.distributedCount}
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Tersedia',
      align: 'right',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums whitespace-nowrap">
          {item.availableCount} unit
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusTag status={item.inventoryStatus} />,
    },
    {
      key: 'trace',
      header: 'Lacak',
      align: 'right',
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(item.batchId);
          }}
          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] transition-colors hover:bg-[#E7F0E8] active:scale-[0.985] whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>Lacak</span>
        </button>
      ),
    },
  ];

  const requestColumns: DataTableColumn<DistributionRequest>[] = [
    {
      key: 'id',
      header: 'Request / Batch',
      render: (r) => (
        <div className="space-y-0.5 whitespace-nowrap">
          <span className="font-mono text-xs font-semibold text-[#245C45]">
            {r.id}
          </span>
          <p className="font-mono text-[11px] text-[#6B756F]">{r.batchId}</p>
        </div>
      ),
    },
    {
      key: 'requester',
      header: 'Pemohon & Rencana Pemanfaatan',
      render: (r) => (
        <div className="max-w-xs text-xs">
          <p className="font-medium text-[#252B28]">{r.requesterName}</p>
          <p className="text-[11px] text-[#4F8A68]">
            {r.utilizationCategory}
            {r.location ? ` · ${r.location}` : ''}
          </p>
          <p className="mt-0.5 text-[11px] text-[#6B756F]">
            {r.utilizationDetail}
          </p>
          {r.neededDate && (
            <p className="font-mono text-[10px] text-[#6B756F]">
              Kebutuhan: {r.neededDate}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'count',
      header: 'Jumlah',
      align: 'right',
      render: (r) => (
        <span className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
          {r.requestedCount} unit
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusTag status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (r) => {
        const isOwnMitraRequest =
          isMitra && r.requesterId === activeActorId;

        if (isAdmin) {
          if (r.status === 'Pending Review') {
            return (
              <div
                className="inline-flex items-center justify-end gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <PrimaryButton
                  size="sm"
                  onClick={() => onUpdateDistributionStatus(r.id, 'Approved')}
                >
                  Setujui
                </PrimaryButton>
                <DangerButton
                  size="sm"
                  onClick={() => onUpdateDistributionStatus(r.id, 'Rejected')}
                >
                  Tolak
                </DangerButton>
              </div>
            );
          }
          if (r.status === 'Approved') {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <PrimaryButton
                  size="sm"
                  onClick={() =>
                    onUpdateDistributionStatus(
                      r.id,
                      'Handed Over',
                      r.requesterName,
                      'Serah terima fisik dicatat oleh Admin.'
                    )
                  }
                >
                  Catat Handover
                </PrimaryButton>
              </div>
            );
          }
          if (r.status === 'Handed Over') {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <PrimaryButton
                  size="sm"
                  onClick={() =>
                    onUpdateDistributionStatus(
                      r.id,
                      'Utilized',
                      r.receiverName ?? r.requesterName,
                      `Pemanfaatan aktual (${r.utilizationDetail}) telah didokumentasikan.`
                    )
                  }
                >
                  Konfirmasi Dimanfaatkan
                </PrimaryButton>
              </div>
            );
          }
        }

        if (isOwnMitraRequest && r.status === 'Handed Over') {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <PrimaryButton
                size="sm"
                onClick={() =>
                  onUpdateDistributionStatus(
                    r.id,
                    'Utilized',
                    r.receiverName ?? r.requesterName,
                    `Pemanfaatan aktual (${r.utilizationDetail}) dikonfirmasi oleh Mitra.`
                  )
                }
              >
                Konfirmasi Dimanfaatkan
              </PrimaryButton>
            </div>
          );
        }

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(r.batchId);
            }}
            className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] transition-colors hover:bg-[#E7F0E8] active:scale-[0.985] whitespace-nowrap"
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            <span>Lacak</span>
          </button>
        );
      },
    },
  ];

  const utilizationColumns: DataTableColumn<UtilizationRecord>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (u) => (
        <span className="font-mono text-xs font-semibold text-[#245C45] whitespace-nowrap">
          {u.id}
        </span>
      ),
    },
    {
      key: 'batch',
      header: 'Batch / Request',
      render: (u) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(u.batchId);
          }}
          className="font-mono text-xs text-[#245C45] hover:underline whitespace-nowrap"
        >
          {u.batchId} · {u.requestId}
        </button>
      ),
    },
    {
      key: 'recipient',
      header: 'Penerima & Lokasi',
      render: (u) => (
        <div className="text-xs">
          <p className="font-medium text-[#252B28]">{u.recipientName}</p>
          <p className="text-[11px] text-[#4F8A68]">
            {u.utilizationCategory}
            {u.location ? ` · ${u.location}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: 'Dokumentasi Pemanfaatan',
      render: (u) => (
        <div className="max-w-sm text-xs">
          <p className="text-[#252B28]">{u.purpose}</p>
          <p className="text-[11px] text-[#6B756F]">{u.documentationNote}</p>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Unit',
      align: 'right',
      render: (u) => (
        <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums whitespace-nowrap">
          {u.quantityUtilized} unit
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (u) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums whitespace-nowrap">
          {u.documentedAt}
        </span>
      ),
    },
  ];

  const renderRequestForm = () => {
    const parsedQty = Math.max(0, parseInt(requestedCount, 10) || 0);
    const availableCount = selectedBatch?.availableCount ?? 0;
    const totalVerified = selectedBatch?.totalVerifiedCount ?? 1;
    const remainingAfter = Math.max(0, availableCount - parsedQty);
    const stockPct = Math.round((availableCount / Math.max(1, totalVerified)) * 100);

    return (
      <section className="rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-4">
        <SectionHeader
          title="Form Pengajuan Ecobrick"
          description="Pilih batch ecobrick terverifikasi yang tersedia, jumlah unit, dan rencana pemanfaatan."
        />

        {formError && (
          <div
            role="alert"
            className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              id="dist-batch-select"
              label="Batch Inventori Tersedia"
              hint={
                selectedBatch
                  ? `Stok: ${selectedBatch.availableCount} unit`
                  : undefined
              }
            >
              <select
                id="dist-batch-select"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className={fieldInputClass}
              >
                {availableBatches.length === 0 ? (
                  <option value="">Tidak ada stok batch tersedia</option>
                ) : (
                  availableBatches.map((item) => (
                    <option key={item.batchId} value={item.batchId}>
                      {item.batchId} · Tersedia {item.availableCount} unit (
                      {item.bottleSize})
                    </option>
                  ))
                )}
              </select>
            </FormField>

            <FormField id="requested-count" label="Jumlah (Unit)">
              <div className="space-y-2">
                <input
                  id="requested-count"
                  type="number"
                  min={1}
                  max={selectedBatch?.availableCount ?? 999}
                  step={1}
                  required
                  value={requestedCount}
                  onChange={(e) => setRequestedCount(e.target.value)}
                  className={fieldInputClass}
                />
                {selectedBatch && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[5, 10].map((preset) =>
                      preset <= selectedBatch.availableCount ? (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRequestedCount(String(preset))}
                          className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                            parsedQty === preset
                              ? 'border-[#245C45] bg-[#E7F0E8] text-[#245C45]'
                              : 'border-[#E3E8E4] bg-white text-[#6B756F] hover:text-[#252B28]'
                          }`}
                        >
                          {preset} unit
                        </button>
                      ) : null
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setRequestedCount(String(selectedBatch.availableCount))
                      }
                      className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                        parsedQty === selectedBatch.availableCount
                          ? 'border-[#245C45] bg-[#E7F0E8] text-[#245C45]'
                          : 'border-[#E3E8E4] bg-white text-[#6B756F] hover:text-[#252B28]'
                      }`}
                    >
                      Semua ({selectedBatch.availableCount})
                    </button>
                  </div>
                )}
              </div>
            </FormField>

            <FormField id="needed-date" label="Tanggal Kebutuhan">
              <input
                id="needed-date"
                type="date"
                required
                value={neededDate}
                onChange={(e) => setNeededDate(e.target.value)}
                className={fieldInputClass}
              />
            </FormField>
          </div>

          {selectedBatch && (
            <div className="border-t border-b border-[#EEF2EF] py-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#6B756F]">
                  Ketersediaan{' '}
                  <strong className="font-mono text-[#252B28]">
                    {selectedBatch.batchId}
                  </strong>{' '}
                  ({selectedBatch.bottleSize})
                </span>
                <span className="font-mono text-[11px] text-[#245C45] tabular-nums">
                  {availableCount} / {totalVerified} unit tersedia ({stockPct}%)
                  · Sisa setelah diajukan: {remainingAfter} unit
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF2EF]">
                <div
                  className="h-full rounded-full bg-[#4F8A68] transition-all duration-150"
                  style={{ width: `${stockPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField id="requester-name" label="Nama Pemohon / Lembaga">
              <input
                id="requester-name"
                type="text"
                required
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Contoh: Sanggar Bambu Krajan"
                className={fieldInputClass}
              />
            </FormField>

            <FormField id="requester-type" label="Kategori Pemohon">
              <select
                id="requester-type"
                value={requesterType}
                onChange={(e) =>
                  setRequesterType(e.target.value as RequesterType)
                }
                className={fieldInputClass}
              >
                {REQUESTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="utilization-category" label="Tujuan Penggunaan">
              <select
                id="utilization-category"
                value={utilizationCategory}
                onChange={(e) =>
                  setUtilizationCategory(e.target.value as UtilizationCategory)
                }
                className={fieldInputClass}
              >
                {UTILIZATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="utilization-location" label="Lokasi Pemanfaatan">
              <input
                id="utilization-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Taman Baca RW 03"
                className={fieldInputClass}
              />
            </FormField>
          </div>

          <FormField id="utilization-detail" label="Deskripsi Kegiatan">
            <textarea
              id="utilization-detail"
              rows={2}
              required
              value={utilizationDetail}
              onChange={(e) => setUtilizationDetail(e.target.value)}
              placeholder="Contoh: Perakitan 2 modul meja baca komunitas dari ecobrick 600 ml."
              className={fieldInputClass}
            />
          </FormField>

          <div className="flex justify-end">
            <PrimaryButton
              type="submit"
              disabled={availableBatches.length === 0}
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kirim Pengajuan</span>
            </PrimaryButton>
          </div>
        </form>
      </section>
    );
  };

  const renderSearchBar = (placeholder: string) => (
    <div className="relative w-full sm:w-64">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6B756F]"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-[#CFD8D2] bg-white py-1.5 pr-3 pl-8 text-xs text-[#252B28] placeholder:text-[#8A948E] transition-colors focus:border-[#245C45] focus:outline-none"
      />
    </div>
  );

  const renderRequestCardsAndTable = (
    rows: DistributionRequest[],
    emptyMsg: string
  ) => (
    <>
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-md border border-[#E3E8E4] bg-white p-6 text-center text-xs text-[#6B756F]">
            {emptyMsg}
          </div>
        ) : (
          rows.map((r) => {
            const isOwnMitraRequest =
              isMitra && r.requesterId === activeActorId;
            return (
              <div
                key={r.id}
                className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#245C45]">
                      {r.id} · {r.batchId}
                    </p>
                    <p className="text-xs font-medium text-[#252B28]">
                      {r.requesterName}
                    </p>
                    <p className="text-[11px] text-[#4F8A68]">
                      {r.utilizationCategory}
                      {r.location ? ` · ${r.location}` : ''}
                    </p>
                  </div>
                  <StatusTag status={r.status} />
                </div>

                <p className="text-xs text-[#6B756F]">{r.utilizationDetail}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2EF] pt-2">
                  <span className="font-mono text-xs font-semibold text-[#252B28]">
                    {r.requestedCount} unit
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isAdmin && r.status === 'Pending Review' && (
                      <>
                        <PrimaryButton
                          size="sm"
                          onClick={() =>
                            onUpdateDistributionStatus(r.id, 'Approved')
                          }
                        >
                          Setujui
                        </PrimaryButton>
                        <DangerButton
                          size="sm"
                          onClick={() =>
                            onUpdateDistributionStatus(r.id, 'Rejected')
                          }
                        >
                          Tolak
                        </DangerButton>
                      </>
                    )}
                    {isAdmin && r.status === 'Approved' && (
                      <PrimaryButton
                        size="sm"
                        onClick={() =>
                          onUpdateDistributionStatus(
                            r.id,
                            'Handed Over',
                            r.requesterName,
                            'Serah terima fisik dicatat oleh Admin.'
                          )
                        }
                      >
                        Catat Handover
                      </PrimaryButton>
                    )}
                    {(isAdmin || isOwnMitraRequest) &&
                      r.status === 'Handed Over' && (
                        <PrimaryButton
                          size="sm"
                          onClick={() =>
                            onUpdateDistributionStatus(
                              r.id,
                              'Utilized',
                              r.receiverName ?? r.requesterName,
                              `Pemanfaatan aktual (${r.utilizationDetail}) telah didokumentasikan.`
                            )
                          }
                        >
                          Konfirmasi Dimanfaatkan
                        </PrimaryButton>
                      )}
                    <SecondaryButton
                      size="sm"
                      onClick={() => openDetail(r.batchId)}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Lacak</span>
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <DataTable
          columns={requestColumns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => openDetail(r.batchId)}
          emptyMessage={emptyMsg}
        />
      </div>
    </>
  );

  // 1. ADMIN INVENTORI
  if (pageMode === 'inventory') {
    const invTab = activeSubTab === 'movement' ? 'movement' : 'available';
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventori"
          description="Stok ecobrick terverifikasi di Community Hub (hanya menghitung unit yang lolos inspeksi fisik)."
        />

        <MetricStrip
          columns={4}
          items={[
            {
              label: 'Total Terverifikasi',
              value: `${metrics.ecobricksVerifiedCount} unit`,
              hint: `${state.ecobrick_batches.length} batch resmi`,
            },
            {
              label: 'Tersedia',
              value: `${metrics.inventoryAvailableCount} unit`,
              hint: `${availableBatches.length} batch siap pakai`,
              accent: 'primary',
            },
            {
              label: 'Direservasi',
              value: `${metrics.ecobricksReservedCount} unit`,
              hint: 'Disetujui menunggu serah terima',
            },
            {
              label: 'Didistribusikan',
              value: `${metrics.ecobricksDistributedCount} unit`,
              hint: `${metrics.ecobricksUtilizedCount} unit dimanfaatkan`,
              accent: 'primary',
            },
          ]}
        />

        <SubNavTabs
          ariaLabel="Submenu Inventori"
          activeId={invTab}
          onChange={onChangeSubTab}
          items={[
            {
              id: 'available',
              label: 'Ecobrick Tersedia',
              badge: availableBatches.length,
            },
            {
              id: 'movement',
              label: 'Pergerakan Inventori',
              badge: inventory.length,
            },
          ]}
        />

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader
              title={
                invTab === 'available'
                  ? 'Batch Ecobrick Tersedia'
                  : 'Alokasi & Pergerakan per Batch'
              }
            />
            {renderSearchBar('Cari Batch ID atau kontributor...')}
          </div>

          {/* Mobile Cards (< md) */}
          <div className="space-y-3 md:hidden">
            {filteredInventory.map((item) => (
              <div
                key={item.batchId}
                className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#245C45]">
                      {item.batchId}
                    </p>
                    <p className="text-xs font-medium text-[#252B28]">
                      {item.contributorName} · {item.bottleSize}
                    </p>
                  </div>
                  <StatusTag status={item.inventoryStatus} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2EF] pt-2 text-xs">
                  <span className="font-mono text-[#245C45] font-semibold">
                    Tersedia: {item.availableCount} / {item.totalVerifiedCount}{' '}
                    unit
                  </span>
                  <SecondaryButton
                    size="sm"
                    onClick={() => openDetail(item.batchId)}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Lacak</span>
                  </SecondaryButton>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <DataTable
              columns={inventoryColumns}
              rows={filteredInventory}
              rowKey={(item) => item.batchId}
              onRowClick={(item) => openDetail(item.batchId)}
              emptyMessage="Tidak ada batch ecobrick terverifikasi yang cocok."
            />
          </div>
        </section>
      </div>
    );
  }

  // 2. MITRA PERMINTAAN
  if (pageMode === 'requests') {
    const reqTab = activeSubTab === 'history' ? 'history' : 'new';
    return (
      <div className="space-y-6">
        <PageHeader
          title="Permintaan"
          description="Ajukan permintaan ecobrick terverifikasi dari inventori Community Hub dan pantau progres persetujuan."
        />

        <MetricStrip
          columns={3}
          items={[
            {
              label: 'Batch Tersedia di Hub',
              value: `${metrics.inventoryAvailableCount} unit`,
              hint: `${availableBatches.length} batch siap diajukan`,
              accent: 'primary',
            },
            {
              label: 'Menunggu Review',
              value: `${pendingRequests.length} pengajuan`,
              hint: 'Ditinjau oleh Admin Community Hub',
            },
            {
              label: 'Total Pengajuan Saya',
              value: `${mitraRequests.length} berkas`,
              hint: `${activeDistributions.length} dalam proses distribusi`,
            },
          ]}
        />

        <SubNavTabs
          ariaLabel="Submenu Permintaan Mitra"
          activeId={reqTab}
          onChange={(t) => {
            setFormSuccess(null);
            onChangeSubTab(t);
          }}
          items={[
            { id: 'new', label: 'Pengajuan Baru' },
            {
              id: 'history',
              label: 'Riwayat Pengajuan',
              badge: mitraRequests.length,
            },
          ]}
        />

        {formSuccess && (
          <div
            role="status"
            className="flex items-start justify-between gap-2 rounded-md border border-[#C6DBC9] bg-[#E7F0E8] px-4 py-3 text-xs font-medium text-[#245C45]"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
            {reqTab === 'new' && (
              <SecondaryButton
                size="sm"
                onClick={() => onChangeSubTab('history')}
              >
                Lihat Riwayat
              </SecondaryButton>
            )}
          </div>
        )}

        {reqTab === 'new' ? (
          renderRequestForm()
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              {renderSearchBar('Cari pengajuan atau Batch ID...')}
            </div>
            {renderRequestCardsAndTable(
              mitraRequests.filter(matchRequestQuery),
              'Anda belum memiliki pengajuan permintaan ecobrick.'
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. MITRA DISTRIBUSI
  if (isMitra) {
    const distTab = activeSubTab === 'history' ? 'history' : 'active';
    return (
      <div className="space-y-6">
        <PageHeader
          title="Distribusi"
          description="Pantau pengiriman aktif dan dokumentasikan pemanfaatan nyata ecobrick di proyek mitra."
        />

        <SubNavTabs
          ariaLabel="Submenu Distribusi Mitra"
          activeId={distTab}
          onChange={onChangeSubTab}
          items={[
            {
              id: 'active',
              label: 'Distribusi Aktif',
              badge: activeDistributions.length,
            },
            {
              id: 'history',
              label: 'Riwayat Distribusi',
              badge: scopedUtilizationRecords.length,
            },
          ]}
        />

        {distTab === 'active' ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader
                title="Distribusi Disetujui & Dalam Serah Terima"
                description="Konfirmasi 'Dimanfaatkan' setelah ecobrick terpasang/digunakan di lokasi proyek."
              />
              {renderSearchBar('Cari request atau Batch ID...')}
            </div>
            {renderRequestCardsAndTable(
              activeDistributions,
              'Belum ada distribusi aktif saat ini.'
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader title="Dokumentasi Pemanfaatan Mitra" />
              {renderSearchBar('Cari proyek atau Batch ID...')}
            </div>
            <DataTable
              columns={utilizationColumns}
              rows={scopedUtilizationRecords}
              rowKey={(u) => u.id}
              onRowClick={(u) => openDetail(u.batchId)}
              emptyMessage="Belum ada dokumentasi pemanfaatan mitra yang selesai."
            />
          </section>
        )}
      </div>
    );
  }

  // 4. ADMIN DISTRIBUSI
  const adminDistTab =
    activeSubTab === 'active' || activeSubTab === 'history'
      ? activeSubTab
      : 'requests';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribusi"
        description="Alur pengajuan, persetujuan, serah terima fisik, hingga dokumentasi pemanfaatan ecobrick."
      />

      <SubNavTabs
        ariaLabel="Submenu Distribusi Admin"
        activeId={adminDistTab}
        onChange={onChangeSubTab}
        items={[
          {
            id: 'requests',
            label: 'Pengajuan',
            badge: pendingRequests.length,
          },
          {
            id: 'active',
            label: 'Distribusi Berjalan',
            badge: activeDistributions.length,
          },
          {
            id: 'history',
            label: 'Riwayat Distribusi',
            badge: state.utilization_records.length,
          },
        ]}
      />

      {formSuccess && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-[#C6DBC9] bg-[#E7F0E8] px-4 py-3 text-xs font-medium text-[#245C45]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {adminDistTab === 'requests' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              title="Pengajuan Permintaan Ecobrick"
              description="Tinjau permintaan masuk dari pesantren, komunitas, dan mitra."
            />
            <div className="flex flex-wrap items-center gap-2">
              {renderSearchBar('Cari pemohon atau Batch ID...')}
              <PrimaryButton
                size="sm"
                onClick={() => setShowAdminCreateForm((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {showAdminCreateForm ? 'Tutup Form' : 'Buat Pengajuan'}
                </span>
              </PrimaryButton>
            </div>
          </div>

          {showAdminCreateForm && renderRequestForm()}

          {renderRequestCardsAndTable(
            pendingRequests,
            'Tidak ada pengajuan baru yang menunggu review.'
          )}
        </section>
      )}

      {adminDistTab === 'active' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader
              title="Distribusi Berjalan"
              description="Catat serah terima (Handover) dan konfirmasi saat ecobrick selesai dimanfaatkan."
            />
            {renderSearchBar('Cari pemohon atau Batch ID...')}
          </div>
          {renderRequestCardsAndTable(
            activeDistributions,
            'Tidak ada distribusi berjalan saat ini.'
          )}
        </section>
      )}

      {adminDistTab === 'history' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHeader title="Dokumentasi Pemanfaatan Aktual" />
              {renderSearchBar('Cari penerima, proyek, atau Batch ID...')}
            </div>
            <DataTable
              columns={utilizationColumns}
              rows={scopedUtilizationRecords}
              rowKey={(u) => u.id}
              onRowClick={(u) => openDetail(u.batchId)}
              emptyMessage="Belum ada dokumentasi pemanfaatan yang selesai."
            />
          </section>

          {historyRequests.length > 0 && (
            <section className="space-y-3">
              <SectionHeader title="Arsip Pengajuan Selesai / Ditolak" />
              {renderRequestCardsAndTable(
                historyRequests,
                'Belum ada arsip pengajuan selesai atau ditolak.'
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
