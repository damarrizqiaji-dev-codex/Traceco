import { useEffect, useState } from 'react';
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
  TracecoState,
  UserRole,
  UtilizationCategory,
} from './types/traceco';
import { INITIAL_TRACECO_STATE } from './data/seedData';
import {
  ALL_ROLES,
  authenticateUser,
  createCollaborationProposalInState,
  createCommunityActivityInState,
  createCommunityPostInState,
  createDistributionRequestInState,
  logoutUser,
  redeemRewardInState,
  registerUserAccount,
  replyCommunityPostInState,
  submitEcobrickContributionInState,
  switchPreviewRole,
  toggleCommunityPostStatusInState,
  toggleJoinCommunityActivityInState,
  updateCollaborationStatusInState,
  updateCommunityActivityStatusInState,
  updateDistributionStatusInState,
  updateRedemptionStatusInState,
  verifySubmissionInState,
} from './utils/tracecoLogic';
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

const STORAGE_KEY = 'traceco_app_state_v7';

const VALID_ROLES: UserRole[] = ALL_ROLES;

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
  Mitra: [
    'dashboard',
    'requests',
    'distribution',
    'profile',
    'notifications',
  ],
};

function getDefaultSubTab(
  role: UserRole,
  page: AppPageId
): string {
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

  // Map legacy notification/deep-link page IDs cleanly
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

function loadInitialState(): TracecoState {
  if (typeof window === 'undefined') return INITIAL_TRACECO_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_TRACECO_STATE;
    const parsed = JSON.parse(raw) as Partial<TracecoState>;
    if (
      !parsed ||
      !Array.isArray(parsed.accounts) ||
      !Array.isArray(parsed.contributors) ||
      !Array.isArray(parsed.ecobrick_submissions) ||
      !Array.isArray(parsed.dropoff_points) ||
      !Array.isArray(parsed.redemptions) ||
      !Array.isArray(parsed.utilization_records) ||
      !VALID_ROLES.includes(parsed.activeRole as UserRole)
    ) {
      return INITIAL_TRACECO_STATE;
    }
    return {
      ...INITIAL_TRACECO_STATE,
      ...parsed,
      activeRole: parsed.activeRole as UserRole,
      community_activities: Array.isArray(parsed.community_activities)
        ? parsed.community_activities.map((act) => ({
            ...act,
            registeredParticipantIds: Array.isArray(
              act.registeredParticipantIds
            )
              ? act.registeredParticipantIds
              : [],
          }))
        : INITIAL_TRACECO_STATE.community_activities,
      community_posts: Array.isArray(parsed.community_posts)
        ? parsed.community_posts
        : INITIAL_TRACECO_STATE.community_posts,
      currentUserId:
        typeof parsed.currentUserId === 'string' ? parsed.currentUserId : null,
    };
  } catch {
    return INITIAL_TRACECO_STATE;
  }
}

