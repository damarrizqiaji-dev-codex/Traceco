import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, Send } from 'lucide-react';
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

interface EcoDistributionPageProps {
  state: TracecoState;
  viewMode?: 'inventory' | 'distribution' | 'my_requests' | 'utilization';
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
  }) => { error?: string };
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
  viewMode = 'distribution',
  onCreateDistributionRequest,
  onUpdateDistributionStatus,
  onInspectTarget,
  onOpenTraceDetail,
}: EcoDistributionPageProps) {
  const isAdmin = isAdminRole(state.activeRole);
  const isMitra = isMitraRole(state.activeRole);
  const activeActorId = state.activeActorIdByRole[state.activeRole];
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
  const [neededDate, setNeededDate] = useState('2026-11-26');
  const [utilizationDetail, setUtilizationDetail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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

  const selectedBatch = availableBatches.find((b) => b.batchId === batchId);

  const openDetail = (id: string) => {
    if (onOpenTraceDetail) {
      onOpenTraceDetail(id);
    } else {
      onInspectTarget(id);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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

    const res = onCreateDistributionRequest({
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
      `Permintaan ${qty} unit dari batch ${batchId} berhasil dikirim (Pending Review).`
    );
    setUtilizationDetail('');
    setLocation('');
    if (selectedBatch) {
      const remaining = Math.max(1, selectedBatch.availableCount - qty);
      setRequestedCount(String(Math.min(5, remaining)));
    }
  };

  const inventoryColumns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'batchId',
      header: 'Batch ID',
      render: (item) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => openDetail(item.batchId)}
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
      header: 'Available',
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
          onClick={() => openDetail(item.batchId)}
          className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] hover:bg-[#E7F0E8] transition-colors whitespace-nowrap"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span>Trace</span>
        </button>
      ),
    },
  ];

  const requestRows =
    viewMode === 'my_requests' && isMitra
      ? state.distribution_requests.filter(
          (r) =>
            r.requesterId === activeActorId ||
            r.requesterType === 'Mitra Pemanfaat'
        )
      : state.distribution_requests;

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
      header: 'Alur Persetujuan & Handover',
      align: 'right',
      render: (r) => {
        const isOwnMitraRequest =
          isMitra &&
          (r.requesterId === activeActorId ||
            r.requesterType === 'Mitra Pemanfaat');

        if (isAdmin) {
          if (r.status === 'Pending Review') {
            return (
              <div className="inline-flex items-center justify-end gap-1.5">
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
            );
          }
          if (r.status === 'Handed Over') {
            return (
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
                Konfirmasi Utilized
              </PrimaryButton>
            );
          }
          return (
            <span className="font-mono text-[11px] text-[#6B756F]">
              {r.handoverDate ?? r.requestedAt}
            </span>
          );
        }

        if (isOwnMitraRequest && r.status === 'Handed Over') {
          return (
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
              Konfirmasi Utilized
            </PrimaryButton>
          );
        }

        return (
          <span className="font-mono text-[11px] text-[#6B756F]">
            {r.handoverDate ? `Handover: ${r.handoverDate}` : r.requestedAt}
          </span>
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
        <span className="font-mono text-xs text-[#6B756F] whitespace-nowrap">
          {u.batchId} · {u.requestId}
        </span>
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
      header: 'Utilized',
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

  const pageTitle =
    viewMode === 'inventory'
      ? 'Verified Ecobrick Inventory'
      : viewMode === 'my_requests'
        ? 'My Ecobrick Requests'
        : viewMode === 'utilization'
          ? 'Utilization Documentation'
          : isMitra
            ? 'Request Ecobrick & Inventory'
            : 'Distribution & Utilization';

  const pageDesc =
    viewMode === 'inventory'
      ? 'Stok ecobrick terverifikasi di Community Hub (hanya menghitung unit yang lolos inspeksi fisik).'
      : viewMode === 'my_requests'
        ? 'Pantau status permintaan ecobrick Anda mulai dari pengajuan hingga serah terima dan konfirmasi pemanfaatan.'
        : viewMode === 'utilization'
          ? 'Catatan resmi pemanfaatan aktual ecobrick di fasilitas pesantren, komunitas, dan proyek mitra.'
          : 'Alur pengajuan, persetujuan Admin, serah terima, dan pemanfaatan ecobrick terverifikasi.';

  const showInventory = viewMode === 'inventory' || viewMode === 'distribution';
  const showRequestForm = viewMode === 'distribution';
  const showRequestsTable =
    viewMode === 'distribution' || viewMode === 'my_requests';
  const showUtilizationTable =
    viewMode === 'distribution' || viewMode === 'utilization';

  return (
    <div className="space-y-7">
      <PageHeader title={pageTitle} description={pageDesc} />

      <MetricStrip
        columns={5}
        items={[
          {
            label: 'Total Verified',
            value: `${metrics.ecobricksVerifiedCount} unit`,
            hint: `${state.ecobrick_batches.length} batch resmi`,
          },
          {
            label: 'Available',
            value: `${metrics.inventoryAvailableCount} unit`,
            hint: `${availableBatches.length} batch tersedia`,
            accent: 'primary',
          },
          {
            label: 'Reserved',
            value: `${metrics.ecobricksReservedCount} unit`,
            hint: 'Disetujui menunggu serah terima',
          },
          {
            label: 'Distributed',
            value: `${metrics.ecobricksDistributedCount} unit`,
            hint: 'Sudah diserahterimakan',
          },
          {
            label: 'Utilized',
            value: `${metrics.ecobricksUtilizedCount} unit`,
            hint: `${state.utilization_records.length} catatan selesai`,
            accent: 'primary',
          },
        ]}
      />

      {showInventory && (
        <section className="space-y-3">
          <SectionHeader
            title="Inventori Ecobrick Terverifikasi"
            description="Stok inventori hanya bersumber dari unit yang lolos verifikasi fisik dan memiliki Batch ID."
          />
          <DataTable
            columns={inventoryColumns}
            rows={inventory}
            rowKey={(item) => item.batchId}
            emptyMessage="Belum ada batch ecobrick terverifikasi."
          />
        </section>
      )}

      {showRequestForm && (
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 sm:p-6 space-y-4">
          <SectionHeader
            title="Form Pengajuan Permintaan Ecobrick (Request Ecobrick)"
            description="Isi batch, jumlah unit, tujuan penggunaan, lokasi, tanggal kebutuhan, dan deskripsi kegiatan."
          />

          {formError && (
            <div
              role="alert"
              className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
            >
              {formError}
            </div>
          )}

          {formSuccess && (
            <div
              role="status"
              className="flex items-start gap-2 rounded border border-[#C6DBC9] bg-[#E7F0E8] px-3.5 py-2.5 text-xs font-medium text-[#245C45]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formSuccess}</span>
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
                        {item.batchId} · Tersedia {item.availableCount} unit
                      </option>
                    ))
                  )}
                </select>
              </FormField>

              <FormField id="requested-count" label="Jumlah (Unit)">
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
                    setUtilizationCategory(
                      e.target.value as UtilizationCategory
                    )
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
                <span>Kirim Permintaan Ecobrick</span>
              </PrimaryButton>
            </div>
          </form>
        </section>
      )}

      {showRequestsTable && (
        <section className="space-y-3">
          <SectionHeader
            title={
              viewMode === 'my_requests'
                ? 'Daftar Permintaan Saya'
                : 'Alur Permintaan Distribusi & Serah Terima'
            }
            description="Review -> Approve -> Handover -> Utilization Record."
          />
          <DataTable
            columns={requestColumns}
            rows={requestRows}
            rowKey={(r) => r.id}
            emptyMessage="Belum ada permintaan distribusi tercatat."
          />
        </section>
      )}

      {showUtilizationTable && (
        <section className="space-y-3">
          <SectionHeader
            title="Dokumentasi Pemanfaatan Aktual (Utilization Records)"
          />
          <DataTable
            columns={utilizationColumns}
            rows={state.utilization_records}
            rowKey={(u) => u.id}
            emptyMessage="Belum ada dokumentasi pemanfaatan yang selesai."
          />
        </section>
      )}
    </div>
  );
}
