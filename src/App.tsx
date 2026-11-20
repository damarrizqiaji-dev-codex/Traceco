import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import type {
  AppPageId,
  CollaborationPartner,
  CommunityActivity,
  CommunityPostCategory,
  ContributorSegment,
  DistributionStatus,
  IncentiveStatus,
  PhysicalChecklist,
  RedemptionStatus,
  RequesterType,
  RewardCatalogItem,
  TracecoState,
  UserAccount,
  UserRole,
  UtilizationCategory,
} from './types/traceco';
import { EMPTY_TRACECO_STATE } from './data/seedData';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL } from './firebase';
import {
  completeOnboardingProfile,
  createCollaborationInFirestore,
  createCommunityActivityInFirestore,
  createCommunityPostInFirestore,
  createDistributionRequestInFirestore,
  createDropOffPointInFirestore,
  createRewardCatalogItemInFirestore,
  fetchUserProfile,
  initializeMasterCatalogInFirestore,
  markAllNotificationsReadInFirestore,
  markNotificationReadInFirestore,
  redeemRewardInFirestore,
  replyCommunityPostInFirestore,
  restoreBootstrappedAdminRoleInFirestore,
  submitEcobrickContributionInFirestore,
  subscribeRoleScopedState,
  toggleCommunityPostStatusInFirestore,
  toggleJoinCommunityActivityInFirestore,
  updateCollaborationStatusInFirestore,
  updateCommunityActivityStatusInFirestore,
  updateDistributionStatusInFirestore,
  updateIncentiveStatusInFirestore,
  updateRedemptionStatusInFirestore,
  verifySubmissionInFirestore,
} from './services/tracecoFirestore';
import { AppShell, type ToastNotice } from './components/layout/AppShell';
import { TraceabilityModal } from './components/ui/TraceabilityModal';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { AuthPages } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { EcobrickContributionPage } from './pages/EcobrickContributionPage';
import { EcoDistributionPage } from './pages/EcoDistributionPage';
import { EcoMonitorPage } from './pages/EcoMonitorPage';
import { GreenMarketplacePage } from './pages/GreenMarketplacePage';
import { GreenRewardPage } from './pages/GreenRewardPage';
import { TransactionsBalancePage } from './pages/TransactionsBalancePage';
import {
  NotificationsPage,
  ProfilePage,
  SettingsPage,
} from './pages/UtilityPages';

const ALLOWED_PAGES_BY_ROLE: Record<UserRole, AppPageId[]> = {
  Kontributor: [
    'dashboard',
    'contribution',
    'marketplace',
    'transactions',
    'activities',
    'profile',
    'notifications',
  ],
  Admin: [
    'dashboard',
    'contribution',
    'reward',
    'inventory',
    'distribution',
    'monitor',
    'settings',
    'notifications',
  ],
  Mitra: ['dashboard', 'requests', 'distribution', 'profile', 'notifications'],
};

function getDefaultSubTab(role: UserRole, page: AppPageId): string {
  if (role === 'Kontributor') {
    if (page === 'contribution') return 'submit';
    if (page === 'marketplace') return 'catalog';
    if (page === 'transactions') return 'balance';
    if (page === 'activities') return 'feed';
  }
  if (role === 'Admin') {
    if (page === 'contribution') return 'all';
    if (page === 'reward') return 'points';
    if (page === 'inventory') return 'available';
    if (page === 'distribution') return 'requests';
    if (page === 'monitor') return 'trends';
    if (page === 'settings') return 'users';
  }
  if (role === 'Mitra') {
    if (page === 'requests') return 'new';
    if (page === 'distribution') return 'active';
    if (page === 'profile') return 'profil';
  }
  return '';
}