export default function App() {
  const [state, setState] = useState<TracecoState>(loadInitialState);
  const [activePage, setActivePage] = useState<AppPageId>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>('');
  const [inspectingTargetId, setInspectingTargetId] = useState<string | null>(
    null
  );
  const [selectedTraceTargetId, setSelectedTraceTargetId] = useState<
    string | null
  >('TRC-2026-004');
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

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }, [state]);

  const currentUser = state.currentUserId
    ? state.accounts.find((a) => a.id === state.currentUserId) ?? null
    : null;

  const handleNavigate = (page: AppPageId, subTab?: string) => {
    const resolved = normalizeRoute(state.activeRole, page, subTab);
    setActivePage(resolved.page);
    setActiveSubTab(resolved.sub);
  };

  const handleOpenTraceDetail = (targetId: string) => {
    setSelectedTraceTargetId(targetId);
    if (state.activeRole === 'Kontributor') {
      setActivePage('contribution');
      setActiveSubTab('trace');
    } else {
      setInspectingTargetId(targetId);
    }
  };

  const handleLogin = (email: string, password: string): { error?: string } => {
    const res = authenticateUser(state, email, password);
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    setActivePage('dashboard');
    setActiveSubTab('');
    setInspectingTargetId(null);
    return {};
  };

  const handleRegister = (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    segment?: ContributorSegment;
    unitOrAddress: string;
  }): { error?: string } => {
    const res = registerUserAccount(state, payload);
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    setActivePage('dashboard');
    setActiveSubTab('');
    setInspectingTargetId(null);
    return {};
  };

  const handlePreviewRoleChange = (role: UserRole) => {
    setState((prev) => switchPreviewRole(prev, role));
    const allowed = ALLOWED_PAGES_BY_ROLE[role];
    if (!allowed.includes(activePage)) {
      setActivePage('dashboard');
      setActiveSubTab('');
    } else {
      setActiveSubTab(getDefaultSubTab(role, activePage));
    }
    showToast(`Tampilan peran dialihkan ke ${role}.`);
  };

  const handleLogout = () => {
    setState((prev) => logoutUser(prev));
    setActivePage('dashboard');
    setActiveSubTab('');
    setInspectingTargetId(null);
  };

  const handleSubmitContribution = (payload: {
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
  }): { error?: string; submissionId?: string } => {
    const res = submitEcobrickContributionInState(state, payload);
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    if (res.submission) {
      showToast(
        `Kontribusi ${res.submission.submissionId} (${res.submission.quantitySubmitted} unit) berhasil dicatat.`
      );
    }
    return { submissionId: res.submission?.submissionId };
  };

  const handleVerifySubmission = (params: {
    submissionId: string;
    verifierId: string;
    checklist: PhysicalChecklist;
    verifiedCount: number;
    rejectionReason?: string;
    verifiedWeightKg?: number;
  }): { error?: string; batchId?: string } => {
    const res = verifySubmissionInState(state, {
      ...params,
      verifiedAt: '2026-11-18 11:30',
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    showToast(
      res.batch
        ? `Verifikasi tersimpan · Batch ${res.batch.batchId} diterbitkan.`
        : `Verifikasi ${params.submissionId} tersimpan.`
    );
    return { batchId: res.batch?.batchId };
  };

  const handleRedeemReward = (params: {
    contributorId: string;
    rewardId: string;
  }): { error?: string } => {
    const res = redeemRewardInState(state, {
      ...params,
      requestedAt: '2026-11-18',
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    const rewardTitle =
      state.rewards.find((r) => r.id === params.rewardId)?.title ?? 'Reward';
    showToast(`Penukaran "${rewardTitle}" berhasil dicatat.`, 'Lihat Saldo', () =>
      handleNavigate('transactions', 'ledger')
    );
    return {};
  };

  const handleUpdateRedemptionStatus = (
    redemptionId: string,
    status: RedemptionStatus
  ) => {
    setState((prev) =>
      updateRedemptionStatusInState(prev, redemptionId, status, '2026-11-18')
    );
    showToast(`Status penukaran ${redemptionId} diperbarui ke ${status}.`);
  };

  const handleUpdateIncentiveStatus = (
    incentiveId: string,
    status: IncentiveStatus
  ) => {
    setState((prev) => ({
      ...prev,
      financial_incentives: prev.financial_incentives.map((fin) =>
        fin.id === incentiveId
          ? { ...fin, status, updatedAt: '2026-11-18' }
          : fin
      ),
    }));
    showToast(`Status insentif ${incentiveId} diperbarui ke ${status}.`);
  };

  const handleCreateDistributionRequest = (payload: {
    batchId: string;
    requesterId?: string;
    requesterName: string;
    requesterType: RequesterType;
    requestedCount: number;
    utilizationCategory: UtilizationCategory;
    location?: string;
    neededDate?: string;
    utilizationDetail: string;
  }): { error?: string } => {
    const res = createDistributionRequestInState(state, {
      ...payload,
      requestedAt: '2026-11-18',
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    showToast(
      `Pengajuan ${payload.requestedCount} unit dari Batch ${payload.batchId} dikirim.`
    );
    return {};
  };

  const handleUpdateDistributionStatus = (
    requestId: string,
    nextStatus: DistributionStatus,
    receiverName?: string,
    documentationNote?: string
  ) => {
    setState((prev) => {
      const reviewerName =
        prev.accounts.find((a) => a.id === prev.currentUserId)?.name ??
        'Ustadz Hendra Saputra';
      return updateDistributionStatusInState(prev, {
        requestId,
        nextStatus,
        reviewerName,
        receiverName,
        documentationNote,
        actionDate: '2026-11-18',
      });
    });
    showToast(`Distribusi ${requestId} diperbarui: ${nextStatus}.`);
  };

  const handleToggleJoinActivity = (
    activityId: string
  ): { joined: boolean; error?: string } => {
    const actorId = state.activeActorIdByRole[state.activeRole];
    const res = toggleJoinCommunityActivityInState(state, {
      activityId,
      actorId,
      actionDate: '2026-11-18',
    });
    if (res.error) {
      return { joined: false, error: res.error };
    }
    setState(res.nextState);
    showToast(
      res.joined
        ? 'Berhasil mendaftar ke kegiatan komunitas.'
        : 'Pendaftaran kegiatan komunitas dibatalkan.'
    );
    return { joined: res.joined };
  };

  const handleCreateCommunityActivity = (payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
  }): { error?: string } => {
    const creatorId = state.activeActorIdByRole[state.activeRole];
    const res = createCommunityActivityInState(state, {
      ...payload,
      creatorId,
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    showToast(`Agenda "${payload.title.trim()}" diterbitkan ke Community Hub.`);
    return {};
  };

  const handleUpdateCommunityActivityStatus = (
    activityId: string,
    status: CommunityActivity['status']
  ) => {
    setState((prev) =>
      updateCommunityActivityStatusInState(prev, activityId, status)
    );
    showToast(`Status agenda ${activityId} diperbarui ke ${status}.`);
  };

  const handleCreateCommunityPost = (payload: {
    category: CommunityPostCategory;
    title: string;
    body: string;
  }): { error?: string } => {
    const authorId = state.activeActorIdByRole[state.activeRole];
    const res = createCommunityPostInState(state, {
      ...payload,
      authorId,
      timestamp: '2026-11-18 15:10',
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    showToast('Topik forum berhasil diterbitkan.');
    return {};
  };

  const handleReplyCommunityPost = (
    postId: string,
    body: string
  ): { error?: string } => {
    const authorId = state.activeActorIdByRole[state.activeRole];
    const res = replyCommunityPostInState(state, {
      postId,
      authorId,
      body,
      timestamp: '2026-11-18 15:25',
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    showToast('Balasan forum terkirim.');
    return {};
  };

  const handleToggleCommunityPostStatus = (postId: string) => {
    setState((prev) => toggleCommunityPostStatusInState(prev, postId));
    showToast('Status topik forum diperbarui.');
  };

  const handleCreateCollaboration = (payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
  }): { error?: string } => {
    const res = createCollaborationProposalInState(state, {
      ...payload,
      proposedByRole: state.activeRole,
      actionDate: '2026-11-18',
    });
    if (res.error) {
      return { error: res.error };
    }
    setState(res.nextState);
    showToast(`Usulan kolaborasi "${payload.partnerName.trim()}" terkirim.`);
    return {};
  };

  const handleUpdateCollaborationStatus = (
    collaborationId: string,
    status: CollaborationPartner['status']
  ) => {
    setState((prev) =>
      updateCollaborationStatusInState(prev, collaborationId, status)
    );
    showToast(`Status kolaborasi ${collaborationId} diperbarui ke ${status}.`);
  };

  const handleMarkNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  };

  const handleMarkAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    showToast('Semua notifikasi ditandai sudah dibaca.');
  };

  const handleResetSimulation = () => {
    setState((prev) => {
      const customAccounts = prev.accounts.filter(
        (acc) => !INITIAL_TRACECO_STATE.accounts.some((s) => s.id === acc.id)
      );
      const customContributors = prev.contributors.filter(
        (ctr) => !INITIAL_TRACECO_STATE.contributors.some((s) => s.id === ctr.id)
      );
      return {
        ...INITIAL_TRACECO_STATE,
        currentUserId: prev.currentUserId,
        activeRole: prev.activeRole,
        activeActorIdByRole: prev.activeActorIdByRole,
        accounts: [...INITIAL_TRACECO_STATE.accounts, ...customAccounts],
        contributors: [
          ...INITIAL_TRACECO_STATE.contributors,
          ...customContributors,
        ],
      };
    });
    showToast('Data operasional berhasil direset ke kondisi awal.');
  };

  if (!currentUser) {
    return (
      <AuthPages
        accounts={state.accounts}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <AppShell
      activePage={activePage}
      activeSubTab={activeSubTab}
      onNavigate={handleNavigate}
      onPreviewRoleChange={handlePreviewRoleChange}
      onLogout={handleLogout}
      currentUser={currentUser}
      state={state}
      toast={toast}
      onDismissToast={() => setToast(null)}
    >
      {activePage === 'dashboard' && (
        <DashboardPage
          state={state}
          onNavigate={handleNavigate}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
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
          onResetSimulation={handleResetSimulation}
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
