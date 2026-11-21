import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  signInWithPopup,
  signInWithRedirect,
  type User,
} from 'firebase/auth';
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
  onAuthenticatedUser?: (user: User) => Promise<void>;
  pendingGoogleUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    name: string;
    isAdminAuthorized: boolean;
  } | null;
  signedInFallback?: {
    email: string;
    onRetry: () => void;
    onLogout: () => void;
  } | null;
  onCancelOnboarding?: () => void;
  authError?: string | null;
}

interface RoleOption {
  role: UserRole;
  scope: string;
  summary: string;
  unitPlaceholder: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'Kontributor',
    scope: 'Santri · Warga · Keluarga Rentan',
    summary: 'Kirim ecobrick, pantau verifikasi, & tukar Green Points.',
    unitPlaceholder: 'Contoh: Asrama Putra Al-Farabi / Dusun Krajan RT 02',
  },
  {
    role: 'Admin',
    scope: 'Pengelola Eco-Hub Pesantren',
    summary: 'Inspeksi 8 kriteria, kelola batch, reward, & distribusi.',
    unitPlaceholder: 'Contoh: Sekretariat & Pos Verifikasi Eco-Hub Pesantren',
  },
  {
    role: 'Mitra',
    scope: 'Pengrajin & Lembaga Pemanfaat',
    summary: 'Ajukan ecobrick terverifikasi & catat pemanfaatan.',
    unitPlaceholder: 'Contoh: Sanggar Kerajinan & Furnitur Krajan',
  },
];

const KONTRIBUTOR_SEGMENTS: { value: ContributorSegment; label: string }[] = [
  { value: 'Santri', label: 'Santri Pesantren' },
  { value: 'Warga', label: 'Warga Sekitar' },
  { value: 'Keluarga Rentan', label: 'Keluarga Rentan' },
];

function isTopLevelBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|MicroMessenger|\bwv\b/i.test(ua);
}