function normalizeRoute(
  role: UserRole,
  page: AppPageId,
  subTab?: string
): { page: AppPageId; sub: string } {
  let targetPage = page;
  let targetSub = subTab;

  if (page === 'verification') {
    if (role === 'Admin') {
      targetPage = 'contribution';
      targetSub = 'verify';
    } else {
      targetPage = 'dashboard';
    }
  } else if (page === 'verified_list') {
    if (role === 'Admin') {
      targetPage = 'contribution';
      targetSub = 'all';
    } else {
      targetPage = 'contribution';
      targetSub = 'history';
    }
  } else if (page === 'history') {
    if (role === 'Admin') {
      targetPage = 'contribution';
      targetSub = 'verify_history';
    } else {
      targetPage = 'contribution';
      targetSub = 'history';
    }
  } else if (page === 'traceability') {
    if (role === 'Kontributor') {
      targetPage = 'contribution';
      targetSub = 'trace';
    } else {
      targetPage = 'dashboard';
    }
  } else if (page === 'reward' && role === 'Kontributor') {
    targetPage = 'marketplace';
    targetSub = 'catalog';
  } else if (page === 'my_requests') {
    if (role === 'Mitra') {
      targetPage = 'requests';
      targetSub = 'history';
    } else if (role === 'Admin') {
      targetPage = 'distribution';
      targetSub = 'requests';
    }
  } else if (page === 'utilization') {
    if (role === 'Mitra' || role === 'Admin') {
      targetPage = 'distribution';
      targetSub = 'history';
    }
  } else if (page === 'community') {
    if (role === 'Kontributor') {
      targetPage = 'activities';
      targetSub = 'community';
    } else if (role === 'Admin') {
      targetPage = 'monitor';
      targetSub = 'users';
    } else if (role === 'Mitra') {
      targetPage = 'profile';
      targetSub = 'community';
    }
  } else if (page === 'settings' && role !== 'Admin') {
    targetPage = 'profile';
    targetSub = getDefaultSubTab(role, 'profile');
  } else if (page === 'profile' && role === 'Admin') {
    targetPage = 'settings';
    targetSub = 'system';
  }

  const allowed = ALLOWED_PAGES_BY_ROLE[role];
  if (!allowed.includes(targetPage)) {
    return { page: 'dashboard', sub: '' };
  }

  return {
    page: targetPage,
    sub: targetSub || getDefaultSubTab(role, targetPage),
  };
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    account: UserAccount;
    isAdminMarkerPresent: boolean;
  } | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [state, setState] = useState<TracecoState>(EMPTY_TRACECO_STATE);
  const [activePage, setActivePage] = useState<AppPageId>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>('');
  const [inspectingTargetId, setInspectingTargetId] = useState<string | null>(
    null
  );
  const [selectedTraceTargetId, setSelectedTraceTargetId] = useState<
    string | null
  >(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = (
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setToast({ id: Date.now(), message, actionLabel, onAction });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const hydratingUidRef = useRef<string | null>(null);

  const hydrateUserSession = useCallback(
    async (user: User | null, options?: { showSpinner?: boolean }) => {
      const showSpinner = options?.showSpinner ?? false;
      if (showSpinner) {
        setAuthLoading(true);
      }
      setAuthError(null);

      if (!user) {
        hydratingUidRef.current = null;
        setFirebaseUser(null);
        setCurrentUserProfile(null);
        setNeedsOnboarding(false);
        setSyncError(null);
        setState(EMPTY_TRACECO_STATE);
        setAuthLoading(false);
        return;
      }

      const hydrationKey = `${user.uid}:${Date.now()}`;
      hydratingUidRef.current = hydrationKey;
      setFirebaseUser(user);
      const email = user.email ?? '';

      try {
        const profileResult = await fetchUserProfile(user.uid, email);
        if (hydratingUidRef.current !== hydrationKey) return;

        if (!profileResult) {
          setNeedsOnboarding(true);
          setCurrentUserProfile(null);
          return;
        }

        const isBootstrappedEmail =
          Boolean(user.emailVerified) &&
          email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

        const resolvedProfile =
          isBootstrappedEmail &&
          (profileResult.account.role !== 'Admin' ||
            !profileResult.isAdminMarkerPresent)
            ? await restoreBootstrappedAdminRoleInFirestore(
                profileResult,
                email
              )
            : profileResult;

        if (hydratingUidRef.current !== hydrationKey) return;

        setNeedsOnboarding(false);
        setCurrentUserProfile({
          account: resolvedProfile.account,
          isAdminMarkerPresent: resolvedProfile.isAdminMarkerPresent,
        });
      } catch (err) {
        if (hydratingUidRef.current !== hydrationKey) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Gagal memuat profil pengguna dari database.';
        setAuthError(msg);
        setCurrentUserProfile(null);
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  // Firebase Auth Observer + Mobile Redirect Result Handler
  useEffect(() => {
    let active = true;

    getRedirectResult(auth)
      .then((result) => {
        if (active && result?.user) {
          void hydrateUserSession(result.user, { showSpinner: true });
        }
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Gagal menyelesaikan autentikasi Google setelah pengalihan.';
        setAuthError(msg);
        setAuthLoading(false);
      });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!active) return;
      void hydrateUserSession(user, { showSpinner: true });
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, [hydrateUserSession]);

  // Role-Scoped Firestore real-time synchronization listener
  useEffect(() => {
    if (!firebaseUser || !currentUserProfile || needsOnboarding) return;
    const uid = firebaseUser.uid;
    const role = currentUserProfile.account.role;

    const unsubscribeSync = subscribeRoleScopedState(
      uid,
      role,
      currentUserProfile.account,
      (nextState) => {
        setSyncError(null);
        setState(nextState);
      },
      (errorMessage) => {
        setSyncError(errorMessage);
      }
    );

    return () => {
      unsubscribeSync();
    };
  }, [firebaseUser, currentUserProfile, needsOnboarding]);

  const handleCompleteOnboarding = async (payload: {
    name: string;
    role: UserRole;
    segment?: ContributorSegment;
    unitOrAddress: string;
  }) => {
    if (!firebaseUser) return;
    const result = await completeOnboardingProfile({
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      emailVerified: Boolean(firebaseUser.emailVerified),
      name: payload.name,
      role: payload.role,
      segment: payload.segment,
      unitOrAddress: payload.unitOrAddress,
    });

    setAuthError(null);
    setCurrentUserProfile({
      account: result.account,
      isAdminMarkerPresent: result.isAdminMarkerPresent,
    });
    setNeedsOnboarding(false);
    showToast(`Akun berhasil diatur dengan peran ${result.account.role}.`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setCurrentUserProfile(null);
    setNeedsOnboarding(false);
    setAuthError(null);
    setSyncError(null);
    setState(EMPTY_TRACECO_STATE);
    setActivePage('dashboard');
    setActiveSubTab('');
  };

  const handleNavigate = (page: AppPageId, subTab?: string) => {
    const role = currentUserProfile?.account.role ?? 'Kontributor';
    const resolved = normalizeRoute(role, page, subTab);
    setActivePage(resolved.page);
    setActiveSubTab(resolved.sub);
  };

  const handleOpenTraceDetail = (targetId: string) => {
    setSelectedTraceTargetId(targetId);
    if (currentUserProfile?.account.role === 'Kontributor') {
      setActivePage('contribution');
      setActiveSubTab('trace');
    } else {
      setInspectingTargetId(targetId);
    }
  };

  const handleSubmitContribution = async (payload: {
    contributorId: string;
    dropoffPointId: string;
    date: string;
    bottleSize: string;
    quantitySubmitted: number;
    weightKg?: number;
    iotSimulatedWeightKg?: number;
    photoDataUrl?: string;
    photoLabel?: string;
    notes?: string;
  }): Promise<{ error?: string; submissionId?: string }> => {
    try {
      const submissionId = await submitEcobrickContributionInFirestore(
        state,
        payload
      );
      showToast(
        `Kontribusi ${submissionId} (${payload.quantitySubmitted} unit) berhasil dicatat ke pos.`
      );
      return { submissionId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleVerifySubmission = async (params: {
    submissionId: string;
    verifierId: string;
    checklist: PhysicalChecklist;
    verifiedCount: number;
    rejectionReason?: string;
    verifiedWeightKg?: number;
  }): Promise<{ error?: string; batchId?: string }> => {
    try {
      const res = await verifySubmissionInFirestore(state, params);
      showToast(
        res.batchId
          ? `Verifikasi tersimpan · Batch ${res.batchId} diterbitkan.`
          : `Verifikasi ${params.submissionId} tersimpan.`
      );
      return { batchId: res.batchId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleRedeemReward = async (params: {
    contributorId: string;
    rewardId: string;
  }): Promise<{ error?: string }> => {
    try {
      const redemptionId = await redeemRewardInFirestore(state, params);
      const rewardTitle =
        state.rewards.find((r) => r.id === params.rewardId)?.title ?? 'Reward';
      showToast(
        `Penukaran "${rewardTitle}" (${redemptionId}) berhasil diajukan.`,
        'Lihat Saldo',
        () => handleNavigate('transactions', 'ledger')
      );
      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleUpdateRedemptionStatus = async (
    redemptionId: string,
    status: RedemptionStatus
  ) => {
    try {
      await updateRedemptionStatusInFirestore(
        state,
        redemptionId,
        status,
        firebaseUser?.uid ?? ''
      );
      showToast(`Status penukaran ${redemptionId} diperbarui ke ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdateIncentiveStatus = async (
    incentiveId: string,
    status: IncentiveStatus
  ) => {
    try {
      await updateIncentiveStatusInFirestore(
        state,
        incentiveId,
        status,
        firebaseUser?.uid ?? ''
      );
      showToast(`Status insentif ${incentiveId} diperbarui ke ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateDistributionRequest = async (payload: {
    batchId: string;
    requesterId?: string;
    requesterName: string;
    requesterType: RequesterType;
    requestedCount: number;
    utilizationCategory: UtilizationCategory;
    location?: string;
    neededDate?: string;
    utilizationDetail: string;
  }): Promise<{ error?: string }> => {
    if (!firebaseUser) return { error: 'Pengguna belum masuk.' };
    try {
      await createDistributionRequestInFirestore(state, {
        ...payload,
        requesterId: firebaseUser.uid,
      });
      showToast(
        `Pengajuan ${payload.requestedCount} unit dari Batch ${payload.batchId} terkirim.`
      );
      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleUpdateDistributionStatus = async (
    requestId: string,
    nextStatus: DistributionStatus,
    receiverName?: string,
    documentationNote?: string
  ) => {
    try {
      const reviewerName = currentUserProfile?.account.name ?? 'Admin Eco-Hub';
      await updateDistributionStatusInFirestore(state, {
        requestId,
        nextStatus,
        actorUid: firebaseUser?.uid ?? '',
        reviewerName,
        receiverName,
        documentationNote,
      });
      showToast(`Distribusi ${requestId} diperbarui: ${nextStatus}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateDropOffPoint = async (payload: {
    name: string;
    area: string;
    schedule: string;
    coordinator: string;
  }): Promise<{ error?: string }> => {
    try {
      const id = await createDropOffPointInFirestore(payload);
      showToast(`Pos serah "${payload.name.trim()}" (${id}) berhasil ditambahkan.`);
      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleCreateRewardItem = async (payload: {
    title: string;
    category: RewardCatalogItem['category'];
    pointsCost: number;
    description: string;
    stockNote: string;
  }): Promise<{ error?: string }> => {
    try {
      const id = await createRewardCatalogItemInFirestore(payload);
      showToast(`Item reward "${payload.title.trim()}" (${id}) ditambahkan ke katalog.`);
      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleInitializeMasterCatalog = async (): Promise<{ error?: string }> => {
    try {
      const res = await initializeMasterCatalogInFirestore(
        state.dropoff_points.map((d) => d.id),
        state.rewards.map((r) => r.id)
      );
      if (res.createdDropoffs === 0 && res.createdRewards === 0) {
        showToast('Pos serah dan katalog reward standar sudah tersedia.');
      } else {
        showToast(
          `Berhasil memuat ${res.createdDropoffs} pos serah dan ${res.createdRewards} item reward standar.`
        );
      }
      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(message);
      return { error: message };
    }
  };

  const handleToggleJoinActivity = (
    activityId: string
  ): { joined: boolean; error?: string } => {
    if (!firebaseUser) return { joined: false, error: 'Pengguna belum masuk.' };
    toggleJoinCommunityActivityInFirestore(state, activityId, firebaseUser.uid)
      .then((res) => {
        showToast(
          res.joined
            ? 'Berhasil mendaftar ke kegiatan komunitas.'
            : 'Pendaftaran kegiatan komunitas dibatalkan.'
        );
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : String(err));
      });
    return { joined: true };
  };

  const handleCreateCommunityActivity = (payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
  }): { error?: string } => {
    if (!firebaseUser) return { error: 'Pengguna belum masuk.' };
    createCommunityActivityInFirestore(firebaseUser.uid, payload)
      .then(() => {
        showToast(`Agenda "${payload.title.trim()}" diterbitkan ke Community Hub.`);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : String(err));
      });
    return {};
  };

  const handleUpdateCommunityActivityStatus = async (
    activityId: string,
    status: CommunityActivity['status']
  ) => {
    try {
      await updateCommunityActivityStatusInFirestore(activityId, status);
      showToast(`Status agenda ${activityId} diperbarui ke ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateCommunityPost = (payload: {
    category: CommunityPostCategory;
    title: string;
    body: string;
  }): { error?: string } => {
    if (!firebaseUser) return { error: 'Pengguna belum masuk.' };
    createCommunityPostInFirestore(state, firebaseUser.uid, payload)
      .then(() => {
        showToast('Topik forum diskusi berhasil diterbitkan.');
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : String(err));
      });
    return {};
  };

  const handleReplyCommunityPost = (
    postId: string,
    body: string
  ): { error?: string } => {
    if (!firebaseUser) return { error: 'Pengguna belum masuk.' };
    replyCommunityPostInFirestore(state, firebaseUser.uid, postId, body)
      .then(() => {
        showToast('Balasan forum berhasil terkirim.');
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : String(err));
      });
    return {};
  };

  const handleToggleCommunityPostStatus = (postId: string) => {
    const post = state.community_posts.find((p) => p.id === postId);
    if (post) {
      toggleCommunityPostStatusInFirestore(postId, post.status).catch((err) =>
        showToast(err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleCreateCollaboration = (payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
  }): { error?: string } => {
    if (!firebaseUser || !currentUserProfile)
      return { error: 'Pengguna belum masuk.' };
    createCollaborationInFirestore(
      firebaseUser.uid,
      currentUserProfile.account.role,
      payload
    )
      .then(() => {
        showToast(`Usulan kolaborasi "${payload.partnerName.trim()}" terkirim.`);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : String(err));
      });
    return {};
  };

  const handleUpdateCollaborationStatus = async (
    collaborationId: string,
    status: CollaborationPartner['status']
  ) => {
    try {
      await updateCollaborationStatusInFirestore(collaborationId, status);
      showToast(`Status kolaborasi ${collaborationId} diperbarui ke ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationReadInFirestore(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const unreadIds = state.notifications
        .filter((n) => !n.read)
        .map((n) => n.id);
      await markAllNotificationsReadInFirestore(unreadIds);
      showToast('Semua notifikasi ditandai sudah dibaca.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const pendingGoogleUser = useMemo(
    () =>
      firebaseUser && needsOnboarding
        ? {
            uid: firebaseUser.uid as string,
            email: (firebaseUser.email as string) ?? '',
            emailVerified: Boolean(firebaseUser.emailVerified),
            name: (firebaseUser.displayName as string) ?? '',
            isAdminAuthorized: Boolean(firebaseUser.emailVerified),
          }
        : null,
    [
      firebaseUser?.uid,
      firebaseUser?.email,
      firebaseUser?.emailVerified,
      firebaseUser?.displayName,
      needsOnboarding,
    ]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9F7] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#245C45] border-r-transparent" />
          <p className="text-sm font-medium text-[#6B756F]">
            Memuat sesi TRACECO...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || needsOnboarding || !currentUserProfile) {
    return (
      <AuthPages
        onCompleteOnboarding={handleCompleteOnboarding}
        onAuthenticatedUser={(user) =>
          hydrateUserSession(user, { showSpinner: false })
        }
        pendingGoogleUser={pendingGoogleUser}
        signedInFallback={
          firebaseUser && !needsOnboarding && !currentUserProfile
            ? {
                email: firebaseUser.email ?? '',
                onRetry: () =>
                  void hydrateUserSession(firebaseUser, { showSpinner: true }),
                onLogout: () => void handleLogout(),
              }
            : null
        }
        onCancelOnboarding={firebaseUser ? handleLogout : undefined}
        authError={authError}
      />
    );
  }

  const currentUser = currentUserProfile.account;

  return (
    <AppShell
      activePage={activePage}
      activeSubTab={activeSubTab}
      onNavigate={handleNavigate}
      onPreviewRoleChange={() => {}}
      onLogout={handleLogout}
      currentUser={currentUser}
      state={state}
      toast={toast}
      onDismissToast={() => setToast(null)}
      syncError={syncError}
      onDismissSyncError={() => setSyncError(null)}
    >
      {activePage === 'dashboard' && (
        <DashboardPage
          state={state}
          onNavigate={handleNavigate}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
          onInitializeMasterCatalog={handleInitializeMasterCatalog}
        />
      )}

      {activePage === 'contribution' && (
        <EcobrickContributionPage
          state={state}
          activeSubTab={
            activeSubTab || getDefaultSubTab(state.activeRole, 'contribution')
          }
          onChangeSubTab={setActiveSubTab}
          selectedTraceTargetId={selectedTraceTargetId}
          onSelectTraceTargetId={setSelectedTraceTargetId}
          onSubmitContribution={handleSubmitContribution}
          onVerifySubmission={handleVerifySubmission}
          onInspectTarget={setInspectingTargetId}
        />
      )}

      {activePage === 'marketplace' && (
        <GreenMarketplacePage
          state={state}
          activeSubTab={activeSubTab || 'catalog'}
          onChangeSubTab={setActiveSubTab}
          selectedRewardId={selectedRewardId}
          onSelectRewardId={setSelectedRewardId}
          onRedeemReward={handleRedeemReward}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'transactions' && (
        <TransactionsBalancePage
          state={state}
          activeSubTab={activeSubTab || 'balance'}
          onChangeSubTab={setActiveSubTab}
          onNavigate={handleNavigate}
          onOpenTraceDetail={handleOpenTraceDetail}
        />
      )}

      {activePage === 'activities' && (
        <ActivitiesPage
          state={state}
          activeSubTab={activeSubTab || 'feed'}
          onChangeSubTab={setActiveSubTab}
          onNavigate={handleNavigate}
          onOpenTraceDetail={handleOpenTraceDetail}
          onToggleJoinActivity={handleToggleJoinActivity}
          onCreateActivity={handleCreateCommunityActivity}
          onUpdateActivityStatus={handleUpdateCommunityActivityStatus}
          onCreatePost={handleCreateCommunityPost}
          onReplyPost={handleReplyCommunityPost}
          onTogglePostStatus={handleToggleCommunityPostStatus}
          onCreateCollaboration={handleCreateCollaboration}
          onUpdateCollaborationStatus={handleUpdateCollaborationStatus}
        />
      )}

      {activePage === 'reward' && (
        <GreenRewardPage
          state={state}
          activeSubTab={activeSubTab || 'points'}
          onChangeSubTab={setActiveSubTab}
          onRedeemReward={handleRedeemReward}
          onUpdateRedemptionStatus={handleUpdateRedemptionStatus}
          onUpdateIncentiveStatus={handleUpdateIncentiveStatus}
          onCreateRewardItem={handleCreateRewardItem}
          onInitializeMasterCatalog={handleInitializeMasterCatalog}
        />
      )}

      {(activePage === 'inventory' ||
        activePage === 'distribution' ||
        activePage === 'requests') && (
        <EcoDistributionPage
          state={state}
          pageMode={
            activePage === 'inventory'
              ? 'inventory'
              : activePage === 'requests'
                ? 'requests'
                : 'distribution'
          }
          activeSubTab={
            activeSubTab || getDefaultSubTab(state.activeRole, activePage)
          }
          onChangeSubTab={setActiveSubTab}
          onCreateDistributionRequest={handleCreateDistributionRequest}
          onUpdateDistributionStatus={handleUpdateDistributionStatus}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
        />
      )}

      {activePage === 'monitor' && (
        <EcoMonitorPage
          state={state}
          activeSubTab={activeSubTab || 'trends'}
          onChangeSubTab={setActiveSubTab}
          onNavigate={handleNavigate}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
          onToggleJoinActivity={handleToggleJoinActivity}
          onCreateActivity={handleCreateCommunityActivity}
          onUpdateActivityStatus={handleUpdateCommunityActivityStatus}
          onCreatePost={handleCreateCommunityPost}
          onReplyPost={handleReplyCommunityPost}
          onTogglePostStatus={handleToggleCommunityPostStatus}
          onCreateCollaboration={handleCreateCollaboration}
          onUpdateCollaborationStatus={handleUpdateCollaborationStatus}
        />
      )}

      {activePage === 'profile' && (
        <ProfilePage
          state={state}
          currentUser={currentUser}
          activeSubTab={activeSubTab || 'profil'}
          onChangeSubTab={setActiveSubTab}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onToggleJoinActivity={handleToggleJoinActivity}
          onCreateActivity={handleCreateCommunityActivity}
          onUpdateActivityStatus={handleUpdateCommunityActivityStatus}
          onCreatePost={handleCreateCommunityPost}
          onReplyPost={handleReplyCommunityPost}
          onTogglePostStatus={handleToggleCommunityPostStatus}
          onCreateCollaboration={handleCreateCollaboration}
          onUpdateCollaborationStatus={handleUpdateCollaborationStatus}
        />
      )}

      {activePage === 'notifications' && (
        <NotificationsPage
          state={state}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'settings' && (
        <SettingsPage
          state={state}
          currentUser={currentUser}
          activeSubTab={activeSubTab || 'users'}
          onChangeSubTab={setActiveSubTab}
          onLogout={handleLogout}
          onCreateDropOffPoint={handleCreateDropOffPoint}
          onInitializeMasterCatalog={handleInitializeMasterCatalog}
        />
      )}

      <TraceabilityModal
        targetId={inspectingTargetId}
        state={state}
        onClose={() => setInspectingTargetId(null)}
      />
    </AppShell>
  );
}
