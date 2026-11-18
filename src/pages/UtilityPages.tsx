import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  Lock,
  LogOut,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import type {
  AppPageId,
  CollaborationPartner,
  CommunityActivity,
  CommunityPostCategory,
  TracecoState,
  UserAccount,
} from '../types/traceco';
import {
  computeContributorPointsBalance,
  computeContributorStats,
  isMitraRole,
  isPenyerahRole,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';
import { SubNavTabs } from '../components/ui/SubNavTabs';
import { CommunityHubPage } from './CommunityHubPage';

export function ProfilePage({
  state,
  currentUser,
  activeSubTab = 'profil',
  onChangeSubTab = () => {},
  onNavigate,
  onLogout,
  onToggleJoinActivity,
  onCreateActivity,
  onUpdateActivityStatus,
  onCreatePost,
  onReplyPost,
  onTogglePostStatus,
  onCreateCollaboration,
  onUpdateCollaborationStatus,
}: {
  state: TracecoState;
  currentUser: UserAccount;
  activeSubTab?: string;
  onChangeSubTab?: (sub: string) => void;
  onNavigate: (page: AppPageId, sub?: string) => void;
  onLogout: () => void;
  onToggleJoinActivity?: (activityId: string) => {
    joined: boolean;
    error?: string;
  };
  onCreateActivity?: (payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
  }) => { error?: string };
  onUpdateActivityStatus?: (
    activityId: string,
    status: CommunityActivity['status']
  ) => void;
  onCreatePost?: (payload: {
    category: CommunityPostCategory;
    title: string;
    body: string;
  }) => { error?: string };
  onReplyPost?: (postId: string, body: string) => { error?: string };
  onTogglePostStatus?: (postId: string) => void;
  onCreateCollaboration?: (payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
  }) => { error?: string };
  onUpdateCollaborationStatus?: (
    collaborationId: string,
    status: CollaborationPartner['status']
  ) => void;
}) {
  const actorId = state.activeActorIdByRole[state.activeRole];
  const actorProfile =
    state.contributors.find((c) => c.id === actorId) ?? currentUser;
  const isKontributor = isPenyerahRole(state.activeRole);
  const isMitra = isMitraRole(state.activeRole);
  const unreadNotifs = state.notifications.filter((n) => !n.read).length;

  const stats = computeContributorStats(state, actorId);
  const actorSubmissionsCount = state.ecobrick_submissions.filter(
    (s) => s.contributorId === actorId
  ).length;
  const points = computeContributorPointsBalance(state, actorId);

  const mitraRequests = state.distribution_requests.filter(
    (r) => r.requesterId === actorId || r.requesterType === 'Mitra Pemanfaat'
  );
  const mitraUtilizedUnits = mitraRequests
    .filter((r) => r.status === 'Utilized')
    .reduce((s, r) => s + r.requestedCount, 0);

  const currentTab =
    isMitra && activeSubTab === 'community' ? 'community' : 'profil';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description={`${actorProfile.name} · ${actorProfile.unitOrAddress}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RoleTag role={state.activeRole} />
            <SecondaryButton
              size="sm"
              onClick={() => onNavigate('notifications')}
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Notifikasi{unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}
              </span>
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </SecondaryButton>
          </div>
        }
      />

      {isMitra && (
        <SubNavTabs
          ariaLabel="Submenu Profil Mitra"
          activeId={currentTab}
          onChange={onChangeSubTab}
          items={[
            { id: 'profil', label: 'Identitas Mitra' },
            {
              id: 'community',
              label: 'Komunitas & Kolaborasi',
              badge: state.collaborations.length,
            },
          ]}
        />
      )}

      {currentTab === 'community' &&
      isMitra &&
      onToggleJoinActivity &&
      onCreateActivity &&
      onUpdateActivityStatus &&
      onCreatePost &&
      onReplyPost &&
      onTogglePostStatus &&
      onCreateCollaboration &&
      onUpdateCollaborationStatus ? (
        <CommunityHubPage
          state={state}
          embedded
          onNavigate={(page) => onNavigate(page)}
          onToggleJoinActivity={onToggleJoinActivity}
          onCreateActivity={onCreateActivity}
          onUpdateActivityStatus={onUpdateActivityStatus}
          onCreatePost={onCreatePost}
          onReplyPost={onReplyPost}
          onTogglePostStatus={onTogglePostStatus}
          onCreateCollaboration={onCreateCollaboration}
          onUpdateCollaborationStatus={onUpdateCollaborationStatus}
        />
      ) : (
        <div className="space-y-6">
          {isKontributor ? (
            <MetricStrip
              columns={3}
              items={[
                {
                  label: 'Total Kontribusi',
                  value: `${stats.verifiedUnits} unit`,
                  hint: `${actorSubmissionsCount} submission tercatat`,
                  accent: 'primary',
                },
                {
                  label: 'Saldo Green Points',
                  value: `${points.balance} GP`,
                  hint: 'Tersedia untuk ditukar di Marketplace',
                  accent: 'primary',
                },
                {
                  label: 'Segmen Kontributor',
                  value:
                    'segment' in actorProfile && actorProfile.segment
                      ? actorProfile.segment
                      : 'Kontributor',
                  hint: `Terdaftar: ${currentUser.registeredAt}`,
                },
              ]}
            />
          ) : (
            <MetricStrip
              columns={3}
              items={[
                {
                  label: 'Total Pengajuan Mitra',
                  value: `${mitraRequests.length} berkas`,
                  hint: 'Permintaan ecobrick terverifikasi',
                },
                {
                  label: 'Ecobrick Dimanfaatkan',
                  value: `${mitraUtilizedUnits} unit`,
                  hint: 'Terdokumentasi pada proyek mitra',
                  accent: 'primary',
                },
                {
                  label: 'Peran Ekosistem',
                  value: state.activeRole,
                  hint: `Akun login: ${currentUser.email}`,
                },
              ]}
            />
          )}

          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-4">
            <SectionHeader
              title="Informasi Akun"
              description="Detail identitas akun dan unit komunitas yang terdaftar pada platform."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded border border-[#EEF2EF] bg-[#F7F9F7] p-3.5 space-y-1">
                <p className="text-[11px] text-[#6B756F]">Nama Lengkap / Lembaga</p>
                <p className="font-semibold text-[#252B28]">
                  {actorProfile.name}
                </p>
              </div>
              <div className="rounded border border-[#EEF2EF] bg-[#F7F9F7] p-3.5 space-y-1">
                <p className="text-[11px] text-[#6B756F]">Email Akun Login</p>
                <p className="font-mono text-[#252B28]">{currentUser.email}</p>
              </div>
              <div className="rounded border border-[#EEF2EF] bg-[#F7F9F7] p-3.5 space-y-1">
                <p className="text-[11px] text-[#6B756F]">Unit / Alamat</p>
                <p className="text-[#252B28]">{actorProfile.unitOrAddress}</p>
              </div>
              <div className="rounded border border-[#EEF2EF] bg-[#F7F9F7] p-3.5 space-y-1">
                <p className="text-[11px] text-[#6B756F]">Peran Terdaftar</p>
                <div className="pt-0.5">
                  <RoleTag role={currentUser.role} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EF] pt-4">
              {isKontributor ? (
                <div className="flex flex-wrap gap-2">
                  <PrimaryButton
                    size="sm"
                    onClick={() => onNavigate('contribution', 'history')}
                  >
                    <span>Riwayat Kontribusi</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </PrimaryButton>
                  <SecondaryButton
                    size="sm"
                    onClick={() => onNavigate('transactions', 'balance')}
                  >
                    Saldo & Transaksi
                  </SecondaryButton>
                </div>
              ) : (
                <PrimaryButton
                  size="sm"
                  onClick={() => onNavigate('requests', 'new')}
                >
                  <span>Ajukan Ecobrick</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </PrimaryButton>
              )}

              <SecondaryButton size="sm" onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar / Ganti Akun</span>
              </SecondaryButton>
            </div>
          </section>
        </div>
      )}
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
    <div className="space-y-6">
      <PageHeader
        title="Notifikasi"
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
                {!notif.read && (
                  <span className="rounded border border-[#C6DBC9] bg-[#E7F0E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#245C45]">
                    Baru
                  </span>
                )}
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
  state,
  currentUser,
  activeSubTab = 'users',
  onChangeSubTab = () => {},
  onLogout,
  onResetSimulation,
}: {
  state: TracecoState;
  currentUser: UserAccount;
  activeSubTab?: string;
  onChangeSubTab?: (sub: string) => void;
  onLogout: () => void;
  onResetSimulation: () => void;
}) {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [resetDone, setResetDone] = useState(false);

  const currentTab =
    activeSubTab === 'hub' || activeSubTab === 'system' ? activeSubTab : 'users';

  const handleReset = () => {
    onResetSimulation();
    setResetDone(true);
  };

  const userColumns: DataTableColumn<UserAccount>[] = [
    {
      key: 'name',
      header: 'Nama & Email',
      render: (u) => (
        <div className="text-xs">
          <p className="font-medium text-[#252B28]">{u.name}</p>
          <p className="font-mono text-[11px] text-[#6B756F]">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Peran',
      render: (u) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <RoleTag role={u.role} />
          {u.segment && u.segment !== u.role && (
            <span className="rounded border border-[#E3E8E4] bg-[#F7F9F7] px-2 py-0.5 text-[10px] font-medium text-[#6B756F]">
              {u.segment}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit / Alamat',
      render: (u) => (
        <span className="text-xs text-[#6B756F]">{u.unitOrAddress}</span>
      ),
    },
    {
      key: 'points',
      header: 'Saldo GP',
      align: 'right',
      render: (u) => {
        if (!isPenyerahRole(u.role)) {
          return <span className="text-xs text-[#6B756F]">-</span>;
        }
        const bal = computeContributorPointsBalance(state, u.id);
        return (
          <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums">
            {bal.balance} GP
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola daftar pengguna ekosistem, profil Pesantren Community Hub, dan pengaturan sistem."
      />

      <SubNavTabs
        ariaLabel="Submenu Pengaturan"
        activeId={currentTab}
        onChange={onChangeSubTab}
        items={[
          {
            id: 'users',
            label: 'Pengguna',
            badge: state.accounts.length,
          },
          {
            id: 'hub',
            label: 'Profil Pesantren',
            badge: state.dropoff_points.length,
          },
          { id: 'system', label: 'Pengaturan Sistem' },
        ]}
      />

      {currentTab === 'users' && (
        <section className="space-y-3">
          <SectionHeader
            title="Direktori Akun Ekosistem"
            description="Daftar Kontributor (Santri, Warga, Keluarga Rentan), Admin Pesantren, dan Mitra Pemanfaat."
          />

          {/* Mobile Cards (< md) */}
          <div className="space-y-2.5 md:hidden">
            {state.accounts.map((u) => {
              const bal = isPenyerahRole(u.role)
                ? computeContributorPointsBalance(state, u.id)
                : null;
              return (
                <div
                  key={u.id}
                  className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#252B28]">
                        {u.name}
                      </p>
                      <p className="font-mono text-[11px] text-[#6B756F]">
                        {u.email}
                      </p>
                    </div>
                    <RoleTag role={u.role} />
                  </div>
                  <div className="flex items-center justify-between border-t border-[#EEF2EF] pt-2 text-[11px] text-[#6B756F]">
                    <span>{u.unitOrAddress}</span>
                    {bal && (
                      <span className="font-mono font-semibold text-[#245C45]">
                        {bal.balance} GP
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <DataTable
              columns={userColumns}
              rows={state.accounts}
              rowKey={(u) => u.id}
              emptyMessage="Belum ada pengguna terdaftar."
            />
          </div>
        </section>
      )}

      {currentTab === 'hub' && (
        <div className="space-y-6">
          <section className="rounded-md border border-[#E3E8E4] bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#245C45]">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span>Pesantren Al-Amanah · Community Hub</span>
            </div>
            <p className="text-xs leading-relaxed text-[#6B756F]">
              Pusat penerimaan ecobrick jadi dari santri, warga sekitar, dan
              keluarga rentan, sekaligus koordinator verifikasi fisik, inventori
              terverifikasi, edukasi komunitas, dan penyaluran pemanfaatan.
            </p>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Pos Serah Ecobrick (Drop-off Points)"
              description="Titik resmi penerimaan ecobrick dan pemeriksaan fisik oleh Admin."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.dropoff_points.map((dp) => (
                <div
                  key={dp.id}
                  className="rounded-md border border-[#E3E8E4] bg-white p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#245C45]"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#252B28]">
                          {dp.name}
                        </p>
                        <p className="text-[11px] text-[#6B756F]">
                          {dp.area}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[#6B756F]">
                      {dp.id}
                    </span>
                  </div>
                  <div className="border-t border-[#EEF2EF] pt-2 text-[11px] text-[#6B756F]">
                    <p>Koordinator: {dp.coordinator}</p>
                    <p className="font-mono text-[#245C45]">{dp.schedule}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Kemitraan Terdaftar" />
            <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white">
              {state.collaborations.map((colb) => (
                <div
                  key={colb.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-4"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[#252B28]">
                      {colb.partnerName}
                    </p>
                    <p className="text-[11px] font-medium text-[#245C45]">
                      {colb.collaborationType}
                    </p>
                    <p className="text-xs text-[#6B756F]">{colb.activity}</p>
                  </div>
                  <StatusTag status={colb.status} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {currentTab === 'system' && (
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
                  memungkinkan peninjauan 3 peran ekosistem TRACECO
                  (Kontributor, Admin, Mitra).
                </span>
              </div>
            </div>

            <label className="flex items-center justify-between rounded border border-[#E3E8E4] bg-[#F7F9F7] px-3.5 py-2.5 text-xs text-[#252B28] cursor-pointer">
              <span>
                Tampilkan notifikasi perubahan status submission & batch
              </span>
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
      )}
    </div>
  );
}
