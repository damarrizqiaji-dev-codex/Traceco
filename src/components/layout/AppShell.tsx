import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  Award,
  Wallet,
  Activity,
  User,
  Boxes,
  Send,
  BarChart3,
  Settings,
  ClipboardList,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type {
  AppPageId,
  TracecoState,
  UserAccount,
  UserRole,
} from '../../types/traceco';
import { ALL_ROLES } from '../../utils/tracecoLogic';
import { TracecoLogo } from '../ui/TracecoLogo';

export interface NavChildSpec {
  subId: string;
  label: string;
}

export interface NavGroupSpec {
  page: AppPageId;
  label: string;
  icon: typeof LayoutDashboard;
  defaultSub?: string;
  children?: NavChildSpec[];
}

export interface ToastNotice {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function getNavGroupsForRole(role: UserRole): NavGroupSpec[] {
  if (role === 'Kontributor') {
    return [
      { page: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      {
        page: 'contribution',
        label: 'Kontribusi',
        icon: PackagePlus,
        defaultSub: 'submit',
        children: [
          { subId: 'submit', label: 'Kirim Ecobrick' },
          { subId: 'history', label: 'Riwayat Kontribusi' },
          { subId: 'trace', label: 'Lacak Kontribusi' },
        ],
      },
      {
        page: 'marketplace',
        label: 'Green Marketplace',
        icon: Award,
        defaultSub: 'catalog',
        children: [
          { subId: 'catalog', label: 'Marketplace' },
          { subId: 'detail', label: 'Detail Reward' },
        ],
      },
      {
        page: 'transactions',
        label: 'Transaksi & Saldo',
        icon: Wallet,
        defaultSub: 'balance',
        children: [
          { subId: 'balance', label: 'Saldo' },
          { subId: 'ledger', label: 'Riwayat Transaksi' },
        ],
      },
      {
        page: 'activities',
        label: 'Aktivitas',
        icon: Activity,
        defaultSub: 'feed',
      },
      { page: 'profile', label: 'Profil', icon: User },
    ];
  }

  if (role === 'Mitra') {
    return [
      { page: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      {
        page: 'requests',
        label: 'Permintaan',
        icon: ClipboardList,
        defaultSub: 'new',
        children: [
          { subId: 'new', label: 'Pengajuan Baru' },
          { subId: 'history', label: 'Riwayat Pengajuan' },
        ],
      },
      {
        page: 'distribution',
        label: 'Distribusi',
        icon: Send,
        defaultSub: 'active',
        children: [
          { subId: 'active', label: 'Distribusi Aktif' },
          { subId: 'history', label: 'Riwayat Distribusi' },
        ],
      },
      { page: 'profile', label: 'Profil', icon: User },
    ];
  }

  // Admin
  return [
    { page: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    {
      page: 'contribution',
      label: 'Kontribusi',
      icon: PackagePlus,
      defaultSub: 'all',
      children: [
        { subId: 'all', label: 'Semua Kontribusi' },
        { subId: 'verify', label: 'Verifikasi' },
        { subId: 'verify_history', label: 'Riwayat' },
      ],
    },
    {
      page: 'reward',
      label: 'Reward',
      icon: Award,
      defaultSub: 'points',
      children: [
        { subId: 'points', label: 'Green Points' },
        { subId: 'policy', label: 'Kebijakan Reward' },
        { subId: 'history', label: 'Riwayat Reward' },
      ],
    },
    {
      page: 'inventory',
      label: 'Inventori',
      icon: Boxes,
      defaultSub: 'available',
      children: [
        { subId: 'available', label: 'Ecobrick Tersedia' },
        { subId: 'movement', label: 'Pergerakan Inventori' },
      ],
    },
    {
      page: 'distribution',
      label: 'Distribusi',
      icon: Send,
      defaultSub: 'requests',
      children: [
        { subId: 'requests', label: 'Pengajuan' },
        { subId: 'active', label: 'Distribusi Berjalan' },
        { subId: 'history', label: 'Riwayat Distribusi' },
      ],
    },
    {
      page: 'monitor',
      label: 'Monitoring',
      icon: BarChart3,
      defaultSub: 'trends',
      children: [
        { subId: 'trends', label: 'Tren Kontribusi' },
        { subId: 'users', label: 'Aktivitas Pengguna' },
        { subId: 'utilization', label: 'Pemanfaatan Ecobrick' },
      ],
    },
    {
      page: 'settings',
      label: 'Pengaturan',
      icon: Settings,
      defaultSub: 'users',
      children: [
        { subId: 'users', label: 'Pengguna' },
        { subId: 'hub', label: 'Profil Pesantren' },
        { subId: 'system', label: 'Pengaturan Sistem' },
      ],
    },
  ];
}

interface AppShellProps {
  activePage: AppPageId;
  activeSubTab?: string;
  onNavigate: (page: AppPageId, subTab?: string) => void;
  onPreviewRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  currentUser: UserAccount;
  state: TracecoState;
  toast?: ToastNotice | null;
  onDismissToast?: () => void;
  syncError?: string | null;
  onDismissSyncError?: () => void;
  children: ReactNode;
}

export function AppShell({
  activePage,
  activeSubTab,
  onNavigate,
  onPreviewRoleChange,
  onLogout,
  currentUser,
  state,
  toast,
  onDismissToast,
  syncError,
  onDismissSyncError,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    contribution: true,
    marketplace: false,
    transactions: false,
    requests: true,
    distribution: false,
    reward: false,
    inventory: false,
    monitor: false,
    settings: false,
  });

  useEffect(() => {
    setExpandedGroups((prev) => ({
      ...prev,
      [activePage]: true,
    }));
  }, [activePage]);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const navGroups = getNavGroupsForRole(state.activeRole);
  const activeGroup = navGroups.find((g) => g.page === activePage);
  const activeChild = activeGroup?.children?.find(
    (c) => c.subId === (activeSubTab ?? activeGroup.defaultSub)
  );

  const pageLabel =
    activePage === 'notifications'
      ? 'Notifikasi'
      : activeGroup?.label ?? 'Overview';

  const handleSelectRoute = (page: AppPageId, subTab?: string) => {
    onNavigate(page, subTab);
    setMobileMenuOpen(false);
  };

  const toggleGroupExpand = (page: AppPageId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [page]: !prev[page],
    }));
  };

