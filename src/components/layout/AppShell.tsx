import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
} from 'lucide-react';
import type {
  AppPageId,
  TracecoState,
  UserAccount,
  UserRole,
} from '../../types/traceco';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!notifPopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifPopoverOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifPopoverOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [notifPopoverOpen]);

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
    setNotifPopoverOpen(false);
  };

  const toggleGroupExpand = (page: AppPageId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [page]: !prev[page],
    }));
  };

  const renderNavGroup = (group: NavGroupSpec, isCompact: boolean) => {
    const Icon = group.icon;
    const isParentActive = activePage === group.page;
    const hasChildren = Boolean(group.children && group.children.length > 0);
    const isExpanded = Boolean(expandedGroups[group.page]);

    return (
      <div key={group.page} className="space-y-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={isCompact ? group.label : undefined}
            onClick={() => handleSelectRoute(group.page, group.defaultSub)}
            className={`relative flex flex-1 items-center rounded-md text-left text-[13px] transition-colors duration-150 whitespace-nowrap ${
              isCompact ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
            } ${
              isParentActive
                ? 'bg-[#1D3229] font-semibold text-white'
                : 'font-normal text-[#B4C4BC] hover:bg-[#192B23] hover:text-white'
            }`}
          >
            {isParentActive && !isCompact && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r bg-[#34D399]"
              />
            )}
            <Icon
              className={`h-4 w-4 shrink-0 ${
                isParentActive ? 'text-[#6EE7B7]' : 'text-[#81988D]'
              }`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {!isCompact && <span className="truncate">{group.label}</span>}
          </button>

          {!isCompact && hasChildren && (
            <button
              type="button"
              onClick={() => toggleGroupExpand(group.page)}
              aria-expanded={isExpanded}
              aria-label={`Toggle submenu ${group.label}`}
              className="rounded p-1.5 text-[#81988D] hover:bg-[#192B23] hover:text-white transition-colors duration-150"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {!isCompact && hasChildren && isExpanded && (
          <div className="ml-5 space-y-0.5 border-l border-[#243A31] pl-2.5 py-0.5">
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
                      ? 'bg-[#172821] font-semibold text-[#6EE7B7]'
                      : 'text-[#8FA59A] hover:bg-[#192B23] hover:text-[#ECF2EE]'
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

  const renderSidebar = (isCompact: boolean, isMobileDrawer: boolean) => (
    <div className="flex h-full flex-col justify-between border-r border-[#243A31] bg-[#111E19] text-[#ECF2EE]">
      <div className="flex flex-col overflow-y-auto">
        <div
          className={`border-b border-[#243A31] ${
            isCompact ? 'px-3 py-4' : 'px-4 py-4'
          }`}
        >
          <div
            className={`flex items-center ${
              isCompact ? 'justify-center' : 'justify-between gap-2'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSelectRoute('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
              title="Kembali ke Overview"
            >
              <TracecoLogo size={isCompact ? 'sm' : 'md'} tone="dark" />
              {!isCompact && (
                <span>
                  <span className="font-display block text-[16px] font-bold leading-tight tracking-tight text-white">
                    TRACECO
                  </span>
                  <span className="block text-[11px] leading-tight text-[#89A296]">
                    Traceable Eco-Contribution
                  </span>
                </span>
              )}
            </button>

            {isMobileDrawer && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded p-1.5 text-[#9EB5AA] hover:bg-[#1A2C25] hover:text-white lg:hidden"
                aria-label="Tutup menu navigasi"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <nav
          aria-label="Navigasi utama"
          className={`${isCompact ? 'px-2' : 'px-3'} py-4 space-y-1`}
        >
          {!isCompact && (
            <div className="flex items-center justify-between px-3 pb-1.5">
              <p className="font-mono text-[11px] font-medium text-[#6EE7B7]">
                {state.activeRole}
              </p>
              <span className="text-[10px] text-[#7D9589]">Eco-Hub</span>
            </div>
          )}
          {navGroups.map((group) => renderNavGroup(group, isCompact))}
        </nav>
      </div>

      <div
        className={`border-t border-[#243A31] bg-[#0D1713] ${
          isCompact ? 'px-2 py-3' : 'px-4 py-3.5'
        } space-y-2.5`}
      >
        {!isCompact && (
          <div className="space-y-0.5">
            <p className="text-[11px] text-[#89A296]">
              Pesantren Al-Amanah · Hub
            </p>
            <p className="text-xs font-semibold text-white truncate">
              {currentUser.name}
            </p>
            <p className="font-mono text-[11px] text-[#6EE7B7]">
              Peran: {state.activeRole}
            </p>
          </div>
        )}

        <button
          type="button"
          title="Keluar Akun"
          onClick={() => {
            setMobileMenuOpen(false);
            onLogout();
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#2D473B] bg-[#162720] px-2.5 py-2 text-xs font-medium text-[#D6E3DC] hover:border-[#7F1D1D] hover:bg-[#3B1717] hover:text-[#FCA5A5] transition-colors duration-150"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {!isCompact && <span>Keluar Akun</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F4F2] text-[#17201C] lg:flex">
      <aside
        className={`hidden lg:block lg:shrink-0 lg:sticky lg:top-0 lg:h-screen transition-[width] duration-200 ${
          sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[252px]'
        }`}
      >
        {renderSidebar(sidebarCollapsed, false)}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#111E19]/60 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 h-full w-64 max-w-[85vw]">
            {renderSidebar(false, true)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#D8DFDA] bg-white/95 backdrop-blur-sm px-4 py-2.5 sm:px-8">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3">
            {/* Zone 1: Nav toggle + Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-md border border-[#D8DFDA] bg-white p-1.5 text-[#17201C] hover:bg-[#F2F4F2] lg:hidden"
                aria-label="Buka menu navigasi"
              >
                <Menu className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden lg:inline-flex rounded-md border border-[#D8DFDA] bg-white p-1.5 text-[#54625B] hover:border-[#A4B3AA] hover:text-[#17201C] transition-colors duration-150"
                aria-label={
                  sidebarCollapsed
                    ? 'Perluas sidebar navigasi'
                    : 'Perkecil sidebar navigasi'
                }
                title={
                  sidebarCollapsed ? 'Perluas sidebar' : 'Perkecil sidebar'
                }
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <TracecoLogo size="sm" className="lg:hidden" />

              <div className="flex items-center gap-1.5 text-xs text-[#54625B] min-w-0">
                <span className="hidden sm:inline font-display font-semibold text-[#17201C]">
                  TRACECO
                </span>
                <span className="hidden sm:inline text-[#A4B3AA]" aria-hidden="true">
                  /
                </span>
                <span className="truncate font-medium text-[#17201C]">
                  {pageLabel}
                </span>
                {activeChild && (
                  <>
                    <span className="text-[#A4B3AA]" aria-hidden="true">
                      /
                    </span>
                    <span className="truncate font-semibold text-[#166549]">
                      {activeChild.label}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Zone 2 & 3: Action Cluster (Notifications Popover, Profile, Logout) */}
            <div className="flex items-center gap-2">
              <div ref={notifContainerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifPopoverOpen((v) => !v)}
                  aria-expanded={notifPopoverOpen}
                  aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
                  className={`relative inline-flex min-h-[34px] items-center justify-center rounded-md border px-2.5 py-1.5 transition-colors duration-150 ${
                    activePage === 'notifications' || notifPopoverOpen
                      ? 'border-[#166549] bg-[#EBF4EF] text-[#166549]'
                      : 'border-[#D8DFDA] bg-white text-[#54625B] hover:border-[#A4B3AA] hover:text-[#17201C]'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="ml-1.5 font-mono text-[11px] font-semibold text-[#166549] tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifPopoverOpen && (
                  <div
                    role="dialog"
                    aria-label="Ringkasan notifikasi terbaru"
                    className="animate-traceco-modal absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border border-[#D8DFDA] bg-white shadow-lg overflow-hidden z-40"
                  >
                    <div className="flex items-center justify-between border-b border-[#EAEFEA] bg-[#111E19] px-4 py-2.5 text-white">
                      <span className="font-display text-xs font-semibold">
                        Notifikasi Terbaru
                      </span>
                      <span className="font-mono text-[11px] text-[#6EE7B7] tabular-nums">
                        {unreadCount} belum dibaca
                      </span>
                    </div>
                    <div className="max-h-72 divide-y divide-[#EAEFEA] overflow-y-auto">
                      {state.notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-[#54625B]">
                          Belum ada notifikasi.
                        </p>
                      ) : (
                        state.notifications.slice(0, 4).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() =>
                              handleSelectRoute(n.targetPage ?? 'notifications')
                            }
                            className={`block w-full px-4 py-3 text-left transition-colors hover:bg-[#F8FAF8] ${
                              !n.read ? 'bg-[#EBF4EF]/45' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#17201C] truncate">
                                {n.title}
                              </span>
                              {!n.read && (
                                <span className="font-mono text-[10px] font-semibold text-[#166549] shrink-0">
                                  Baru
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-[#54625B]">
                              {n.detail}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectRoute('notifications')}
                      className="flex w-full items-center justify-between border-t border-[#EAEFEA] bg-[#F8FAF8] px-4 py-2.5 text-xs font-semibold text-[#166549] hover:bg-[#EBF4EF] transition-colors"
                    >
                      <span>Buka Semua Notifikasi</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSelectRoute(
                    state.activeRole === 'Admin' ? 'settings' : 'profile'
                  )
                }
                className="hidden md:inline-flex min-h-[34px] items-center gap-2 rounded-md border border-[#D8DFDA] bg-white px-3 py-1 text-xs font-medium text-[#17201C] hover:border-[#A4B3AA] hover:bg-[#F8FAF8] transition-colors duration-150 whitespace-nowrap"
              >
                <User className="h-3.5 w-3.5 text-[#166549]" aria-hidden="true" />
                <span>{currentUser.name}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                aria-label="Keluar Akun"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-[#D8DFDA] bg-white px-2.5 py-1 text-xs font-medium text-[#17201C] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] hover:text-[#B91C1C] transition-colors duration-150 whitespace-nowrap"
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
              className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#B91C1C]"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{syncError}</span>
              </div>
              {onDismissSyncError && (
                <button
                  type="button"
                  onClick={onDismissSyncError}
                  aria-label="Tutup pesan gangguan sinkronisasi"
                  className="rounded p-0.5 text-[#B91C1C] hover:bg-[#FEE2E2]"
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
          className="animate-traceco-enter fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-2.5 rounded-lg border border-[#243A31] bg-[#111E19] px-4 py-3 text-white shadow-lg"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE7B7]"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium leading-snug text-[#ECF2EE]">
              {toast.message}
            </p>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismissToast?.();
                }}
                className="text-[11px] font-semibold text-[#6EE7B7] hover:underline"
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
              className="rounded p-0.5 text-[#89A296] hover:bg-[#1A2C25] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
