import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import type { ContributorSegment, UserRole } from '../types/traceco';
import {
  auth,
  googleProvider,
  BOOTSTRAPPED_ADMIN_EMAIL,
  FIREBASE_PROJECT_ID,
} from '../firebase';
import { PrimaryButton } from '../components/ui/Button';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { TracecoLogo } from '../components/ui/TracecoLogo';

interface AuthPagesProps {
  onCompleteOnboarding: (payload: {
    name: string;
    role: UserRole;
    segment?: ContributorSegment;
    unitOrAddress: string;
  }) => Promise<void>;
  pendingGoogleUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    name: string;
    isAdminAuthorized: boolean;
  } | null;
  onCancelOnboarding?: () => void;
  authError?: string | null;
}

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
    role: 'Mitra',
    scope: 'Pengrajin, Proyek Komunal, & Lembaga Pemanfaat',
    description:
      'Mengajukan permintaan ecobrick terverifikasi sesuai lokasi dan tanggal kebutuhan serta mendokumentasikan pemanfaatan nyata.',
    unitPlaceholder: 'Contoh: Sanggar Kerajinan & Furnitur Krajan',
  },
];

const ADMIN_ROLE_OPTION: RoleOption = {
  role: 'Admin',
  scope: 'Pengelola & Verifikator Eco-Hub Pesantren',
  description:
    'Memeriksa fisik 8 kriteria, menerbitkan batch inventori, mengelola reward, distribusi, dan monitoring.',
  unitPlaceholder: 'Contoh: Sekretariat & Pos Verifikasi Eco-Hub Pesantren',
};

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

