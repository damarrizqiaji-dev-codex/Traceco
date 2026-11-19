import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';
import type { ContributorSegment, UserAccount, UserRole } from '../types/traceco';
import { PrimaryButton } from '../components/ui/Button';
import { FilterBar } from '../components/ui/FilterBar';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { RoleTag } from '../components/ui/StatusBadge';
import { TracecoLogo } from '../components/ui/TracecoLogo';

interface AuthPagesProps {
  accounts: UserAccount[];
  onLogin: (email: string, password: string) => { error?: string };
  onRegister: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    segment?: ContributorSegment;
    unitOrAddress: string;
  }) => { error?: string };
}

type AuthMode = 'login' | 'register';
type AccountFilter = 'Semua' | UserRole;

interface RoleOption {
  role: UserRole;
  scope: string;
  description: string;
  unitPlaceholder: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'Kontributor',
    scope: 'Santri · Warga · Keluarga Rentan',
    description:
      'Menyerahkan ecobrick jadi ke pos TRACECO, melacak verifikasi, dan meraih +20 Green Points per unit terverifikasi.',
    unitPlaceholder: 'Contoh: Asrama Putra Al-Farabi / Dusun Krajan RT 02',
  },
  {
    role: 'Admin',
    scope: 'Pengelola & Verifikator Eco-Hub Pesantren',
    description:
      'Memeriksa fisik 8 kriteria, menerbitkan batch inventori, mengelola reward, distribusi, dan monitoring.',
    unitPlaceholder: 'Contoh: Sekretariat & Pos Verifikasi Eco-Hub Pesantren',
  },
  {
    role: 'Mitra',
    scope: 'Pengrajin, Proyek Komunal, & Lembaga Pemanfaat',
    description:
      'Mengajukan permintaan ecobrick terverifikasi sesuai lokasi dan tanggal kebutuhan serta mendokumentasikan pemanfaatan nyata.',
    unitPlaceholder: 'Contoh: Sanggar Kerajinan & Furnitur Krajan',
  },
];

const KONTRIBUTOR_SEGMENTS: { value: ContributorSegment; label: string }[] = [
  { value: 'Santri', label: 'Santri Pesantren' },
  { value: 'Warga', label: 'Warga Sekitar' },
  { value: 'Keluarga Rentan', label: 'Keluarga Rentan' },
];

const ECOSYSTEM_PILLARS = [
  {
    index: '01',
    title: 'Kontributor (Santri · Warga · Keluarga Rentan)',
    detail:
      'Membuat ecobrick jadi sesuai standar, menyerahkan ke pos TRACECO, melacak verifikasi, dan meraih +20 Green Points per unit terverifikasi.',
  },
  {
    index: '02',
    title: 'Admin Eco-Hub Pesantren',
    detail:
      'Memeriksa fisik 8 kriteria, menerbitkan batch inventori terverifikasi, mengelola reward, dan menyalurkan distribusi secara akuntabel.',
  },
  {
    index: '03',
    title: 'Mitra Pemanfaat',
    detail:
      'Mengajukan ecobrick terverifikasi sesuai lokasi dan tanggal kebutuhan, lalu mendokumentasikan pemanfaatan nyata.',
  },
];

