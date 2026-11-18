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
import { AppShell } from './components/layout/AppShell';
import { TraceabilityModal } from './components/ui/TraceabilityModal';
import { AuthPages } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { EcobrickContributionPage } from './pages/EcobrickContributionPage';
import { TraceabilityPage } from './pages/TraceabilityPage';
import { VerificationTraceabilityPage } from './pages/VerificationTraceabilityPage';
import { GreenRewardPage } from './pages/GreenRewardPage';
import { EcoDistributionPage } from './pages/EcoDistributionPage';
import { EcoMonitorPage } from './pages/EcoMonitorPage';
import { CommunityHubPage } from './pages/CommunityHubPage';
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
    'reward',
    'traceability',
    'community',
    'profile',
    'notifications',
    'settings',
  ],
  Admin: [
    'dashboard',
    'contribution',
    'verification',
    'verified_list',
    'history',
    'reward',
    'inventory',
    'distribution',
    'monitor',
    'traceability',
    'community',
    'profile',
    'notifications',
    'settings',
  ],
  Mitra: [
    'dashboard',
    'distribution',
    'my_requests',
    'utilization',
    'traceability',
    'community',
    'profile',
    'notifications',
    'settings',
  ],
};

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
  const [inspectingTargetId, setInspectingTargetId] = useState<string | null>(
    null
  );
  const [selectedTraceTargetId, setSelectedTraceTargetId] = useState<
    string | null
  >('TRC-2026-004');

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

  const handleNavigate = (page: AppPageId) => {
    const allowed = ALLOWED_PAGES_BY_ROLE[state.activeRole];
    if (allowed.includes(page)) {
      setActivePage(page);
    } else {
      setActivePage('dashboard');
    }
  };

  const handleOpenTraceDetail = (targetId: string) => {
    setSelectedTraceTargetId(targetId);
    if (ALLOWED_PAGES_BY_ROLE[state.activeRole].includes('traceability')) {
      setActivePage('traceability');
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
    setInspectingTargetId(null);
    return {};
  };

  const handlePreviewRoleChange = (role: UserRole) => {
    setState((prev) => switchPreviewRole(prev, role));
    const allowed = ALLOWED_PAGES_BY_ROLE[role];
    if (!allowed.includes(activePage)) {
      setActivePage('dashboard');
    }
  };

  const handleLogout = () => {
    setState((prev) => logoutUser(prev));
    setActivePage('dashboard');
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
    return {};
  };

  const handleUpdateRedemptionStatus = (
    redemptionId: string,
    status: RedemptionStatus
  ) => {
    setState((prev) =>
      updateRedemptionStatusInState(prev, redemptionId, status, '2026-11-18')
    );
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
    return {};
  };

  const handleUpdateCommunityActivityStatus = (
    activityId: string,
    status: CommunityActivity['status']
  ) => {
    setState((prev) =>
      updateCommunityActivityStatusInState(prev, activityId, status)
    );
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
    return {};
  };

  const handleToggleCommunityPostStatus = (postId: string) => {
    setState((prev) => toggleCommunityPostStatusInState(prev, postId));
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
    return {};
  };

  const handleUpdateCollaborationStatus = (
    collaborationId: string,
    status: CollaborationPartner['status']
  ) => {
    setState((prev) =>
      updateCollaborationStatusInState(prev, collaborationId, status)
    );
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
      onNavigate={handleNavigate}
      onPreviewRoleChange={handlePreviewRoleChange}
      onLogout={handleLogout}
      currentUser={currentUser}
      state={state}
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
          onSubmitContribution={handleSubmitContribution}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
        />
      )}
      {activePage === 'traceability' && (
        <TraceabilityPage
          state={state}
          selectedTargetId={selectedTraceTargetId}
          onSelectTarget={setSelectedTraceTargetId}
          onBack={() => handleNavigate('dashboard')}
        />
      )}
      {(activePage === 'verification' ||
        activePage === 'verified_list' ||
        activePage === 'history') && (
        <VerificationTraceabilityPage
          state={state}
          viewMode={
            activePage === 'verified_list'
              ? 'verified_list'
              : activePage === 'history'
                ? 'history'
                : 'queue'
          }
          onVerifySubmission={handleVerifySubmission}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
        />
      )}
      {activePage === 'reward' && (
        <GreenRewardPage
          state={state}
          onRedeemReward={handleRedeemReward}
          onUpdateRedemptionStatus={handleUpdateRedemptionStatus}
          onUpdateIncentiveStatus={handleUpdateIncentiveStatus}
        />
      )}
      {(activePage === 'inventory' ||
        activePage === 'distribution' ||
        activePage === 'my_requests' ||
        activePage === 'utilization') && (
        <EcoDistributionPage
          state={state}
          viewMode={
            activePage === 'inventory'
              ? 'inventory'
              : activePage === 'my_requests'
                ? 'my_requests'
                : activePage === 'utilization'
                  ? 'utilization'
                  : 'distribution'
          }
          onCreateDistributionRequest={handleCreateDistributionRequest}
          onUpdateDistributionStatus={handleUpdateDistributionStatus}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
        />
      )}
      {activePage === 'monitor' && (
        <EcoMonitorPage
          state={state}
          onInspectTarget={setInspectingTargetId}
          onOpenTraceDetail={handleOpenTraceDetail}
        />
      )}
      {activePage === 'community' && (
        <CommunityHubPage
          state={state}
          onNavigate={handleNavigate}
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
          onNavigate={handleNavigate}
          onLogout={handleLogout}
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
          currentUser={currentUser}
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
