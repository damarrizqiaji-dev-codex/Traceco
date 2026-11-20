import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type {
  ActivityFeedItem,
  AppNotification,
  CollaborationPartner,
  CommunityActivity,
  CommunityPost,
  CommunityPostCategory,
  CommunityReply,
  Contributor,
  ContributorSegment,
  DistributionRequest,
  DistributionStatus,
  DropOffPoint,
  EcobrickBatch,
  EcobrickSubmission,
  FinancialIncentive,
  GreenPointEntry,
  IncentiveStatus,
  PhysicalChecklist,
  RedemptionStatus,
  RequesterType,
  RewardCatalogItem,
  RewardRedemption,
  TracecoState,
  UserAccount,
  UserRole,
  UtilizationCategory,
  UtilizationRecord,
  VerificationRecord,
} from '../types/traceco';
import {
  DEFAULT_PESANTREN_DROPOFF_POINTS,
  DEFAULT_PESANTREN_REWARDS,
  EMPTY_TRACECO_STATE,
} from '../data/seedData';
import {
  defaultSegmentForRole,
  getAvailableBatchQuantity,
  POINTS_PER_ECOBRICK,
  validateRewardCatalogPayload,
} from '../utils/tracecoLogic';

export interface LoadedUserProfile {
  account: UserAccount;
  contributor: Contributor;
  isAdminMarkerPresent: boolean;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimestampText(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

function makeShortId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function sortDescByField<T>(items: T[], getKey: (item: T) => string): T[] {
  return [...items].sort((a, b) => getKey(b).localeCompare(getKey(a)));
}

export function canUserRegisterAsAdmin(
  _email: string | null | undefined,
  emailVerified: boolean | undefined,
  _hasAdminMarker: boolean
): boolean {
  return Boolean(emailVerified);
}

export async function checkAdminMarkerExists(uid: string): Promise<boolean> {
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (error) {
    // Non-admins reading missing admin doc may receive permission-denied; treat cleanly as false
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('permission') || message.includes('insufficient')) {
      return false;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchUserProfile(
  uid: string,
  fallbackEmail: string
): Promise<LoadedUserProfile | null> {
  const publicPath = `users_public/${uid}`;
  const privatePath = `users_private/${uid}`;
  try {
    const publicSnap = await getDoc(doc(db, 'users_public', uid));
    if (!publicSnap.exists()) {
      return null;
    }
    const pubData = publicSnap.data() as Contributor;

    let email = fallbackEmail;
    let registeredAt = pubData.activeSince;
    try {
      const privSnap = await getDoc(doc(db, 'users_private', uid));
      if (privSnap.exists()) {
        const privData = privSnap.data() as {
          email?: string;
          registeredAt?: string;
        };
        if (privData.email) email = privData.email;
        if (privData.registeredAt) registeredAt = privData.registeredAt;
      }
    } catch (privErr) {
      handleFirestoreError(privErr, OperationType.GET, privatePath);
    }

    const adminMarker =
      pubData.role === 'Admin' ? await checkAdminMarkerExists(uid) : false;

    const account: UserAccount = {
      id: uid,
      name: pubData.name,
      email,
      role: pubData.role,
      segment: pubData.segment,
      unitOrAddress: pubData.unitOrAddress,
      registeredAt,
    };

    const contributor: Contributor = {
      id: uid,
      name: pubData.name,
      role: pubData.role,
      segment: pubData.segment,
      unitOrAddress: pubData.unitOrAddress,
      activeSince: pubData.activeSince,
      participationRole: pubData.participationRole,
    };

    return { account, contributor, isAdminMarkerPresent: adminMarker };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, publicPath);
  }
}

export async function completeOnboardingProfile(params: {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  role: UserRole;
  segment?: ContributorSegment;
  unitOrAddress: string;
}): Promise<LoadedUserProfile> {
  const cleanName = params.name.trim().slice(0, 100);
  const cleanUnit = params.unitOrAddress.trim().slice(0, 180);
  if (cleanName.length < 2) {
    throw new Error('Nama lengkap minimal 2 karakter.');
  }
  if (cleanUnit.length < 2) {
    throw new Error('Unit asrama, instansi, atau alamat minimal 2 karakter.');
  }

  const hasMarker = await checkAdminMarkerExists(params.uid);
  if (params.role === 'Admin' && !params.emailVerified) {
    throw new Error(
      'Akun Google Anda belum terverifikasi untuk mendaftar sebagai Admin.'
    );
  }

  const resolvedSegment: ContributorSegment =
    params.role === 'Kontributor'
      ? params.segment &&
        ['Santri', 'Warga', 'Keluarga Rentan'].includes(params.segment)
        ? params.segment
        : 'Santri'
      : defaultSegmentForRole(params.role);

  const today = todayIsoDate();
  const participationRole =
    params.role === 'Kontributor'
      ? `Kontributor ecobrick (${resolvedSegment})`
      : params.role === 'Mitra'
        ? 'Mitra pemanfaat ecobrick terverifikasi'
        : 'Admin pengelola operasional Eco-Hub';

  const batch = writeBatch(db);

  if (!hasMarker && params.role === 'Admin') {
    batch.set(doc(db, 'admins', params.uid), {
      uid: params.uid,
      email: params.email,
      name: cleanName,
      createdAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'users_public', params.uid), {
    id: params.uid,
    name: cleanName,
    role: params.role,
    segment: resolvedSegment,
    unitOrAddress: cleanUnit,
    activeSince: today,
    participationRole,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'users_private', params.uid), {
    id: params.uid,
    email: params.email,
    role: params.role,
    registeredAt: today,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `users_public/${params.uid}`
    );
  }

  return {
    account: {
      id: params.uid,
      name: cleanName,
      email: params.email,
      role: params.role,
      segment: resolvedSegment,
      unitOrAddress: cleanUnit,
      registeredAt: today,
    },
    contributor: {
      id: params.uid,
      name: cleanName,
      role: params.role,
      segment: resolvedSegment,
      unitOrAddress: cleanUnit,
      activeSince: today,
      participationRole,
    },
    isAdminMarkerPresent: params.role === 'Admin',
  };
}

export async function restoreBootstrappedAdminRoleInFirestore(
  existingProfile: LoadedUserProfile,
  verifiedEmail: string
): Promise<LoadedUserProfile> {
  const uid = existingProfile.account.id;
  if (
    verifiedEmail.toLowerCase() !== BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  ) {
    return existingProfile;
  }

  const needsMarker = !existingProfile.isAdminMarkerPresent;
  const needsRoleUpdate = existingProfile.account.role !== 'Admin';
  if (!needsMarker && !needsRoleUpdate) {
    return existingProfile;
  }

  const batch = writeBatch(db);
  if (needsMarker) {
    batch.set(doc(db, 'admins', uid), {
      uid,
      email: verifiedEmail,
      name: existingProfile.account.name.slice(0, 100),
      createdAt: serverTimestamp(),
    });
  }

  const participationRole = 'Admin pengelola operasional Eco-Hub';
  if (needsRoleUpdate) {
    batch.update(doc(db, 'users_public', uid), {
      role: 'Admin',
      segment: 'Admin',
      participationRole,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users_private', uid), {
      role: 'Admin',
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users_public/${uid}`);
  }

  return {
    account: {
      ...existingProfile.account,
      role: 'Admin',
      segment: 'Admin',
    },
    contributor: {
      ...existingProfile.contributor,
      role: 'Admin',
      segment: 'Admin',
      participationRole,
    },
    isAdminMarkerPresent: true,
  };
}

export async function updateProfileInfoInFirestore(params: {
  uid: string;
  role: UserRole;
  name: string;
  segment: ContributorSegment;
  unitOrAddress: string;
  participationRole?: string;
}): Promise<void> {
  const path = `users_public/${params.uid}`;
  const cleanName = params.name.trim();
  const cleanUnit = params.unitOrAddress.trim();
  if (cleanName.length < 2 || cleanUnit.length < 2) {
    throw new Error('Nama dan unit/alamat minimal 2 karakter.');
  }
  const safeSegment =
    params.role === 'Kontributor'
      ? ['Santri', 'Warga', 'Keluarga Rentan'].includes(params.segment)
        ? params.segment
        : 'Santri'
      : defaultSegmentForRole(params.role);

  try {
    await updateDoc(doc(db, 'users_public', params.uid), {
      name: cleanName,
      segment: safeSegment,
      unitOrAddress: cleanUnit,
      ...(params.participationRole !== undefined
        ? { participationRole: params.participationRole.trim().slice(0, 180) }
        : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeRoleScopedState(
  uid: string,
  role: UserRole,
  currentUserAccount: UserAccount,
  onStateChange: (nextState: TracecoState) => void,
  onSyncError?: (message: string) => void
): () => void {
  let state: TracecoState = {
    ...EMPTY_TRACECO_STATE,
    currentUserId: uid,
    activeRole: role,
    accounts: [currentUserAccount],
  };

  const unsubs: Unsubscribe[] = [];
  const rsvpUnsubs = new Map<string, Unsubscribe>();
  const replyUnsubs = new Map<string, Unsubscribe>();
  const rsvpByActivity = new Map<string, boolean>();
  const repliesByPost = new Map<string, CommunityReply[]>();
  const feedBuckets = new Map<string, ActivityFeedItem[]>();

  const reportSyncError = (
    error: unknown,
    operationType: OperationType,
    pathLabel: string
  ) => {
    const rawMsg = error instanceof Error ? error.message : String(error);
    console.error('Firestore Sync Error:', {
      operationType,
      path: pathLabel,
      error: rawMsg,
    });
    if (onSyncError) {
      if (rawMsg.toLowerCase().includes('permission')) {
        onSyncError(
          `Akses sinkronisasi ke "${pathLabel}" ditolak oleh aturan Firestore. Pastikan akun & aturan database sudah selaras.`
        );
      } else {
        onSyncError(
          `Gagal menyinkronkan "${pathLabel}": ${rawMsg}`
        );
      }
    }
  };

  const emit = () => {
    const mergedActivities = state.community_activities.map((act) => ({
      ...act,
      registeredParticipantIds: rsvpByActivity.get(act.id) ? [uid] : [],
    }));
    const mergedPosts = state.community_posts.map((post) => ({
      ...post,
      replies: repliesByPost.get(post.id) ?? [],
    }));

    const feedMap = new Map<string, ActivityFeedItem>();
    for (const bucket of feedBuckets.values()) {
      for (const item of bucket) {
        feedMap.set(item.id, item);
      }
    }

    onStateChange({
      ...state,
      community_activities: mergedActivities,
      community_posts: mergedPosts,
      recent_activities: sortDescByField(
        Array.from(feedMap.values()),
        (item) => item.timestamp
      ),
    });
  };

  const watch = <T>(
    ref: Parameters<typeof onSnapshot>[0],
    pathLabel: string,
    handler: (docs: T[]) => void
  ) => {
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as T);
        handler(items);
        emit();
      },
      (error) => {
        reportSyncError(error, OperationType.LIST, pathLabel);
      }
    );
    unsubs.push(unsub);
  };

  // Shared non-PII ecosystem profile directory (Kontributor/Admin/Mitra)
  watch<Contributor>(
    query(
      collection(db, 'users_public'),
      where('role', 'in', ['Kontributor', 'Admin', 'Mitra'])
    ),
    'users_public',
    (contributors) => {
      state = {
        ...state,
        contributors,
        accounts: contributors.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.id === uid ? currentUserAccount.email : '',
          role: c.role,
          segment: c.segment,
          unitOrAddress: c.unitOrAddress,
          registeredAt: c.activeSince,
        })),
      };
    }
  );

  // Drop-off points (Kontributor + Admin need list)
  if (role === 'Kontributor' || role === 'Admin') {
    watch<DropOffPoint>(
      query(collection(db, 'dropoff_points'), where('id', '>=', '')),
      'dropoff_points',
      (points) => {
        state = { ...state, dropoff_points: points };
      }
    );
  }

  // Community Hub activities + per-user RSVP doc
  watch<CommunityActivity>(
    query(
      collection(db, 'community_activities'),
      where('status', 'in', ['Terjadwal', 'Berlangsung', 'Selesai'])
    ),
    'community_activities',
    (activities) => {
      const nextIds = new Set(activities.map((a) => a.id));
      for (const [actId, unsub] of rsvpUnsubs.entries()) {
        if (!nextIds.has(actId)) {
          unsub();
          rsvpUnsubs.delete(actId);
          rsvpByActivity.delete(actId);
        }
      }
      for (const act of activities) {
        if (!rsvpUnsubs.has(act.id)) {
          const rsvpPath = `community_activities/${act.id}/rsvps/${uid}`;
          const rsvpUnsub = onSnapshot(
            doc(db, 'community_activities', act.id, 'rsvps', uid),
            (snap) => {
              rsvpByActivity.set(act.id, snap.exists());
              emit();
            },
            (err) => {
              reportSyncError(err, OperationType.GET, rsvpPath);
            }
          );
          rsvpUnsubs.set(act.id, rsvpUnsub);
        }
      }
      state = {
        ...state,
        community_activities: sortDescByField(activities, (a) => a.date),
      };
    }
  );

  // Community Hub forum posts + subcollection replies
  watch<CommunityPost>(
    query(
      collection(db, 'community_posts'),
      where('status', 'in', ['Terbuka', 'Terjawab'])
    ),
    'community_posts',
    (posts) => {
      const nextIds = new Set(posts.map((p) => p.id));
      for (const [postId, unsub] of replyUnsubs.entries()) {
        if (!nextIds.has(postId)) {
          unsub();
          replyUnsubs.delete(postId);
          repliesByPost.delete(postId);
        }
      }
      for (const post of posts) {
        if (!replyUnsubs.has(post.id)) {
          const repliesPath = `community_posts/${post.id}/replies`;
          const replyUnsub = onSnapshot(
            query(
              collection(db, 'community_posts', post.id, 'replies'),
              where('postId', '==', post.id)
            ),
            (snap) => {
              const items = snap.docs
                .map((d) => d.data() as CommunityReply)
                .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
              repliesByPost.set(post.id, items);
              emit();
            },
            (err) => {
              reportSyncError(err, OperationType.LIST, repliesPath);
            }
          );
          replyUnsubs.set(post.id, replyUnsub);
        }
      }
      state = {
        ...state,
        community_posts: sortDescByField(posts, (p) => p.timestamp),
      };
    }
  );

  // Community Hub collaborations
  watch<CollaborationPartner>(
    query(
      collection(db, 'collaborations'),
      where('status', 'in', ['Aktif', 'Dalam Koordinasi', 'Selesai'])
    ),
    'collaborations',
    (collaborations) => {
      state = { ...state, collaborations };
    }
  );

  // Notifications scoped by recipientUid (or all for Admin)
  watch<AppNotification>(
    role === 'Admin'
      ? collection(db, 'notifications')
      : query(
          collection(db, 'notifications'),
          where('recipientUid', '==', uid)
        ),
    'notifications',
    (notifications) => {
      state = {
        ...state,
        notifications: sortDescByField(notifications, (n) => n.timestamp),
      };
    }
  );

  if (role === 'Kontributor') {
    watch<EcobrickSubmission>(
      query(
        collection(db, 'ecobrick_submissions'),
        where('contributorId', '==', uid)
      ),
      'ecobrick_submissions',
      (submissions) => {
        state = {
          ...state,
          ecobrick_submissions: sortDescByField(submissions, (s) => s.date),
        };
      }
    );

    watch<VerificationRecord>(
      query(
        collection(db, 'verification_records'),
        where('contributorId', '==', uid)
      ),
      'verification_records',
      (records) => {
        state = {
          ...state,
          verification_records: sortDescByField(records, (r) => r.verifiedAt),
        };
      }
    );

    watch<EcobrickBatch>(
      query(
        collection(db, 'ecobrick_batches'),
        where('contributorId', '==', uid)
      ),
      'ecobrick_batches',
      (batches) => {
        state = {
          ...state,
          ecobrick_batches: sortDescByField(batches, (b) => b.verifiedAt),
        };
      }
    );

    watch<GreenPointEntry>(
      query(collection(db, 'green_points'), where('contributorId', '==', uid)),
      'green_points',
      (points) => {
        state = {
          ...state,
          green_points: sortDescByField(points, (p) => p.date),
        };
      }
    );

    watch<RewardCatalogItem>(
      query(collection(db, 'rewards'), where('pointsCost', '>', 0)),
      'rewards',
      (rewards) => {
        state = { ...state, rewards };
      }
    );

    watch<RewardRedemption>(
      query(collection(db, 'redemptions'), where('contributorId', '==', uid)),
      'redemptions',
      (redemptions) => {
        state = {
          ...state,
          redemptions: sortDescByField(redemptions, (r) => r.requestedAt),
        };
      }
    );

    watch<FinancialIncentive>(
      query(
        collection(db, 'financial_incentives'),
        where('contributorId', '==', uid)
      ),
      'financial_incentives',
      (incentives) => {
        state = { ...state, financial_incentives: incentives };
      }
    );

    watch<DistributionRequest>(
      query(
        collection(db, 'distribution_requests'),
        where('batchContributorId', '==', uid)
      ),
      'distribution_requests',
      (requests) => {
        state = {
          ...state,
          distribution_requests: sortDescByField(requests, (r) => r.requestedAt),
        };
      }
    );

    watch<UtilizationRecord>(
      query(
        collection(db, 'utilization_records'),
        where('batchContributorId', '==', uid)
      ),
      'utilization_records',
      (records) => {
        state = {
          ...state,
          utilization_records: sortDescByField(records, (u) => u.documentedAt),
        };
      }
    );

    watch<ActivityFeedItem>(
      query(collection(db, 'activities_feed'), where('actorUid', '==', uid)),
      'activities_feed',
      (items) => feedBuckets.set('actor', items)
    );
    watch<ActivityFeedItem>(
      query(
        collection(db, 'activities_feed'),
        where('targetContributorUid', '==', uid)
      ),
      'activities_feed',
      (items) => feedBuckets.set('target', items)
    );
    watch<ActivityFeedItem>(
      query(
        collection(db, 'activities_feed'),
        where('category', '==', 'Komunitas')
      ),
      'activities_feed',
      (items) => feedBuckets.set('community', items)
    );
  } else if (role === 'Mitra') {
    watch<EcobrickBatch>(
      query(collection(db, 'ecobrick_batches'), where('quantity', '>', 0)),
      'ecobrick_batches',
      (batches) => {
        state = {
          ...state,
          ecobrick_batches: sortDescByField(batches, (b) => b.verifiedAt),
        };
      }
    );

    watch<DistributionRequest>(
      query(
        collection(db, 'distribution_requests'),
        where('requesterId', '==', uid)
      ),
      'distribution_requests',
      (requests) => {
        state = {
          ...state,
          distribution_requests: sortDescByField(requests, (r) => r.requestedAt),
        };
      }
    );

    watch<UtilizationRecord>(
      query(
        collection(db, 'utilization_records'),
        where('requesterId', '==', uid)
      ),
      'utilization_records',
      (records) => {
        state = {
          ...state,
          utilization_records: sortDescByField(records, (u) => u.documentedAt),
        };
      }
    );

    watch<ActivityFeedItem>(
      query(collection(db, 'activities_feed'), where('actorUid', '==', uid)),
      'activities_feed',
      (items) => feedBuckets.set('actor', items)
    );
    watch<ActivityFeedItem>(
      query(
        collection(db, 'activities_feed'),
        where('category', '==', 'Komunitas')
      ),
      'activities_feed',
      (items) => feedBuckets.set('community', items)
    );
  } else if (role === 'Admin') {
    watch<EcobrickSubmission>(
      collection(db, 'ecobrick_submissions'),
      'ecobrick_submissions',
      (submissions) => {
        state = {
          ...state,
          ecobrick_submissions: sortDescByField(submissions, (s) => s.date),
        };
      }
    );
    watch<VerificationRecord>(
      collection(db, 'verification_records'),
      'verification_records',
      (records) => {
        state = {
          ...state,
          verification_records: sortDescByField(records, (r) => r.verifiedAt),
        };
      }
    );
    watch<EcobrickBatch>(
      collection(db, 'ecobrick_batches'),
      'ecobrick_batches',
      (batches) => {
        state = {
          ...state,
          ecobrick_batches: sortDescByField(batches, (b) => b.verifiedAt),
        };
      }
    );
    watch<GreenPointEntry>(
      collection(db, 'green_points'),
      'green_points',
      (points) => {
        state = {
          ...state,
          green_points: sortDescByField(points, (p) => p.date),
        };
      }
    );
    watch<RewardCatalogItem>(
      query(collection(db, 'rewards'), where('pointsCost', '>', 0)),
      'rewards',
      (rewards) => {
        state = { ...state, rewards };
      }
    );
    watch<RewardRedemption>(
      collection(db, 'redemptions'),
      'redemptions',
      (redemptions) => {
        state = {
          ...state,
          redemptions: sortDescByField(redemptions, (r) => r.requestedAt),
        };
      }
    );
    watch<FinancialIncentive>(
      collection(db, 'financial_incentives'),
      'financial_incentives',
      (incentives) => {
        state = { ...state, financial_incentives: incentives };
      }
    );
    watch<DistributionRequest>(
      collection(db, 'distribution_requests'),
      'distribution_requests',
      (requests) => {
        state = {
          ...state,
          distribution_requests: sortDescByField(requests, (r) => r.requestedAt),
        };
      }
    );
    watch<UtilizationRecord>(
      collection(db, 'utilization_records'),
      'utilization_records',
      (records) => {
        state = {
          ...state,
          utilization_records: sortDescByField(records, (u) => u.documentedAt),
        };
      }
    );
    watch<ActivityFeedItem>(
      collection(db, 'activities_feed'),
      'activities_feed',
      (items) => feedBuckets.set('admin_all', items)
    );
  }

  return () => {
    for (const unsub of unsubs) unsub();
    for (const unsub of rsvpUnsubs.values()) unsub();
    for (const unsub of replyUnsubs.values()) unsub();
  };
}

// =========================================================
// TRANSACTIONAL & BATCHED WRITE OPERATIONS
// =========================================================

export async function createDropOffPointInFirestore(payload: {
  name: string;
  area: string;
  schedule: string;
  coordinator: string;
}): Promise<string> {
  const name = payload.name.trim().slice(0, 120);
  const area = payload.area.trim().slice(0, 160);
  const schedule = payload.schedule.trim().slice(0, 120);
  const coordinator = payload.coordinator.trim().slice(0, 100);
  if (name.length < 2 || area.length < 2 || schedule.length < 2 || coordinator.length < 2) {
    throw new Error('Semua kolom titik serah wajib diisi minimal 2 karakter.');
  }

  const pointId = makeShortId('DP');
  const path = `dropoff_points/${pointId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'dropoff_points', pointId), {
      id: pointId,
      name,
      area,
      schedule,
      coordinator,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return pointId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createRewardCatalogItemInFirestore(payload: {
  title: string;
  category: RewardCatalogItem['category'];
  pointsCost: number;
  description: string;
  stockNote: string;
}): Promise<string> {
  const validation = validateRewardCatalogPayload(payload);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const { title, category, pointsCost, description, stockNote } =
    validation.normalized;

  const rewardId = makeShortId('REW');
  const path = `rewards/${rewardId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'rewards', rewardId), {
      id: rewardId,
      title,
      category,
      pointsCost,
      description,
      stockNote,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return rewardId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRewardCatalogItemInFirestore(
  rewardId: string,
  payload: {
    title: string;
    category: RewardCatalogItem['category'];
    pointsCost: number;
    description: string;
    stockNote: string;
  }
): Promise<void> {
  const cleanId = rewardId.trim();
  if (!cleanId) {
    throw new Error('ID item reward tidak valid.');
  }

  const validation = validateRewardCatalogPayload(payload);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const { title, category, pointsCost, description, stockNote } =
    validation.normalized;

  const path = `rewards/${cleanId}`;
  try {
    await updateDoc(doc(db, 'rewards', cleanId), {
      title,
      category,
      pointsCost,
      description,
      stockNote,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRewardCatalogItemInFirestore(
  rewardId: string
): Promise<void> {
  const cleanId = rewardId.trim();
  if (!cleanId) {
    throw new Error('ID item reward tidak valid.');
  }

  const path = `rewards/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'rewards', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function initializeMasterCatalogInFirestore(
  existingDropoffIds: string[],
  existingRewardIds: string[]
): Promise<{ createdDropoffs: number; createdRewards: number }> {
  const missingDropoffs = DEFAULT_PESANTREN_DROPOFF_POINTS.filter(
    (dp) => !existingDropoffIds.includes(dp.id)
  );
  const missingRewards = DEFAULT_PESANTREN_REWARDS.filter(
    (rw) => !existingRewardIds.includes(rw.id)
  );

  if (missingDropoffs.length === 0 && missingRewards.length === 0) {
    return { createdDropoffs: 0, createdRewards: 0 };
  }

  const batch = writeBatch(db);
  for (const dp of missingDropoffs) {
    batch.set(doc(db, 'dropoff_points', dp.id), {
      id: dp.id,
      name: dp.name,
      area: dp.area,
      schedule: dp.schedule,
      coordinator: dp.coordinator,
      createdAt: serverTimestamp(),
    });
  }
  for (const rw of missingRewards) {
    batch.set(doc(db, 'rewards', rw.id), {
      id: rw.id,
      title: rw.title,
      category: rw.category,
      pointsCost: rw.pointsCost,
      description: rw.description,
      stockNote: rw.stockNote,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return {
      createdDropoffs: missingDropoffs.length,
      createdRewards: missingRewards.length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dropoff_points');
  }
}

export async function submitEcobrickContributionInFirestore(
  state: TracecoState,
  payload: {
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
  }
): Promise<string> {
  if (!Number.isInteger(payload.quantitySubmitted) || payload.quantitySubmitted <= 0) {
    throw new Error('Jumlah unit ecobrick harus minimal 1.');
  }
  const dropoff = state.dropoff_points.find(
    (d) => d.id === payload.dropoffPointId
  );
  if (!dropoff) {
    throw new Error('Titik serah Eco-Hub tidak ditemukan.');
  }
  const contributor = state.contributors.find(
    (c) => c.id === payload.contributorId
  );
  if (!contributor) {
    throw new Error('Profil kontributor belum tersedia.');
  }

  if (payload.photoDataUrl && payload.photoDataUrl.length > 440000) {
    throw new Error(
      'Ukuran foto setelah kompresi masih terlalu besar (maks 440 KB). Pilih foto dengan resolusi lebih kecil.'
    );
  }

  const submissionId = makeShortId('TRC');
  const actId = makeShortId('ACT');
  const ts = nowTimestampText();

  const batch = writeBatch(db);
  batch.set(doc(db, 'ecobrick_submissions', submissionId), {
    submissionId,
    contributorId: payload.contributorId,
    dropoffPointId: dropoff.id,
    dropoffPointName: dropoff.name.slice(0, 120),
    date: payload.date,
    bottleSize: payload.bottleSize.slice(0, 100),
    quantitySubmitted: payload.quantitySubmitted,
    ...(typeof payload.weightKg === 'number' && !Number.isNaN(payload.weightKg)
      ? { weightKg: Number(payload.weightKg.toFixed(2)) }
      : {}),
    ...(typeof payload.iotSimulatedWeightKg === 'number' &&
    !Number.isNaN(payload.iotSimulatedWeightKg)
      ? { iotSimulatedWeightKg: Number(payload.iotSimulatedWeightKg.toFixed(2)) }
      : {}),
    ...(payload.photoDataUrl ? { photoDataUrl: payload.photoDataUrl } : {}),
    ...(payload.photoLabel ? { photoLabel: payload.photoLabel.slice(0, 120) } : {}),
    ...(payload.notes?.trim() ? { notes: payload.notes.trim().slice(0, 500) } : {}),
    status: 'Pending',
    verifiedQuantity: 0,
    rejectedQuantity: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'activities_feed', actId), {
    id: actId,
    actorUid: payload.contributorId,
    targetContributorUid: payload.contributorId,
    timestamp: ts,
    category: 'Kontribusi',
    title: `Kontribusi ${submissionId} diserahkan (${payload.quantitySubmitted} unit)`.slice(0, 180),
    detail: `${contributor.name} (${contributor.segment}) menyerahkan ke ${dropoff.name}.`.slice(0, 400),
    submissionId,
    createdAt: serverTimestamp(),
  });

  // Notify registered Admins
  const adminRecipients = state.contributors.filter((c) => c.role === 'Admin');
  for (const admin of adminRecipients) {
    const notifId = makeShortId('NTF');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientUid: admin.id,
      recipientRole: 'Admin',
      title: `Kontribusi Baru ${submissionId} Menunggu Verifikasi`.slice(0, 160),
      detail: `${contributor.name} menyerahkan ${payload.quantitySubmitted} unit di ${dropoff.name}.`.slice(0, 400),
      timestamp: ts,
      category: 'Submission',
      read: false,
      targetPage: 'verification',
      createdByUid: payload.contributorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return submissionId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `ecobrick_submissions/${submissionId}`
    );
  }
}

export async function verifySubmissionInFirestore(
  state: TracecoState,
  params: {
    submissionId: string;
    verifierId: string;
    checklist: PhysicalChecklist;
    verifiedCount: number;
    rejectionReason?: string;
    verifiedWeightKg?: number;
  }
): Promise<{ batchId?: string }> {
  const submission = state.ecobrick_submissions.find(
    (s) => s.submissionId === params.submissionId
  );
  if (!submission) {
    throw new Error('Submission tidak ditemukan.');
  }
  if (submission.status !== 'Pending') {
    throw new Error('Submission sudah pernah diverifikasi sebelumnya.');
  }
  if (submission.contributorId === params.verifierId) {
    throw new Error(
      'Pemisahan wewenang: Anda tidak dapat memverifikasi kontribusi milik Anda sendiri.'
    );
  }

  const verifiedCount = Math.max(
    0,
    Math.min(submission.quantitySubmitted, Math.floor(params.verifiedCount))
  );
  const rejectedCount = submission.quantitySubmitted - verifiedCount;
  if (rejectedCount > 0 && !params.rejectionReason?.trim()) {
    throw new Error(
      'Alasan penolakan atau perbaikan wajib diisi apabila ada unit yang ditolak.'
    );
  }

  const decision: VerificationRecord['decision'] =
    verifiedCount === 0
      ? 'Rejected'
      : rejectedCount === 0
        ? 'Verified'
        : 'Partially Verified';

  const verifier = state.contributors.find((c) => c.id === params.verifierId);
  const contributor = state.contributors.find(
    (c) => c.id === submission.contributorId
  );
  const today = todayIsoDate();
  const ts = nowTimestampText();
  const verId = makeShortId('VER');
  const batchId = verifiedCount > 0 ? makeShortId('TRCB') : undefined;
  const actId = makeShortId('ACT');
  const notifId = makeShortId('NTF');

  const estimatedPerUnitKg = submission.bottleSize.includes('1500')
    ? 0.52
    : submission.bottleSize.includes('1000')
      ? 0.42
      : 0.27;
  const finalWeightKg =
    verifiedCount > 0
      ? params.verifiedWeightKg && params.verifiedWeightKg > 0
        ? Number(params.verifiedWeightKg.toFixed(2))
        : submission.weightKg && submission.quantitySubmitted > 0
          ? Number(
              (
                (submission.weightKg / submission.quantitySubmitted) *
                verifiedCount
              ).toFixed(2)
            )
          : Number((verifiedCount * estimatedPerUnitKg).toFixed(2))
      : 0;

  const batch = writeBatch(db);

  batch.update(doc(db, 'ecobrick_submissions', submission.submissionId), {
    status: decision,
    verifiedQuantity: verifiedCount,
    rejectedQuantity: rejectedCount,
    ...(finalWeightKg > 0 ? { weightKg: finalWeightKg } : {}),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'verification_records', verId), {
    id: verId,
    submissionId: submission.submissionId,
    contributorId: submission.contributorId,
    ...(batchId ? { batchId } : {}),
    checklist: params.checklist,
    verifierId: params.verifierId,
    verifierName: (verifier?.name ?? 'Admin Eco-Hub').slice(0, 100),
    verifiedAt: ts,
    verifiedCount,
    rejectedCount,
    decision,
    ...(params.rejectionReason?.trim()
      ? { rejectionReason: params.rejectionReason.trim().slice(0, 400) }
      : {}),
    createdAt: serverTimestamp(),
  });

  if (verifiedCount > 0 && batchId) {
    batch.set(doc(db, 'ecobrick_batches', batchId), {
      batchId,
      submissionId: submission.submissionId,
      contributorId: submission.contributorId,
      date: submission.date,
      verifiedAt: ts,
      bottleSize: submission.bottleSize.slice(0, 100),
      quantity: verifiedCount,
      weightKg: Math.min(1000, finalWeightKg),
      notes: (rejectedCount > 0
        ? `Terverifikasi ${verifiedCount} dari ${submission.quantitySubmitted} unit (${rejectedCount} ditolak).`
        : `Lot terverifikasi penuh dari submission ${submission.submissionId}.`
      ).slice(0, 400),
      createdAt: serverTimestamp(),
    });

    const earnedPoints = verifiedCount * POINTS_PER_ECOBRICK;
    const gpId = makeShortId('GP');
    batch.set(doc(db, 'green_points', gpId), {
      id: gpId,
      contributorId: submission.contributorId,
      date: today,
      type: 'Earned',
      points: earnedPoints,
      sourceLabel: `Verifikasi ${submission.submissionId} (${verifiedCount} ecobrick terverifikasi · Batch ${batchId})`.slice(0, 220),
      submissionId: submission.submissionId,
      batchId,
      createdAt: serverTimestamp(),
    });

    if (contributor?.segment === 'Keluarga Rentan') {
      const finId = makeShortId('FIN');
      batch.set(doc(db, 'financial_incentives', finId), {
        id: finId,
        contributorId: submission.contributorId,
        batchId,
        amountIdr: verifiedCount * 5000,
        fundingSource: 'Dana Dukungan Program Sosial Pesantren',
        conditionNote: `Insentif bersyarat untuk ${verifiedCount} unit terverifikasi segmen Keluarga Rentan.`.slice(0, 300),
        status: 'Pending',
        updatedAt: today,
        createdAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    }
  }

  batch.set(doc(db, 'activities_feed', actId), {
    id: actId,
    actorUid: params.verifierId,
    targetContributorUid: submission.contributorId,
    timestamp: ts,
    category: 'Verifikasi',
    title: (verifiedCount > 0
      ? `${submission.submissionId}: ${verifiedCount} Verified -> Batch ${batchId}`
      : `${submission.submissionId}: Ditolak pada inspeksi fisik`
    ).slice(0, 180),
    detail: (verifiedCount > 0
      ? `${verifiedCount} unit masuk inventori terverifikasi · +${verifiedCount * POINTS_PER_ECOBRICK} Green Points.`
      : params.rejectionReason?.trim() ?? 'Belum memenuhi 8 kriteria fisik.'
    ).slice(0, 400),
    submissionId: submission.submissionId,
    ...(batchId ? { batchId } : {}),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    recipientUid: submission.contributorId,
    recipientRole: 'Kontributor',
    title: (verifiedCount > 0
      ? `Kontribusi ${submission.submissionId} Terverifikasi (+${verifiedCount * POINTS_PER_ECOBRICK} GP)`
      : `Kontribusi ${submission.submissionId} Perlu Perbaikan`
    ).slice(0, 160),
    detail: (verifiedCount > 0
      ? `${verifiedCount} ecobrick diterbitkan ke Batch ${batchId}.`
      : params.rejectionReason?.trim() ?? 'Lihat catatan verifikator pada detail kontribusi.'
    ).slice(0, 400),
    timestamp: ts,
    category: 'Verification',
    read: false,
    targetPage: 'contribution',
    createdByUid: params.verifierId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { batchId };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `verification_records/${verId}`
    );
  }
}

export async function redeemRewardInFirestore(
  state: TracecoState,
  params: {
    contributorId: string;
    rewardId: string;
  }
): Promise<string> {
  const reward = state.rewards.find((r) => r.id === params.rewardId);
  if (!reward) {
    throw new Error('Reward tidak ditemukan di katalog.');
  }

  const earned = state.green_points
    .filter((g) => g.contributorId === params.contributorId && g.type === 'Earned')
    .reduce((sum, g) => sum + g.points, 0);
  const redeemed = state.green_points
    .filter(
      (g) => g.contributorId === params.contributorId && g.type === 'Redeemed'
    )
    .reduce((sum, g) => sum + g.points, 0);
  const balance = earned - redeemed;

  if (balance < reward.pointsCost) {
    throw new Error(
      `Saldo Green Points (${balance}) belum mencukupi (${reward.pointsCost} poin dibutuhkan).`
    );
  }

  const contributor = state.contributors.find(
    (c) => c.id === params.contributorId
  );
  const today = todayIsoDate();
  const ts = nowTimestampText();
  const redemptionId = makeShortId('RDM');
  const gpId = makeShortId('GP');
  const actId = makeShortId('ACT');

  const batch = writeBatch(db);
  batch.set(doc(db, 'redemptions', redemptionId), {
    id: redemptionId,
    contributorId: params.contributorId,
    rewardId: reward.id,
    rewardTitle: reward.title.slice(0, 120),
    pointsCost: reward.pointsCost,
    status: 'Pending',
    requestedAt: today,
    updatedAt: today,
    createdAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'green_points', gpId), {
    id: gpId,
    contributorId: params.contributorId,
    date: today,
    type: 'Redeemed',
    points: reward.pointsCost,
    sourceLabel: `Penukaran (${redemptionId}): ${reward.title}`.slice(0, 220),
    redemptionId,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'activities_feed', actId), {
    id: actId,
    actorUid: params.contributorId,
    targetContributorUid: params.contributorId,
    timestamp: ts,
    category: 'Reward',
    title: `Penukaran ${redemptionId}: ${reward.title}`.slice(0, 180),
    detail: `${contributor?.name ?? 'Kontributor'} menukar ${reward.pointsCost} Green Points.`.slice(0, 400),
    createdAt: serverTimestamp(),
  });

  for (const admin of state.contributors.filter((c) => c.role === 'Admin')) {
    const notifId = makeShortId('NTF');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientUid: admin.id,
      recipientRole: 'Admin',
      title: `Permintaan Penukaran ${redemptionId}`.slice(0, 160),
      detail: `${contributor?.name ?? 'Kontributor'} menukar ${reward.pointsCost} GP untuk ${reward.title}.`.slice(0, 400),
      timestamp: ts,
      category: 'Reward',
      read: false,
      targetPage: 'reward',
      createdByUid: params.contributorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return redemptionId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `redemptions/${redemptionId}`
    );
  }
}

export async function updateRedemptionStatusInFirestore(
  state: TracecoState,
  redemptionId: string,
  status: RedemptionStatus,
  adminUid: string
): Promise<void> {
  const target = state.redemptions.find((r) => r.id === redemptionId);
  if (!target) throw new Error('Data penukaran tidak ditemukan.');
  const today = todayIsoDate();
  const ts = nowTimestampText();
  const notifId = makeShortId('NTF');

  const batch = writeBatch(db);
  batch.update(doc(db, 'redemptions', redemptionId), {
    status,
    updatedAt: today,
    serverUpdatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    recipientUid: target.contributorId,
    recipientRole: 'Kontributor',
    title: `Status Penukaran ${redemptionId}: ${status}`,
    detail: `Permintaan reward "${target.rewardTitle}" diperbarui menjadi ${status}.`,
    timestamp: ts,
    category: 'Reward',
    read: false,
    targetPage: 'marketplace',
    createdByUid: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `redemptions/${redemptionId}`
    );
  }
}

export async function updateIncentiveStatusInFirestore(
  state: TracecoState,
  incentiveId: string,
  status: IncentiveStatus,
  adminUid: string
): Promise<void> {
  const target = state.financial_incentives.find((i) => i.id === incentiveId);
  if (!target) throw new Error('Data insentif tidak ditemukan.');
  const today = todayIsoDate();
  const ts = nowTimestampText();
  const notifId = makeShortId('NTF');

  const batch = writeBatch(db);
  batch.update(doc(db, 'financial_incentives', incentiveId), {
    status,
    updatedAt: today,
    serverUpdatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    recipientUid: target.contributorId,
    recipientRole: 'Kontributor',
    title: `Insentif ${incentiveId}: ${status}`,
    detail: `Status dukungan Rp ${target.amountIdr.toLocaleString('id-ID')} diperbarui ke ${status}.`,
    timestamp: ts,
    category: 'Reward',
    read: false,
    targetPage: 'transactions',
    createdByUid: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `financial_incentives/${incentiveId}`
    );
  }
}

export async function createDistributionRequestInFirestore(
  state: TracecoState,
  payload: {
    batchId: string;
    requesterId: string;
    requesterName: string;
    requesterType: RequesterType;
    requestedCount: number;
    utilizationCategory: UtilizationCategory;
    location?: string;
    neededDate?: string;
    utilizationDetail: string;
  }
): Promise<string> {
  const targetBatch = state.ecobrick_batches.find(
    (b) => b.batchId === payload.batchId
  );
  if (!targetBatch) {
    throw new Error('Batch ecobrick tidak ditemukan.');
  }
  const available = getAvailableBatchQuantity(
    targetBatch,
    state.distribution_requests
  );
  if (!Number.isInteger(payload.requestedCount) || payload.requestedCount <= 0) {
    throw new Error('Jumlah unit yang diajukan harus minimal 1.');
  }
  if (payload.requestedCount > available) {
    throw new Error(
      `Jumlah melebihi stok tersedia pada batch (${available} unit tersedia).`
    );
  }
  if (payload.utilizationDetail.trim().length < 3) {
    throw new Error('Rencana pemanfaatan wajib diisi minimal 3 karakter.');
  }

  const requestId = makeShortId('DR');
  const actId = makeShortId('ACT');
  const today = todayIsoDate();
  const ts = nowTimestampText();

  const batch = writeBatch(db);
  batch.set(doc(db, 'distribution_requests', requestId), {
    id: requestId,
    batchId: targetBatch.batchId,
    batchContributorId: targetBatch.contributorId,
    requesterId: payload.requesterId,
    requesterName: payload.requesterName.trim().slice(0, 120),
    requesterType: payload.requesterType,
    requestedCount: payload.requestedCount,
    utilizationCategory: payload.utilizationCategory,
    ...(payload.location?.trim()
      ? { location: payload.location.trim().slice(0, 160) }
      : {}),
    ...(payload.neededDate?.trim()
      ? { neededDate: payload.neededDate.trim().slice(0, 20) }
      : {}),
    utilizationDetail: payload.utilizationDetail.trim().slice(0, 400),
    status: 'Pending Review',
    requestedAt: today,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'activities_feed', actId), {
    id: actId,
    actorUid: payload.requesterId,
    targetContributorUid: targetBatch.contributorId,
    timestamp: ts,
    category: 'Distribusi',
    title: `Permintaan distribusi ${requestId} (${payload.requestedCount} unit)`.slice(0, 180),
    detail: `${payload.requesterName.trim()} mengajukan dari Batch ${targetBatch.batchId}.`.slice(0, 400),
    batchId: targetBatch.batchId,
    createdAt: serverTimestamp(),
  });

  for (const admin of state.contributors.filter((c) => c.role === 'Admin')) {
    const notifId = makeShortId('NTF');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientUid: admin.id,
      recipientRole: 'Admin',
      title: `Pengajuan Distribusi ${requestId} Menunggu Review`.slice(0, 160),
      detail: `${payload.requesterName.trim()} mengajukan ${payload.requestedCount} ecobrick dari ${targetBatch.batchId}.`.slice(0, 400),
      timestamp: ts,
      category: 'Distribution',
      read: false,
      targetPage: 'distribution',
      createdByUid: payload.requesterId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return requestId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `distribution_requests/${requestId}`
    );
  }
}

export async function updateDistributionStatusInFirestore(
  state: TracecoState,
  params: {
    requestId: string;
    nextStatus: DistributionStatus;
    actorUid: string;
    reviewerName: string;
    receiverName?: string;
    documentationNote?: string;
  }
): Promise<void> {
  const req = state.distribution_requests.find((r) => r.id === params.requestId);
  if (!req) throw new Error('Permintaan distribusi tidak ditemukan.');
  if (params.nextStatus === 'Utilized' && req.status !== 'Handed Over') {
    throw new Error(
      'Dokumentasi pemanfaatan hanya dapat dilakukan setelah ecobrick diserahkan (Handed Over).'
    );
  }

  const batchContributorId =
    req.batchContributorId ??
    state.ecobrick_batches.find((b) => b.batchId === req.batchId)
      ?.contributorId ??
    req.requesterId ??
    params.actorUid;

  const today = todayIsoDate();
  const ts = nowTimestampText();
  const batch = writeBatch(db);

  batch.update(doc(db, 'distribution_requests', req.id), {
    status: params.nextStatus,
    ...(params.nextStatus === 'Approved' || params.nextStatus === 'Rejected'
      ? { reviewedBy: params.reviewerName.slice(0, 100) }
      : {}),
    ...(params.nextStatus === 'Handed Over'
      ? {
          handoverDate: today,
          receiverName: (params.receiverName?.trim() || req.requesterName).slice(0, 120),
          ...(params.documentationNote?.trim()
            ? { documentationNote: params.documentationNote.trim().slice(0, 400) }
            : {}),
        }
      : {}),
    ...(params.nextStatus === 'Utilized' && params.documentationNote?.trim()
      ? { documentationNote: params.documentationNote.trim().slice(0, 400) }
      : {}),
    updatedAt: serverTimestamp(),
  });

  if (params.nextStatus === 'Utilized') {
    const utlId = makeShortId('UTL');
    const docNote =
      params.documentationNote?.trim() ||
      `Ecobrick Batch ${req.batchId} selesai dimanfaatkan oleh ${req.requesterName}.`;
    batch.set(doc(db, 'utilization_records', utlId), {
      id: utlId,
      requestId: req.id,
      batchId: req.batchId,
      batchContributorId,
      requesterId: req.requesterId ?? params.actorUid,
      recipientName: req.requesterName.slice(0, 120),
      utilizationCategory: req.utilizationCategory,
      ...(req.location ? { location: req.location.slice(0, 160) } : {}),
      purpose: req.utilizationDetail.slice(0, 400),
      quantityUtilized: req.requestedCount,
      documentedAt: today,
      documentationNote: docNote.slice(0, 400),
      createdAt: serverTimestamp(),
    });
  }

  const actId = makeShortId('ACT');
  batch.set(doc(db, 'activities_feed', actId), {
    id: actId,
    actorUid: params.actorUid,
    targetContributorUid: batchContributorId,
    timestamp: ts,
    category: 'Distribusi',
    title: `Distribusi ${req.id} diperbarui: ${params.nextStatus}`.slice(0, 180),
    detail: `Batch ${req.batchId} (${req.requestedCount} unit) · ${req.requesterName}.`.slice(0, 400),
    batchId: req.batchId,
    createdAt: serverTimestamp(),
  });

  if (req.requesterId && req.requesterId !== params.actorUid) {
    const notifId = makeShortId('NTF');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientUid: req.requesterId,
      recipientRole: 'Mitra',
      title: `Status Distribusi ${req.id}: ${params.nextStatus}`.slice(0, 160),
      detail: `Permintaan ${req.requestedCount} unit dari Batch ${req.batchId} berstatus ${params.nextStatus}.`.slice(0, 400),
      timestamp: ts,
      category: 'Distribution',
      read: false,
      targetPage: 'distribution',
      createdByUid: params.actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (batchContributorId && batchContributorId !== params.actorUid) {
    const notifId2 = makeShortId('NTF');
    batch.set(doc(db, 'notifications', notifId2), {
      id: notifId2,
      recipientUid: batchContributorId,
      recipientRole: 'Kontributor',
      title: `Jejak Pemanfaatan Batch ${req.batchId}: ${params.nextStatus}`.slice(0, 160),
      detail: `${req.requestedCount} ecobrick Anda diproses oleh ${req.requesterName}.`.slice(0, 400),
      timestamp: ts,
      category: 'Distribution',
      read: false,
      targetPage: 'contribution',
      createdByUid: params.actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `distribution_requests/${req.id}`
    );
  }
}

export async function toggleJoinCommunityActivityInFirestore(
  state: TracecoState,
  activityId: string,
  uid: string
): Promise<{ joined: boolean }> {
  const actRef = doc(db, 'community_activities', activityId);
  const rsvpRef = doc(db, 'community_activities', activityId, 'rsvps', uid);
  const actor = state.contributors.find((c) => c.id === uid);

  try {
    const result = await runTransaction(db, async (tx) => {
      const actSnap = await tx.get(actRef);
      if (!actSnap.exists()) {
        throw new Error('Agenda komunitas tidak ditemukan.');
      }
      const actData = actSnap.data() as CommunityActivity;
      if (actData.status === 'Selesai') {
        throw new Error(
          'Agenda yang sudah selesai tidak dapat diubah pendaftarannya.'
        );
      }

      const rsvpSnap = await tx.get(rsvpRef);
      if (rsvpSnap.exists()) {
        tx.delete(rsvpRef);
        tx.update(actRef, {
          participantCount: Math.max(0, actData.participantCount - 1),
          updatedAt: serverTimestamp(),
        });
        return { joined: false, activity: actData };
      }

      tx.set(rsvpRef, {
        uid,
        activityId,
        joinedAt: serverTimestamp(),
      });
      tx.update(actRef, {
        participantCount: actData.participantCount + 1,
        updatedAt: serverTimestamp(),
      });
      return { joined: true, activity: actData };
    });

    if (result.joined) {
      const actFeedId = makeShortId('ACT');
      const batch = writeBatch(db);
      batch.set(doc(db, 'activities_feed', actFeedId), {
        id: actFeedId,
        actorUid: uid,
        timestamp: nowTimestampText(),
        category: 'Komunitas',
        title: `${actor?.name ?? 'Peserta'} bergabung ke ${result.activity.title}`.slice(0, 180),
        detail: `Partisipasi pada ${result.activity.date} di ${result.activity.location}.`.slice(0, 400),
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    }

    return { joined: result.joined };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `community_activities/${activityId}/rsvps/${uid}`
    );
  }
}

export async function createCommunityActivityInFirestore(
  creatorUid: string,
  payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
  }
): Promise<string> {
  const title = payload.title.trim().slice(0, 140);
  const location = payload.location.trim().slice(0, 160);
  if (title.length < 4 || !payload.date || location.length < 2) {
    throw new Error('Judul (min. 4 karakter), tanggal, dan lokasi wajib diisi.');
  }

  const activityId = makeShortId('COM');
  const actFeedId = makeShortId('ACT');
  const ts = nowTimestampText();

  const batch = writeBatch(db);
  batch.set(doc(db, 'community_activities', activityId), {
    id: activityId,
    title,
    category: payload.category,
    date: payload.date,
    location,
    participantSummary: (
      payload.participantSummary.trim() ||
      'Terbuka untuk Santri, Warga, Keluarga Rentan, & Mitra'
    ).slice(0, 160),
    participantCount: 0,
    inclusiveParticipationNote: (
      payload.inclusiveParticipationNote.trim() ||
      'Agenda kolaborasi terbuka di Community Hub Pesantren Al-Amanah.'
    ).slice(0, 360),
    status: 'Terjadwal',
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'activities_feed', actFeedId), {
    id: actFeedId,
    actorUid: creatorUid,
    timestamp: ts,
    category: 'Komunitas',
    title: `Agenda komunitas baru: ${title}`.slice(0, 180),
    detail: `Jadwal ${payload.date} di ${location}.`.slice(0, 400),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return activityId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `community_activities/${activityId}`
    );
  }
}

export async function updateCommunityActivityStatusInFirestore(
  activityId: string,
  status: CommunityActivity['status']
): Promise<void> {
  const path = `community_activities/${activityId}`;
  try {
    await updateDoc(doc(db, 'community_activities', activityId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createCommunityPostInFirestore(
  state: TracecoState,
  authorUid: string,
  payload: {
    category: CommunityPostCategory;
    title: string;
    body: string;
  }
): Promise<string> {
  const title = payload.title.trim().slice(0, 160);
  const body = payload.body.trim().slice(0, 1200);
  if (title.length < 4 || body.length < 8) {
    throw new Error('Judul minimal 4 karakter dan isi minimal 8 karakter.');
  }
  const author = state.contributors.find((c) => c.id === authorUid);
  if (!author) throw new Error('Profil pengguna belum termuat.');

  const postId = makeShortId('POST');
  const actFeedId = makeShortId('ACT');
  const ts = nowTimestampText();

  const batch = writeBatch(db);
  batch.set(doc(db, 'community_posts', postId), {
    id: postId,
    authorId: authorUid,
    authorName: author.name.slice(0, 100),
    authorRole: author.role,
    authorSegment: author.segment,
    category: payload.category,
    title,
    body,
    timestamp: ts,
    status: 'Terbuka',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'activities_feed', actFeedId), {
    id: actFeedId,
    actorUid: authorUid,
    timestamp: ts,
    category: 'Komunitas',
    title: `Topik forum baru: ${title}`.slice(0, 180),
    detail: `${author.name} (${author.role}) membuka diskusi ${payload.category}.`.slice(0, 400),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return postId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `community_posts/${postId}`
    );
  }
}

export async function replyCommunityPostInFirestore(
  state: TracecoState,
  authorUid: string,
  postId: string,
  body: string
): Promise<string> {
  const cleanBody = body.trim().slice(0, 1000);
  if (cleanBody.length < 3) {
    throw new Error('Tanggapan minimal 3 karakter.');
  }
  const author = state.contributors.find((c) => c.id === authorUid);
  if (!author) throw new Error('Profil pengguna belum termuat.');
  const post = state.community_posts.find((p) => p.id === postId);
  if (!post) throw new Error('Topik diskusi tidak ditemukan.');

  const replyId = makeShortId('RPL');
  const ts = nowTimestampText();
  const batch = writeBatch(db);

  batch.set(doc(db, 'community_posts', postId, 'replies', replyId), {
    id: replyId,
    postId,
    authorId: authorUid,
    authorName: author.name.slice(0, 100),
    authorRole: author.role,
    authorSegment: author.segment,
    timestamp: ts,
    body: cleanBody,
    createdAt: serverTimestamp(),
  });

  if (author.role === 'Admin' && post.status === 'Terbuka') {
    batch.update(doc(db, 'community_posts', postId), {
      status: 'Terjawab',
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return replyId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `community_posts/${postId}/replies/${replyId}`
    );
  }
}

export async function toggleCommunityPostStatusInFirestore(
  postId: string,
  currentStatus: CommunityPost['status']
): Promise<void> {
  const nextStatus = currentStatus === 'Terbuka' ? 'Terjawab' : 'Terbuka';
  const path = `community_posts/${postId}`;
  try {
    await updateDoc(doc(db, 'community_posts', postId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createCollaborationInFirestore(
  actorUid: string,
  proposedByRole: UserRole,
  payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
  }
): Promise<string> {
  const partnerName = payload.partnerName.trim().slice(0, 120);
  const collaborationType = payload.collaborationType.trim().slice(0, 120);
  const activity = payload.activity.trim().slice(0, 400);
  if (
    partnerName.length < 3 ||
    collaborationType.length < 3 ||
    activity.length < 8
  ) {
    throw new Error(
      'Nama mitra, jenis kolaborasi (min. 3 karakter), dan rencana (min. 8 karakter) wajib diisi.'
    );
  }

  const collabId = makeShortId('COLB');
  const actFeedId = makeShortId('ACT');
  const ts = nowTimestampText();
  const batch = writeBatch(db);

  batch.set(doc(db, 'collaborations', collabId), {
    id: collabId,
    partnerName,
    collaborationType,
    activity,
    proposedByUid: actorUid,
    proposedByRole,
    status: 'Dalam Koordinasi',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'activities_feed', actFeedId), {
    id: actFeedId,
    actorUid,
    timestamp: ts,
    category: 'Komunitas',
    title: `Usulan kolaborasi: ${partnerName}`.slice(0, 180),
    detail: `${collaborationType} · ${activity}`.slice(0, 400),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return collabId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `collaborations/${collabId}`
    );
  }
}

export async function updateCollaborationStatusInFirestore(
  collabId: string,
  status: CollaborationPartner['status']
): Promise<void> {
  const path = `collaborations/${collabId}`;
  try {
    await updateDoc(doc(db, 'collaborations', collabId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markNotificationReadInFirestore(
  notifId: string
): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    await updateDoc(doc(db, 'notifications', notifId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsReadInFirestore(
  unreadIds: string[]
): Promise<void> {
  if (unreadIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of unreadIds) {
    batch.update(doc(db, 'notifications', id), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}