export function AuthPages({
  onCompleteOnboarding,
  pendingGoogleUser,
  onCancelOnboarding,
  authError,
}: AuthPagesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const displayedError = error ?? authError ?? null;

  // Onboarding form state (when pendingGoogleUser is present)
  const isAdminPreAuthorized =
    Boolean(pendingGoogleUser?.isAdminAuthorized) ||
    pendingGoogleUser?.email?.toLowerCase() ===
      BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  const [regName, setRegName] = useState(pendingGoogleUser?.name ?? '');
  const [regRole, setRegRole] = useState<UserRole>(
    isAdminPreAuthorized ? 'Admin' : 'Kontributor'
  );
  const [regSegment, setRegSegment] = useState<ContributorSegment>('Santri');
  const [regUnit, setRegUnit] = useState('');

  useEffect(() => {
    setLoading(false);
    setError(null);
    setUnauthorizedHost(null);
    if (pendingGoogleUser) {
      setRegName((prev) => prev || pendingGoogleUser.name || '');
      setRegRole(isAdminPreAuthorized ? 'Admin' : 'Kontributor');
    }
  }, [pendingGoogleUser?.uid, pendingGoogleUser?.name, isAdminPreAuthorized, pendingGoogleUser]);

  const availableRoles = isAdminPreAuthorized
    ? [...ROLE_OPTIONS, ADMIN_ROLE_OPTION]
    : ROLE_OPTIONS;

  const selectedRoleOption =
    availableRoles.find((opt) => opt.role === regRole) ?? availableRoles[0];

  const handleCopyHost = async () => {
    if (!unauthorizedHost || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(unauthorizedHost);
      setCopiedHost(true);
      window.setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      // Clipboard API unavailable; hostname remains selectable in text
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedHost(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // App.tsx auth state change listener will detect user and load or prompt onboarding
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      const rawMsg = err instanceof Error ? err.message : String(err);

      if (
        code === 'auth/unauthorized-domain' ||
        rawMsg.includes('auth/unauthorized-domain')
      ) {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedHost(host || 'domain-vercel-anda');
        setError(
          `Domain "${host || 'ini'}" belum terdaftar di Authorized domains Firebase Authentication (${FIREBASE_PROJECT_ID}).`
        );
      } else if (
        code === 'auth/popup-blocked' ||
        rawMsg.includes('auth/popup-blocked')
      ) {
        setError(
          'Jendela popup login Google diblokir oleh browser. Izinkan popup untuk situs ini lalu klik Masuk kembali.'
        );
      } else if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        setError('Proses masuk dibatalkan sebelum selesai.');
      } else if (code === 'auth/network-request-failed') {
        setError(
          'Koneksi ke server autentikasi Google gagal. Periksa jaringan internet Anda dan coba lagi.'
        );
      } else {
        setError(rawMsg || 'Gagal masuk dengan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCompleteOnboarding({
        name: regName,
        role: regRole,
        segment: regRole === 'Kontributor' ? regSegment : undefined,
        unitOrAddress: regUnit,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan profil pendaftaran.'
      );
    } finally {
      setLoading(false);
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
          <span className="text-xs font-medium text-[#6B756F]">
            Traceable Eco-Contribution Platform
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 sm:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Editorial Context */}
          <section className="space-y-6 lg:col-span-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#245C45]">
                Pesantren Al-Amanah · Community Hub
              </p>
              <h1 className="font-display text-2xl font-semibold leading-[1.18] tracking-tight text-[#252B28] sm:text-[30px] [text-wrap:balance]">
                Platform Pencatatan & Verifikasi Kontribusi Ecobrick
              </h1>
              <p className="text-sm leading-relaxed text-[#6B756F]">
                TRACECO menghubungkan ekosistem kontributor, pos verifikasi, dan
                mitra pemanfaat secara transparan dan akuntabel.
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
                  Keamanan Akun & Peran Tunggal
                </p>
                <p className="mt-0.5 text-[#252B28]">
                  Satu akun Google terikat pada satu peran tetap di ekosistem
                  untuk menjaga integritas data kontribusi dan verifikasi.
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Google Sign-In or Onboarding */}
          <section className="lg:col-span-7">
            <div className="rounded-md border border-[#E3E8E4] bg-white p-6 sm:p-8 shadow-sm">
              {pendingGoogleUser ? (
                <div className="animate-traceco-enter space-y-6">
                  <div className="space-y-1.5 border-b border-[#E3E8E4] pb-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#E7F0E8] px-3 py-1 text-xs font-semibold text-[#245C45]">
                      <span>Akun Google Terautentikasi</span>
                    </div>
                    <h2 className="font-display text-xl font-semibold text-[#252B28]">
                      Pilih Peran & Lengkapi Profil Anda
                    </h2>
                    <p className="text-xs text-[#6B756F]">
                      Email:{' <' + pendingGoogleUser.email + '>'} · Pilih peran
                      yang sesuai dengan aktivitas Anda. Peran bersifat tetap
                      setelah disimpan.
                    </p>
                  </div>

                  {displayedError && (
                    <div
                      role="alert"
                      className="rounded border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#991B1B]"
                    >
                      {displayedError}
                    </div>
                  )}

                  <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                    <FormField id="onboard-name" label="Nama Lengkap / Panggilan">
                      <input
                        id="onboard-name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Contoh: Muhammad Rizqi"
                        className={fieldInputClass}
                      />
                    </FormField>

                    <div className="space-y-2">
                      <span
                        id="onboard-role-label"
                        className="text-xs font-medium text-[#252B28]"
                      >
                        Pilih Peran Utama Anda
                      </span>
                      <div
                        role="radiogroup"
                        aria-labelledby="onboard-role-label"
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                      >
                        {availableRoles.map((option) => {
                          const isSelected = regRole === option.role;
                          return (
                            <button
                              key={option.role}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setRegRole(option.role)}
                              className={`flex flex-col justify-between rounded-lg border p-4 text-left transition-all duration-150 cursor-pointer ${
                                isSelected
                                  ? 'border-[#245C45] bg-[#E7F0E8]/75 shadow-xs'
                                  : 'border-[#E3E8E4] bg-white hover:border-[#CFD8D2]'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-sm font-semibold ${
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
                                <p className="text-[11px] font-medium text-[#4F8A68]">
                                  {option.scope}
                                </p>
                                <p className="text-xs leading-relaxed text-[#6B756F]">
                                  {option.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {regRole === 'Kontributor' && (
                        <div className="pt-2">
                          <FormField
                            id="onboard-segment"
                            label="Kategori Kontributor"
                          >
                            <select
                              id="onboard-segment"
                              value={regSegment}
                              onChange={(e) =>
                                setRegSegment(
                                  e.target.value as ContributorSegment
                                )
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
                        </div>
                      )}
                    </div>

                    <FormField
                      id="onboard-unit"
                      label="Unit Asrama / Lembaga / Alamat RT-RW"
                    >
                      <input
                        id="onboard-unit"
                        type="text"
                        required
                        value={regUnit}
                        onChange={(e) => setRegUnit(e.target.value)}
                        placeholder={selectedRoleOption.unitPlaceholder}
                        className={fieldInputClass}
                      />
                    </FormField>

                    <div className="flex items-center justify-between gap-3 border-t border-[#E3E8E4] pt-4">
                      {onCancelOnboarding && (
                        <button
                          type="button"
                          onClick={onCancelOnboarding}
                          className="text-xs font-medium text-[#6B756F] hover:text-[#252B28]"
                        >
                          Batal / Masuk Akun Lain
                        </button>
                      )}
                      <div className="ml-auto">
                        <PrimaryButton type="submit" disabled={loading}>
                          <span>
                            {loading ? 'Menyimpan...' : 'Simpan & Mulai TRACECO'}
                          </span>
                        </PrimaryButton>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="animate-traceco-enter py-8 text-center space-y-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F0E8] border border-[#C6DBC9]">
                    <TracecoLogo size="md" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h2 className="font-display text-2xl font-semibold text-[#252B28]">
                      Masuk ke TRACECO
                    </h2>
                    <p className="text-sm text-[#6B756F] leading-relaxed">
                      Autentikasi akun Google Anda untuk mengakses platform
                      pencatatan dan verifikasi ecobrick terpadu.
                    </p>
                  </div>

                  {displayedError && (
                    <div
                      role="alert"
                      className="max-w-md mx-auto rounded border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B] text-left space-y-2.5"
                    >
                      <div className="flex items-start gap-2 font-medium">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{displayedError}</span>
                      </div>

                      {unauthorizedHost && (
                        <div className="rounded border border-[#FCA5A5]/60 bg-white/85 p-3 space-y-2 text-[11px] text-[#7F1D1D]">
                          <p className="font-semibold text-[#991B1B]">
                            Cara mengaktifkan login Google di domain Vercel ini:
                          </p>
                          <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                            <li>
                              Buka{' '}
                              <a
                                href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-[#245C45] underline"
                              >
                                <span>Firebase Console · Authorized domains</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            </li>
                            <li>
                              Klik <strong>Add domain</strong> lalu masukkan hostname persis berikut:
                            </li>
                          </ol>
                          <div className="flex items-center justify-between gap-2 rounded border border-[#E3E8E4] bg-[#F7F9F7] px-2.5 py-1.5">
                            <code className="font-mono text-[11px] font-semibold text-[#252B28] break-all">
                              {unauthorizedHost}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyHost}
                              className="inline-flex shrink-0 items-center gap-1 rounded border border-[#CFD8D2] bg-white px-2 py-1 text-[11px] font-medium text-[#252B28] hover:border-[#245C45]"
                            >
                              {copiedHost ? (
                                <>
                                  <Check className="h-3 w-3 text-[#245C45]" aria-hidden="true" />
                                  <span>Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                      className="inline-flex items-center justify-center gap-3 rounded-lg border border-[#CFD8D2] bg-white px-6 py-3.5 text-sm font-semibold text-[#252B28] shadow-xs hover:bg-[#F7F9F7] hover:border-[#245C45] transition-all duration-150 cursor-pointer w-full max-w-md"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.23 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.13 0 9.87 0 11.7s.43 3.57 1.19 5.12l4.09-2.55z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>
                        {loading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
