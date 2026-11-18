import { useState } from 'react';
import { Check, Lock, LogOut, RotateCcw } from 'lucide-react';
import type {
  AppPageId,
  EcobrickSubmission,
  TracecoState,
  UserAccount,
} from '../types/traceco';
import { computeContributorPointsBalance } from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

export function ProfilePage({
  state,
  currentUser,
  onNavigate,
  onLogout,
}: {
  state: TracecoState;
  currentUser: UserAccount;
  onNavigate: (page: AppPageId) => void;
  onLogout: () => void;
}) {
  const actorId = currentUser.id;
  const points = computeContributorPointsBalance(state, actorId);
  const actorSubmissions = state.ecobrick_submissions.filter(
    (s) => s.contributorId === actorId
  );

  const submissionColumns: DataTableColumn<EcobrickSubmission>[] = [
    {
      key: 'submissionId',
      header: 'Submission ID',
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-[#245C45]">
          {s.submissionId}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (s) => (
        <span className="font-mono text-xs text-[#6B756F] tabular-nums">
          {s.date}
        </span>
      ),
    },
    {
      key: 'dropoff',
      header: 'Pos Serah',
      render: (s) => (
        <span className="text-xs text-[#252B28]">{s.dropoffPointName}</span>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs tabular-nums">
          {s.quantitySubmitted} unit
        </span>
      ),
    },
    {
      key: 'verified',
      header: 'Verified',
      align: 'right',
      render: (s) => (
        <span className="font-mono text-xs font-medium text-[#245C45] tabular-nums">
          {s.verifiedQuantity} unit
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusTag status={s.status} />,
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={currentUser.name}
        description={`${currentUser.email} · ${currentUser.unitOrAddress} · Terdaftar sejak ${currentUser.registeredAt}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RoleTag role={currentUser.role} />
            <SecondaryButton size="sm" onClick={() => onNavigate('settings')}>
              Pengaturan
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keluar / Ganti Akun</span>
            </SecondaryButton>
          </div>
        }
      />

      <MetricStrip
        columns={3}
        items={[
          {
            label: 'Submission Tercatat (Akun Ini)',
            value: `${actorSubmissions.length} berkas`,
            hint: `${actorSubmissions.reduce((s, r) => s + r.verifiedQuantity, 0)} unit terverifikasi`,
          },
          {
            label: 'Saldo Green Points',
            value: `${points.balance} pts`,
            hint: 'Diperoleh dari kontribusi ecobrick terverifikasi',
            accent: 'primary',
          },
          {
            label: 'Peran Terdaftar',
            value: currentUser.role,
            hint: `Preview aktif saat ini: ${state.activeRole}`,
          },
        ]}
      />

      <section className="space-y-3">
        <SectionHeader
          title={`Riwayat Submission Ecobrick (${currentUser.name})`}
        />
        <DataTable
          columns={submissionColumns}
          rows={actorSubmissions}
          rowKey={(s) => s.submissionId}
          emptyMessage="Akun ini belum memiliki catatan penyerahan ecobrick pribadi."
        />
      </section>
    </div>
  );
}

export function NotificationsPage({
  state,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: {
  state: TracecoState;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (page: AppPageId) => void;
}) {
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Notifications"
        description="Pembaruan otomatis dari penyerahan ecobrick, verifikasi fisik, Green Reward, dan distribusi."
        actions={
          unreadCount > 0 && (
            <SecondaryButton size="sm" onClick={onMarkAllRead}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tandai Semua Dibaca ({unreadCount})</span>
            </SecondaryButton>
          )
        }
      />

      <section className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
        {state.notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex flex-wrap items-start justify-between gap-4 p-4 sm:px-5 ${
              notif.read ? 'bg-white' : 'bg-[#E7F0E8]/30'
            }`}
          >
            <div className="max-w-2xl space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-[#252B28]">
                  {notif.title}
                </span>
                {!notif.read && <StatusTag status="Pending" />}
              </div>
              <p className="text-xs text-[#6B756F]">{notif.detail}</p>
              <p className="font-mono text-[11px] text-[#6B756F] tabular-nums">
                {notif.timestamp} · {notif.category}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SecondaryButton
                size="sm"
                onClick={() => onNavigate(notif.targetPage)}
              >
                Buka Halaman
              </SecondaryButton>
              {!notif.read && (
                <PrimaryButton size="sm" onClick={() => onMarkRead(notif.id)}>
                  Tandai Dibaca
                </PrimaryButton>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function SettingsPage({
  currentUser,
  onLogout,
  onResetSimulation,
}: {
  currentUser: UserAccount;
  onLogout: () => void;
  onResetSimulation: () => void;
}) {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = () => {
    onResetSimulation();
    setResetDone(true);
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Settings"
        description="Informasi peran akun terdaftar, preferensi notifikasi, dan pengaturan ulang data operasional."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4">
          <SectionHeader
            title="Akun & Hak Akses Peran"
            description="Peran akun ditetapkan saat pendaftaran. Gunakan Prototype Role Preview di bilah atas untuk meninjau peran lain."
          />

          <div className="rounded border border-[#E3E8E4] bg-[#F7F9F7] p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#252B28]">
                  {currentUser.name}
                </p>
                <p className="font-mono text-[11px] text-[#6B756F]">
                  {currentUser.email}
                </p>
              </div>
              <RoleTag role={currentUser.role} />
            </div>
            <div className="flex items-start gap-2 border-t border-[#E3E8E4] pt-2 text-[11px] text-[#6B756F]">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#245C45]" />
              <span>
                Peran permanen dipilih saat mendaftar. Fitur{' '}
                <strong>Prototype Role Preview</strong> pada header atas
                memungkinkan peninjauan seluruh 6 peran ekosistem TRACECO
                (Santri, Warga, Keluarga Rentan, Relawan / Verifikator, Admin
                Pesantren, dan Mitra / Pemanfaat).
              </span>
            </div>
          </div>

          <label className="flex items-center justify-between rounded border border-[#E3E8E4] bg-[#F7F9F7] px-3.5 py-2.5 text-xs text-[#252B28] cursor-pointer">
            <span>Tampilkan notifikasi perubahan status submission & batch</span>
            <input
              type="checkbox"
              checked={notifEnabled}
              onChange={(e) => setNotifEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#245C45]"
            />
          </label>

          <div>
            <SecondaryButton size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keluar untuk Masuk Akun Lain</span>
            </SecondaryButton>
          </div>
        </section>

        <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4">
          <SectionHeader
            title="Reset Data Operasional"
            description="Mengembalikan data submission, verifikasi, saldo poin, distribusi, dan pemanfaatan ke kondisi awal."
          />

          {resetDone && (
            <p className="rounded border border-[#C6DBC9] bg-[#E7F0E8] px-3 py-2 text-xs font-medium text-[#245C45]">
              Data operasional berhasil dikembalikan ke kondisi awal.
            </p>
          )}

          <SecondaryButton onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset ke Data Awal</span>
          </SecondaryButton>
        </section>
      </div>
    </div>
  );
}