  const renderNavGroup = (group: NavGroupSpec) => {
    const Icon = group.icon;
    const isParentActive = activePage === group.page;
    const hasChildren = Boolean(group.children && group.children.length > 0);
    const isExpanded = Boolean(expandedGroups[group.page]);

    return (
      <div key={group.page} className="space-y-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectRoute(group.page, group.defaultSub)}
            className={`flex flex-1 items-center gap-2.5 rounded px-3 py-2 text-left text-[13px] transition-colors duration-150 whitespace-nowrap ${
              isParentActive
                ? 'bg-[#E7F0E8] font-medium text-[#245C45]'
                : 'font-normal text-[#252B28] hover:bg-[#F4F7F5]'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${
                isParentActive ? 'text-[#245C45]' : 'text-[#6B756F]'
              }`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="truncate">{group.label}</span>
          </button>

          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleGroupExpand(group.page)}
              aria-expanded={isExpanded}
              aria-label={`Toggle submenu ${group.label}`}
              className="rounded p-1.5 text-[#6B756F] hover:bg-[#F4F7F5] hover:text-[#252B28] transition-colors duration-150"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-5 space-y-0.5 border-l border-[#DCE4DE] pl-2.5 py-0.5">
            {group.children!.map((child) => {
              const currentSub = activeSubTab ?? group.defaultSub;
              const isChildActive =
                isParentActive && currentSub === child.subId;
              return (
                <button
                  key={child.subId}
                  type="button"
                  onClick={() => handleSelectRoute(group.page, child.subId)}
                  className={`flex w-full items-center rounded px-2.5 py-1.5 text-left text-xs transition-colors duration-150 whitespace-nowrap ${
                    isChildActive
                      ? 'bg-[#F2F7F3] font-semibold text-[#245C45]'
                      : 'text-[#6B756F] hover:bg-[#F7F9F7] hover:text-[#252B28]'
                  }`}
                >
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between border-r border-[#E3E8E4] bg-white">
      <div className="flex flex-col overflow-y-auto">
        <div className="border-b border-[#E3E8E4] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleSelectRoute('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <TracecoLogo size="md" />
              <span>
                <span className="font-display block text-[16px] font-bold leading-tight tracking-tight text-[#252B28]">
                  TRACECO
                </span>
                <span className="block text-[11px] leading-tight text-[#6B756F]">
                  Traceable Eco-Contribution
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded p-1 text-[#6B756F] hover:bg-[#F7F9F7] lg:hidden"
              aria-label="Tutup menu navigasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav aria-label="Navigasi utama" className="px-3 py-4 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-medium text-[#6B756F]">
            Menu · {state.activeRole}
          </p>
          {navGroups.map(renderNavGroup)}
        </nav>
      </div>

      <div className="border-t border-[#E3E8E4] bg-[#F7F9F7] px-5 py-3.5 space-y-2.5">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-[#6B756F]">
            Pesantren Al-Amanah · Hub
          </p>
          <p className="text-xs font-semibold text-[#252B28] truncate">
            {currentUser.name}
          </p>
          <p className="text-[11px] font-medium text-[#245C45]">
            Peran aktif: {state.activeRole}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onLogout();
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[#CFD8D2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#252B28] hover:bg-[#FEF2F2] hover:border-[#E2B4B4] hover:text-[#991B1B] transition-colors duration-150"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#252B28] lg:flex">
      <aside className="hidden lg:block lg:w-[252px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {SidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#252B28]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 h-full w-64 max-w-[85vw]">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#E3E8E4] bg-white px-4 py-2.5 sm:px-8">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded border border-[#E3E8E4] p-1.5 text-[#252B28] hover:bg-[#F7F9F7] lg:hidden"
                aria-label="Buka menu navigasi"
              >
                <Menu className="h-4 w-4" />
              </button>
              <TracecoLogo size="sm" className="lg:hidden" />
              <div className="flex items-center gap-1.5 text-xs text-[#6B756F] min-w-0">
                <span className="hidden sm:inline font-display font-medium">
                  TRACECO
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="truncate font-medium text-[#252B28]">
                  {pageLabel}
                </span>
                {activeChild && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="truncate text-[#245C45] font-medium">
                      {activeChild.label}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded border border-[#C6DBC9] bg-[#E7F0E8] px-2.5 py-1 text-xs font-semibold text-[#245C45]">
                <span>Peran: {state.activeRole}</span>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRoute('notifications')}
                aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
                className={`relative rounded border p-1.5 transition-colors duration-150 ${
                  activePage === 'notifications'
                    ? 'border-[#245C45] bg-[#E7F0E8] text-[#245C45]'
                    : 'border-[#E3E8E4] bg-white text-[#6B756F] hover:bg-[#F7F9F7] hover:text-[#252B28]'
                }`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 rounded bg-[#245C45] px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectRoute(
                    state.activeRole === 'Admin' ? 'settings' : 'profile'
                  )
                }
                className="hidden md:inline-flex items-center gap-1.5 rounded border border-[#E3E8E4] bg-white px-2.5 py-1 text-xs font-medium text-[#252B28] hover:bg-[#F7F9F7] transition-colors duration-150 whitespace-nowrap"
              >
                <User className="h-3.5 w-3.5 text-[#245C45]" aria-hidden="true" />
                <span>{currentUser.name}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                aria-label="Keluar Akun"
                className="inline-flex items-center gap-1.5 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-xs font-medium text-[#252B28] hover:bg-[#FEF2F2] hover:border-[#E2B4B4] hover:text-[#991B1B] transition-colors duration-150 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <main
          key={`${activePage}:${activeSubTab ?? ''}`}
          className="animate-traceco-enter mx-auto w-full max-w-[1360px] flex-1 px-4 py-5 sm:px-8 sm:py-7"
        >
          {syncError && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between gap-3 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{syncError}</span>
              </div>
              {onDismissSyncError && (
                <button
                  type="button"
                  onClick={onDismissSyncError}
                  aria-label="Tutup pesan gangguan sinkronisasi"
                  className="rounded p-0.5 text-[#991B1B] hover:bg-[#FEE2E2]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="animate-traceco-enter fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-2.5 rounded-md border border-[#C6DBC9] bg-white px-4 py-3 shadow-md"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-[#245C45]"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium leading-snug text-[#252B28]">
              {toast.message}
            </p>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismissToast?.();
                }}
                className="text-[11px] font-semibold text-[#245C45] hover:underline"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          {onDismissToast && (
            <button
              type="button"
              onClick={onDismissToast}
              aria-label="Tutup notifikasi singkat"
              className="rounded p-0.5 text-[#6B756F] hover:bg-[#F7F9F7] hover:text-[#252B28]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
