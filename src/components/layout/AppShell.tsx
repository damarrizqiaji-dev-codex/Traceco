import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  ShieldCheck,
  CheckSquare,
  History,
  Award,
  QrCode,
  Boxes,
  Send,
  ClipboardList,
  Hammer,
  BarChart3,
  Users,
  User,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type {
  AppPageId,
  TracecoState,
  UserAccount,
  UserRole,
} from '../../types/traceco';
import { ALL_ROLES } from '../../utils/tracecoLogic';
import { TracecoLogo } from '../ui/TracecoLogo';

interface AppShellProps {
  activePage: AppPageId;
  onNavigate: (page: AppPageId) => void;
  onPreviewRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  currentUser: UserAccount;
  state: TracecoState;
  children: ReactNode;
}

const NAV_BY_ROLE: Record<UserRole, AppPageId[]> = {
  Kontributor: [
    'dashboard',
    'contribution',
    'reward',
    'traceability',
    'community',
    'profile',
  ],
  Admin: [
    'dashboard',
    'contribution',
    'verification',
    'reward',
    'inventory',
    'distribution',
    'monitor',
    'community',
    'settings',
  ],
  Mitra: [
    'dashboard',
    'distribution',
    'my_requests',
    'utilization',
    'community',
    'profile',
  ],
};

function getNavMeta(
  page: AppPageId,
  role: UserRole
): { label: string; icon: typeof LayoutDashboard } {
  switch (page) {
    case 'dashboard':
      return {
        label: role === 'Admin' ? 'Overview' : 'Dashboard',
        icon: LayoutDashboard,
      };
    case 'contribution':
      return {
        label: role === 'Admin' ? 'Contributions' : 'My Contributions',
        icon: PackagePlus,
      };
    case 'verification':
      return {
        label: 'Verification',
        icon: ShieldCheck,
      };
    case 'verified_list':
      return { label: 'Verified Contributions', icon: CheckSquare };
    case 'history':
      return { label: 'History', icon: History };
    case 'reward':
      return {
        label: 'Rewards',
        icon: Award,
      };
    case 'traceability':
      return { label: 'Traceability', icon: QrCode };
    case 'inventory':
      return { label: 'Inventory', icon: Boxes };
    case 'distribution':
      return {
        label: role === 'Mitra' ? 'Request Ecobrick' : 'Distribution',
        icon: Send,
      };
    case 'my_requests':
      return { label: 'My Requests', icon: ClipboardList };
    case 'utilization':
      return { label: 'Utilization', icon: Hammer };
    case 'monitor':
      return { label: 'Monitoring', icon: BarChart3 };
    case 'community':
      return {
        label: role === 'Admin' ? 'Community Hub' : 'Community',
        icon: Users,
      };
    case 'profile':
      return { label: 'Profile', icon: User };
    case 'notifications':
      return { label: 'Notifications', icon: Bell };
    case 'settings':
      return { label: 'Settings', icon: Settings };
  }
}

export function AppShell({
  activePage,
  onNavigate,
  onPreviewRoleChange,
  onLogout,
  currentUser,
  state,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const navItems = NAV_BY_ROLE[state.activeRole] ?? NAV_BY_ROLE.Admin;
  const currentMeta = getNavMeta(activePage, state.activeRole);

  const handleSelectPage = (page: AppPageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const renderNavButton = (id: AppPageId) => {
    const meta = getNavMeta(id, state.activeRole);
    const Icon = meta.icon;
    const isActive = activePage === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => handleSelectPage(id)}
        className={`flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-left text-[13px] transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-[#E7F0E8] font-medium text-[#245C45]'
            : 'font-normal text-[#252B28] hover:bg-[#F4F7F5]'
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isActive ? 'text-[#245C45]' : 'text-[#6B756F]'
          }`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="truncate">{meta.label}</span>
      </button>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between border-r border-[#E3E8E4] bg-white">
      <div className="flex flex-col overflow-y-auto">
        <div className="border-b border-[#E3E8E4] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleSelectPage('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <TracecoLogo size="md" />
              <span>
                <span className="block text-[15px] font-semibold leading-tight tracking-tight text-[#252B28]">
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
          <p className="px-3 pb-1 text-[10px] font-semibold tracking-widest text-[#6B756F] uppercase">
            Menu · {state.activeRole}
          </p>
          {navItems.map(renderNavButton)}
        </nav>
      </div>

      {/* Community Hub Context + Logout */}
      <div className="border-t border-[#E3E8E4] bg-[#F7F9F7] px-5 py-3.5 space-y-2.5">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B756F]">
            Community Hub
          </p>
          <p className="text-xs font-medium text-[#252B28]">
            Pesantren Al-Amanah
          </p>
          <p className="text-[11px] text-[#6B756F] truncate">
            {currentUser.name}
          </p>
          <p className="text-[11px] font-medium text-[#245C45]">
            {state.activeRole}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onLogout();
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[#CFD8D2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#252B28] hover:bg-[#FEF2F2] hover:border-[#E2B4B4] hover:text-[#991B1B] transition-colors"
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
            <div className="flex items-center gap-3 min-w-0">
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
                <span>TRACECO</span>
                <span aria-hidden="true">/</span>
                <span className="truncate font-medium text-[#252B28]">
                  {currentMeta.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Prototype Role Preview Switcher */}
              <div className="inline-flex items-center gap-2 rounded border border-[#E3E8E4] bg-[#F7F9F7] px-2.5 py-1 text-xs">
                <label
                  htmlFor="prototype-role-preview"
                  className="text-[#6B756F] whitespace-nowrap"
                >
                  Prototype Role Preview:
                </label>
                <select
                  id="prototype-role-preview"
                  value={state.activeRole}
                  onChange={(e) =>
                    onPreviewRoleChange(e.target.value as UserRole)
                  }
                  className="rounded border border-[#CFD8D2] bg-white px-2 py-0.5 text-xs font-medium text-[#245C45] focus:border-[#245C45] focus:outline-none"
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPage('notifications')}
                aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
                className={`relative rounded border p-1.5 transition-colors ${
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
                onClick={() => handleSelectPage('profile')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded border border-[#E3E8E4] bg-white px-2.5 py-1 text-xs font-medium text-[#252B28] hover:bg-[#F7F9F7] transition-colors whitespace-nowrap"
              >
                <User className="h-3.5 w-3.5 text-[#245C45]" aria-hidden="true" />
                <span>{currentUser.name}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-xs font-medium text-[#252B28] hover:bg-[#FEF2F2] hover:border-[#E2B4B4] hover:text-[#991B1B] transition-colors whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-8 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