export function AuthPages({
  onCompleteOnboarding,
  onAuthenticatedUser,
  pendingGoogleUser,
  signedInFallback,
  onCancelOnboarding,
  authError,
}: AuthPagesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedPageUrl, setCopiedPageUrl] = useState(false);
  const displayedError = error ?? authError ?? null;

  const isTopLevel = isTopLevelBrowser();
  const isMobile = isMobileBrowser();
  const inAppWebView = isEmbeddedWebView();

  const defaultRoleForUser: UserRole =
    pendingGoogleUser?.email?.toLowerCase() ===
    BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
      ? 'Admin'
      : 'Kontributor';

  const [regName, setRegName] = useState(pendingGoogleUser?.name ?? '');
  const [regRole, setRegRole] = useState<UserRole>(defaultRoleForUser);
  const [regSegment, setRegSegment] = useState<ContributorSegment>('Santri');
  const [regUnit, setRegUnit] = useState('');

  useEffect(() => {
    setLoading(false);
    setError(null);
    setUnauthorizedHost(null);
    if (pendingGoogleUser) {
      setRegName(pendingGoogleUser.name || '');
      setRegRole(defaultRoleForUser);
    }
  }, [pendingGoogleUser?.uid]);

  const selectedRoleOption =
    ROLE_OPTIONS.find((opt) => opt.role === regRole) ?? ROLE_OPTIONS[0];

  const handleCopyHost = async () => {
    if (!unauthorizedHost || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(unauthorizedHost);
      setCopiedHost(true);
      window.setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      // Clipboard API unavailable; hostname remains selectable
    }
  };

  const handleCopyCurrentUrl = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedPageUrl(true);
      window.setTimeout(() => setCopiedPageUrl(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const formatAuthError = (err: unknown) => {
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
        'Popup login Google diblokir browser. Gunakan tombol "Masuk Mode Pengalihan (Mobile)" di bawah atau izinkan popup.'
      );
    } else if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      setError(
        'Jendela login tertutup sebelum selesai. Jika di ponsel, coba gunakan "Masuk Mode Pengalihan (Mobile)" di bawah.'
      );
    } else if (code === 'auth/network-request-failed') {
      setError('Koneksi ke server autentikasi gagal. Periksa jaringan Anda.');
    } else {
      setError(rawMsg || 'Gagal masuk dengan Google.');
    }
  };

  const handleRedirectSignIn = async () => {
    if (!isTopLevel) {
      setError(
        'Mode pengalihan hanya tersedia saat aplikasi dibuka langsung di tab browser (bukan pratinjau tersemat).'
      );
      return;
    }
    setError(null);
    setUnauthorizedHost(null);
    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      formatAuthError(err);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedHost(null);
    setLoading(true);

    let timeoutId: number | undefined;
    try {
      const popupPromise = signInWithPopup(auth, googleProvider);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('AUTH_POPUP_TIMEOUT'));
        }, 45000);
      });

      const credential = await Promise.race([popupPromise, timeoutPromise]);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);

      if (credential?.user && onAuthenticatedUser) {
        await onAuthenticatedUser(credential.user);
      }
    } catch (err) {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const code = (err as { code?: string })?.code ?? '';
      const rawMsg = err instanceof Error ? err.message : String(err);

      if (rawMsg === 'AUTH_POPUP_TIMEOUT') {
        setError(
          'Respon popup login terlalu lama di browser ponsel. Coba gunakan "Masuk Mode Pengalihan (Mobile)" di bawah.'
        );
      } else if (
        isTopLevel &&
        isMobile &&
        (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment')
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          formatAuthError(redirectErr);
        }
      } else {
        formatAuthError(err);
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
    <div className="min-h-screen flex flex-col bg-[#F5F6F5] text-[#1B231F]">
      <header className="border-b border-[#D9E0DC] bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-[1060px] items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TracecoLogo size="sm" />
            <span className="font-display text-[16px] font-bold tracking-tight text-[#141B17] whitespace-nowrap">
              TRACECO
            </span>
          </div>
          <span className="font-mono text-[11px] font-medium text-[#58655E]">
            Pesantren Al-Amanah · Eco-Hub
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:px-8 lg:items-center lg:py-10">
        {pendingGoogleUser ? (
          <section className="animate-traceco-enter w-full max-w-[780px] overflow-hidden rounded-lg border border-[#D9E0DC] bg-white">
            <div className="border-b border-[#C5D9CD] bg-[#EFF5F2] px-6 py-5 sm:px-8">
              <p className="font-mono text-[11px] font-semibold text-[#1B5E43]">
                TERAUTENTIKASI ·{' '}
                <span className="text-[#34403A] break-all">
                  {pendingGoogleUser.email}
                </span>
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-[#141B17] sm:text-2xl">
                Pilih Peran &amp; Lengkapi Profil
              </h1>
              <p className="mt-1 text-xs text-[#58655E]">
                Setiap akun terikat pada satu peran tetap untuk menjaga
                integritas data kontribusi dan verifikasi.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {displayedError && (
                <div
                  role="alert"
                  className="mb-5 rounded-md border border-[#E8C5C5] bg-[#FDF3F3] p-3 text-xs font-medium text-[#A62626]"
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
                    className="text-xs font-medium text-[#1B231F]"
                  >
                    Peran Ekosistem
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="onboard-role-label"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
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
                          className={`flex min-h-[44px] flex-col justify-between rounded-lg border p-4 text-left transition-all duration-150 cursor-pointer touch-manipulation ${
                            isSelected
                              ? 'border-[#1B5E43] bg-[#EFF5F2]'
                              : 'border-[#D9E0DC] bg-white hover:border-[#A4B8AD]'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  isSelected
                                    ? 'text-[#1B5E43]'
                                    : 'text-[#141B17]'
                                }`}
                              >
                                {option.role}
                              </span>
                              {isSelected && (
                                <CheckCircle2
                                  className="h-4 w-4 shrink-0 text-[#1B5E43]"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-[#2B5E6B]">
                              {option.scope}
                            </p>
                            <p className="text-xs leading-relaxed text-[#58655E]">
                              {option.summary}
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAEFEA] pt-4">
                  {onCancelOnboarding && (
                    <button
                      type="button"
                      onClick={onCancelOnboarding}
                      className="min-h-[40px] text-xs font-medium text-[#58655E] hover:text-[#141B17] touch-manipulation"
                    >
                      Batal / Ganti Akun
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
          </section>
        ) : signedInFallback ? (
          <section className="animate-traceco-enter w-full max-w-[480px] rounded-lg border border-[#D9E0DC] bg-white p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[#C5D9CD] bg-[#EFF5F2]">
                <TracecoLogo size="sm" />
              </div>
              <h1 className="font-display text-xl font-semibold text-[#141B17]">
                Akun Google Sudah Terhubung
              </h1>
              <p className="font-mono text-xs text-[#1B5E43] break-all">
                {signedInFallback.email}
              </p>
              <p className="text-xs text-[#58655E]">
                Sesi login aktif, tetapi profil database gagal dimuat. Ketuk
                tombol di bawah untuk memuat ulang atau ganti akun.
              </p>
            </div>

            {displayedError && (
              <div
                role="alert"
                className="rounded-md border border-[#E8C5C5] bg-[#FDF3F3] p-3 text-xs text-[#A62626]"
              >
                {displayedError}
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={signedInFallback.onRetry}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md bg-[#1B5E43] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#144833] active:scale-[0.985] cursor-pointer touch-manipulation transition-all duration-150"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Muat Ulang Profil</span>
              </button>
              <button
                type="button"
                onClick={signedInFallback.onLogout}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md border border-[#B5CEC0] bg-white px-4 py-2.5 text-xs font-semibold text-[#1B5E43] hover:bg-[#EFF5F2] cursor-pointer touch-manipulation transition-colors duration-150"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar / Ganti Akun</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="mx-auto grid w-full max-w-[1000px] grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            {/* Sign-In Card FIRST on mobile for immediate access */}
            <section className="order-1 flex flex-col lg:order-2 lg:col-span-6">
              <div className="animate-traceco-enter flex h-full flex-col justify-between rounded-lg border border-[#D9E0DC] bg-white p-6 sm:p-10 space-y-6">
                <div className="space-y-2 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[#C5D9CD] bg-[#EFF5F2]">
                    <TracecoLogo size="sm" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-[#141B17] sm:text-2xl">
                    Masuk ke TRACECO
                  </h2>
                  <p className="text-xs text-[#58655E]">
                    Autentikasi dengan akun Google Anda untuk mengakses
                    platform.
                  </p>
                </div>

                {inAppWebView && (
                  <div className="rounded-md border border-[#E6D2B5] bg-[#FBF6EE] p-3 text-xs text-[#A15C17] space-y-2">
                    <p className="font-medium">
                      Anda membuka tautan di browser bawaan aplikasi
                      (WhatsApp/IG). Google Login hanya berfungsi di Chrome atau
                      Safari.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyCurrentUrl}
                      className="inline-flex items-center gap-1.5 rounded border border-[#E6D2B5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#A15C17] hover:bg-[#FBF6EE] touch-manipulation"
                    >
                      {copiedPageUrl ? (
                        <>
                          <Check className="h-3 w-3" aria-hidden="true" />
                          <span>Tautan Tersalin — Tempel di Chrome/Safari</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Salin Tautan untuk Chrome / Safari</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {displayedError && (
                  <div
                    role="alert"
                    className="rounded-md border border-[#E8C5C5] bg-[#FDF3F3] p-3.5 text-xs text-[#A62626] space-y-2.5"
                  >
                    <div className="flex items-start gap-2 font-medium">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="break-words">{displayedError}</span>
                    </div>

                    {unauthorizedHost && (
                      <div className="rounded border border-[#E8C5C5] bg-white p-3 space-y-2 text-[11px] text-[#34403A]">
                        <p className="font-semibold text-[#A62626]">
                          Aktifkan domain ini di Firebase Console:
                        </p>
                        <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                          <li>
                            Buka{' '}
                            <a
                              href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-[#1B5E43] underline"
                            >
                              <span>Firebase Console · Authorized domains</span>
                              <ExternalLink
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                            </a>
                          </li>
                          <li>
                            Pilih <strong>Add domain</strong> lalu masukkan
                            hostname berikut:
                          </li>
                        </ol>
                        <div className="flex items-center justify-between gap-2 rounded border border-[#D9E0DC] bg-[#F8FAF9] px-2.5 py-1.5">
                          <code className="font-mono text-[11px] font-semibold text-[#141B17] break-all">
                            {unauthorizedHost}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyHost}
                            className="inline-flex shrink-0 items-center gap-1 rounded border border-[#C5CEC9] bg-white px-2 py-1 text-[11px] font-medium text-[#1B231F] hover:border-[#1B5E43] hover:text-[#1B5E43]"
                          >
                            {copiedHost ? (
                              <>
                                <Check
                                  className="h-3 w-3 text-[#1B5E43]"
                                  aria-hidden="true"
                                />
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

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                    className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-md border border-[#C5CEC9] bg-white px-5 py-3 text-sm font-semibold text-[#141B17] transition-all duration-150 hover:border-[#1B5E43] hover:bg-[#EFF5F2] active:scale-[0.99] cursor-pointer disabled:opacity-60 touch-manipulation"
                  >
                    <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
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

                  {isTopLevel && (isMobile || displayedError) && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRedirectSignIn}
                      className="flex min-h-[42px] w-full items-center justify-center rounded-md px-3 py-2 text-xs font-medium text-[#1B5E43] hover:bg-[#EFF5F2] cursor-pointer disabled:opacity-60 touch-manipulation transition-colors duration-150"
                    >
                      Masuk Mode Pengalihan (jika popup ponsel bermasalah)
                    </button>
                  )}
                </div>

                <div className="border-t border-[#EAEFEA] pt-4 text-center text-[11px] text-[#58655E]">
                  Pengguna baru dapat memilih peran Kontributor, Admin, atau Mitra
                  setelah autentikasi Google berhasil.
                </div>
              </div>
            </section>

            {/* Institutional Editorial Intro Panel SECOND on mobile, LEFT on desktop */}
            <section className="order-2 flex flex-col justify-between rounded-lg border border-[#D9E0DC] bg-[#F8FAF9] p-6 text-[#1B231F] sm:p-8 lg:order-1 lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <p className="font-mono text-xs font-semibold text-[#1B5E43]">
                  Pesantren Al-Amanah · Ekosistem Ecobrick
                </p>
                <h1 className="font-display text-2xl font-semibold leading-[1.15] tracking-tight text-[#141B17] sm:text-[32px] [text-wrap:balance]">
                  Pencatatan &amp; Verifikasi Ecobrick Terpadu
                </h1>
                <p className="text-sm leading-relaxed text-[#58655E]">
                  Satu platform akuntabel untuk penyetoran, inspeksi 8 kriteria,
                  inventori terverifikasi, dan penyaluran pemanfaatan.
                </p>
              </div>

              <div className="divide-y divide-[#D9E0DC] border-y border-[#D9E0DC]">
                {ROLE_OPTIONS.map((item, idx) => (
                  <div
                    key={item.role}
                    className="flex items-baseline justify-between gap-4 py-3.5"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs font-semibold text-[#1B5E43] tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-display text-sm font-semibold text-[#141B17]">
                        {item.role}
                      </span>
                    </div>
                    <span className="text-right text-xs text-[#58655E]">
                      {item.scope}
                    </span>
                  </div>
                ))}
              </div>

              <p className="flex items-center gap-2 text-xs text-[#34403A]">
                <Lock
                  className="h-3.5 w-3.5 shrink-0 text-[#1B5E43]"
                  aria-hidden="true"
                />
                <span>Satu akun Google terikat pada satu peran tetap.</span>
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