export function AuthPages({ accounts, onLogin, onRegister }: AuthPagesProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('Semua');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Kontributor');
  const [regSegment, setRegSegment] = useState<ContributorSegment>('Santri');
  const [regUnit, setRegUnit] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const selectedRoleOption =
    ROLE_OPTIONS.find((opt) => opt.role === regRole) ?? ROLE_OPTIONS[0];

  const filteredAccounts = accounts.filter((acc) =>
    accountFilter === 'Semua' ? true : acc.role === accountFilter
  );

  const passwordLenOk = regPassword.length >= 6;
  const passwordMatch =
    regConfirmPassword.length > 0 && regPassword === regConfirmPassword;

  const handleModeSwitch = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLoginError(null);
    setRegError(null);
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = onLogin(loginEmail, loginPassword);
    if (res.error) {
      setLoginError(res.error);
    }
  };

  const handleQuickLogin = (account: UserAccount) => {
    setLoginError(null);
    setLoginEmail(account.email);
    setLoginPassword(account.password);
    const res = onLogin(account.email, account.password);
    if (res.error) {
      setLoginError(res.error);
    }
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const res = onRegister({
      name: regName,
      email: regEmail,
      password: regPassword,
      confirmPassword: regConfirmPassword,
      role: regRole,
      segment: regRole === 'Kontributor' ? regSegment : undefined,
      unitOrAddress: regUnit,
    });
    if (res.error) {
      setRegError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#252B28]">
      <header className="border-b border-[#E3E8E4] bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TracecoLogo size="sm" />
            <span className="font-display text-[16px] font-bold tracking-tight text-[#252B28] whitespace-nowrap">
              TRACECO
            </span>
          </div>
          <nav
            aria-label="Navigasi autentikasi"
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-[#E7F0E8] text-[#245C45]'
                  : 'text-[#6B756F] hover:bg-[#F7F9F7] hover:text-[#252B28]'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-[#245C45] text-white'
                  : 'border border-[#CFD8D2] bg-white text-[#252B28] hover:bg-[#F7F9F7]'
              }`}
            >
              Daftar Akun
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 sm:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Editorial Community Hub Context */}
          <section className="order-2 space-y-6 lg:order-1 lg:col-span-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#245C45]">
                Pesantren Al-Amanah · Community Hub
              </p>
              <h1 className="font-display text-2xl font-semibold leading-[1.18] tracking-tight text-[#252B28] sm:text-[30px] [text-wrap:balance]">
                Platform Pencatatan & Verifikasi Kontribusi Ecobrick
              </h1>
              <p className="text-sm leading-relaxed text-[#6B756F]">
                TRACECO menghubungkan 3 peran utama ekosistem—Kontributor
                (Santri, Warga, Keluarga Rentan), Admin, dan Mitra—untuk
                mengelola ecobrick jadi dari penyerahan hingga pemanfaatan
                nyata.
              </p>
            </div>

            <div className="divide-y divide-[#E3E8E4] border-y border-[#E3E8E4]">
              {ECOSYSTEM_PILLARS.map((pillar) => (
                <div key={pillar.index} className="py-4 space-y-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-xs font-semibold text-[#245C45] tabular-nums">
                      {pillar.index}
                    </span>
                    <h2 className="font-display text-sm font-semibold text-[#252B28]">
                      {pillar.title}
                    </h2>
                  </div>
                  <p className="pl-6 text-xs leading-relaxed text-[#6B756F]">
                    {pillar.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2.5 rounded-md border border-[#C6DBC9] bg-[#E7F0E8]/60 p-4 text-xs leading-relaxed text-[#252B28]">
              <Lock
                className="mt-0.5 h-4 w-4 shrink-0 text-[#245C45]"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#245C45]">
                  Penetapan Peran & Prototype Preview
                </p>
                <p className="mt-0.5 text-[#252B28]">
                  Pilih peran Kontributor, Admin, atau Mitra saat mendaftar.
                  Setelah masuk, tersedia <strong>Preview Peran</strong> di
                  header atas untuk meninjau perspektif setiap peran.
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Login / Register Workspace */}
          <section className="order-1 lg:order-2 lg:col-span-7">
            <div className="rounded-md border border-[#E3E8E4] bg-white">
              <div className="grid grid-cols-2 border-b border-[#E3E8E4] bg-[#F7F9F7]">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-[13px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    mode === 'login'
                      ? 'border-[#245C45] bg-white text-[#245C45]'
                      : 'border-transparent text-[#6B756F] hover:text-[#252B28]'
                  }`}
                >
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Masuk ke Akun</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-[13px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    mode === 'register'
                      ? 'border-[#245C45] bg-white text-[#245C45]'
                      : 'border-transparent text-[#6B756F] hover:text-[#252B28]'
                  }`}
                >
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Daftar Akun Baru</span>
                </button>
              </div>

              {mode === 'login' ? (
                <div className="animate-traceco-enter p-5 sm:p-7 space-y-6">
                  <div className="space-y-1">
                    <h2 className="font-display text-xl font-semibold text-[#252B28]">
                      Masuk ke TRACECO
                    </h2>
                    <p className="text-xs text-[#6B756F]">
                      Masuk dengan email terdaftar atau pilih langsung akun
                      peran ekosistem di bawah ini.
                    </p>
                  </div>

                  {loginError && (
                    <div
                      role="alert"
                      className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
                    >
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <FormField id="login-email" label="Alamat Email">
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="nama@alamanah.id"
                        className={fieldInputClass}
                      />
                    </FormField>

                    <FormField id="login-password" label="Kata Sandi">
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Masukkan kata sandi"
                          className={`${fieldInputClass} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          aria-label={
                            showLoginPassword
                              ? 'Sembunyikan kata sandi'
                              : 'Tampilkan kata sandi'
                          }
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6B756F] hover:text-[#252B28]"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </FormField>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleModeSwitch('register')}
                        className="text-xs font-medium text-[#245C45] hover:underline"
                      >
                        Belum memiliki akun? Daftar dan pilih peran di sini
                      </button>
                      <PrimaryButton type="submit">
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        <span>Masuk</span>
                      </PrimaryButton>
                    </div>
                  </form>

                  <div className="border-t border-[#E3E8E4] pt-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[#252B28]">
                          Masuk Cepat per Peran
                        </h3>
                        <p className="text-[11px] text-[#6B756F]">
                          Pilih baris akun untuk langsung mencoba alur peran terkait.
                        </p>
                      </div>
                      <FilterBar
                        ariaLabel="Filter peran akun demo"
                        value={accountFilter}
                        onChange={setAccountFilter}
                        options={[
                          { value: 'Semua', label: 'Semua', count: accounts.length },
                          {
                            value: 'Kontributor',
                            label: 'Kontributor',
                            count: accounts.filter((a) => a.role === 'Kontributor')
                              .length,
                          },
                          {
                            value: 'Admin',
                            label: 'Admin',
                            count: accounts.filter((a) => a.role === 'Admin')
                              .length,
                          },
                          {
                            value: 'Mitra',
                            label: 'Mitra',
                            count: accounts.filter((a) => a.role === 'Mitra')
                              .length,
                          },
                        ]}
                      />
                    </div>

                    <div className="divide-y divide-[#EEF2EF] border-y border-[#E3E8E4]">
                      {filteredAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleQuickLogin(acc)}
                          className="group flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left transition-colors duration-150 hover:bg-[#F2F7F3]/75"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-[#252B28] group-hover:text-[#245C45]">
                                {acc.name}
                              </span>
                              <RoleTag
                                role={acc.role}
                                segment={acc.segment}
                              />
                            </div>
                            <p className="font-mono text-[11px] text-[#6B756F] truncate">
                              {acc.email} · {acc.unitOrAddress}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245C45] group-hover:border-[#245C45] group-hover:bg-[#E7F0E8] transition-colors duration-150 whitespace-nowrap shrink-0">
                            <span>Masuk</span>
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-traceco-enter p-5 sm:p-7 space-y-6">
                  <div className="space-y-1">
                    <h2 className="font-display text-xl font-semibold text-[#252B28]">
                      Pendaftaran Akun TRACECO
                    </h2>
                    <p className="text-xs text-[#6B756F]">
                      Lengkapi identitas Anda dan pilih peran Anda dalam ekosistem
                      TRACECO.
                    </p>
                  </div>

                  {regError && (
                    <div
                      role="alert"
                      className="rounded border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]"
                    >
                      {regError}
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField id="reg-name" label="Nama Lengkap">
                        <input
                          id="reg-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Contoh: Ahmad Fauzan"
                          className={fieldInputClass}
                        />
                      </FormField>

                      <FormField id="reg-email" label="Alamat Email">
                        <input
                          id="reg-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="nama@alamanah.id"
                          className={fieldInputClass}
                        />
                      </FormField>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span
                          id="register-role-label"
                          className="text-xs font-medium text-[#252B28]"
                        >
                          Pilih Peran Akun (Kontributor · Admin · Mitra)
                        </span>
                        <span className="text-[11px] font-medium text-[#245C45]">
                          Terpilih: {regRole}
                        </span>
                      </div>

                      <div
                        role="radiogroup"
                        aria-labelledby="register-role-label"
                        className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E3E8E4] bg-[#E3E8E4] sm:grid-cols-3"
                      >
                        {ROLE_OPTIONS.map((option) => {
                          const isSelected = regRole === option.role;
                          return (
                            <button
                              key={option.role}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setRegRole(option.role)}
                              className={`flex flex-col justify-between p-3.5 text-left transition-colors duration-150 ${
                                isSelected
                                  ? 'bg-[#E7F0E8]/75'
                                  : 'bg-white hover:bg-[#F7F9F7]'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-xs font-semibold ${
                                      isSelected
                                        ? 'text-[#245C45]'
                                        : 'text-[#252B28]'
                                    }`}
                                  >
                                    {option.role}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2
                                      className="h-4 w-4 shrink-0 text-[#245C45]"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                                <p className="text-[10px] font-medium text-[#4F8A68]">
                                  {option.scope}
                                </p>
                                <p className="text-[11px] leading-relaxed text-[#6B756F]">
                                  {option.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {regRole === 'Kontributor' && (
                        <FormField
                          id="reg-segment"
                          label="Kategori Kontributor"
                        >
                          <select
                            id="reg-segment"
                            value={regSegment}
                            onChange={(e) =>
                              setRegSegment(e.target.value as ContributorSegment)
                            }
                            className={fieldInputClass}
                          >
                            {KONTRIBUTOR_SEGMENTS.map((seg) => (
                              <option key={seg.value} value={seg.value}>
                                {seg.label}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      )}
                    </div>

                    <FormField
                      id="reg-unit"
                      label="Unit Asrama / Lembaga / Alamat RT-RW"
                    >
                      <input
                        id="reg-unit"
                        type="text"
                        required
                        value={regUnit}
                        onChange={(e) => setRegUnit(e.target.value)}
                        placeholder={selectedRoleOption.unitPlaceholder}
                        className={fieldInputClass}
                      />
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        id="reg-password"
                        label="Kata Sandi"
                        hint={
                          regPassword.length === 0
                            ? 'Minimal 6 karakter'
                            : passwordLenOk
                              ? 'Panjang kata sandi memenuhi standar'
                              : `Kurang ${6 - regPassword.length} karakter lagi`
                        }
                      >
                        <div className="relative">
                          <input
                            id="reg-password"
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Buat kata sandi"
                            className={`${fieldInputClass} pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword((prev) => !prev)}
                            aria-label={
                              showRegPassword
                                ? 'Sembunyikan kata sandi'
                                : 'Tampilkan kata sandi'
                            }
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6B756F] hover:text-[#252B28]"
                          >
                            {showRegPassword ? (
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </FormField>

                      <FormField
                        id="reg-confirm-password"
                        label="Konfirmasi Kata Sandi"
                        hint={
                          regConfirmPassword.length === 0
                            ? undefined
                            : passwordMatch
                              ? 'Kata sandi cocok'
                              : 'Belum cocok dengan kata sandi'
                        }
                      >
                        <input
                          id="reg-confirm-password"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          value={regConfirmPassword}
                          onChange={(e) =>
                            setRegConfirmPassword(e.target.value)
                          }
                          placeholder="Ulangi kata sandi"
                          className={fieldInputClass}
                        />
                      </FormField>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF2EF] pt-4">
                      <button
                        type="button"
                        onClick={() => handleModeSwitch('login')}
                        className="text-xs font-medium text-[#245C45] hover:underline"
                      >
                        Sudah punya akun? Masuk di sini
                      </button>
                      <PrimaryButton type="submit">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        <span>Daftar sebagai {regRole}</span>
                      </PrimaryButton>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
