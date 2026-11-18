import type {
  CollaborationPartner,
  CommunityActivity,
  CommunityPost,
  CommunityPostCategory,
  CommunityReply,
  Contributor,
  ContributorSegment,
  DistributionRequest,
  EcobrickBatch,
  EcobrickSubmission,
  InventoryStatus,
  PhysicalChecklist,
  RedemptionStatus,
  SubmissionStatus,
  TracecoState,
  UserAccount,
  UserRole,
  VerificationRecord,
} from '../types/traceco';

export interface InventoryItem {
  batchId: string;
  submissionId: string;
  contributorId: string;
  contributorName: string;
  contributorRole: UserRole | string;
  contributorSegment: ContributorSegment | string;
  verifiedAt: string;
  totalVerifiedCount: number;
  reservedCount: number;
  distributedCount: number;
  utilizedCount: number;
  availableCount: number;
  weightPerEcobrickKg: number;
  availableWeightKg: number;
  totalWeightKg: number;
  bottleSize: string;
  inventoryStatus: InventoryStatus;
}

export interface PlatformMetrics {
  totalSubmissionsCount: number;
  pendingSubmissionsCount: number;
  verifiedSubmissionsCount: number;
  partialSubmissionsCount: number;
  rejectedSubmissionsCount: number;
  ecobricksSubmittedCount: number;
  ecobricksVerifiedCount: number;
  ecobricksRejectedCount: number;
  ecobricksPendingCount: number;
  ecobricksReservedCount: number;
  ecobricksDistributedCount: number;
  ecobricksUtilizedCount: number;
  inventoryAvailableCount: number;
  verificationRatePercent: number;
  plasticDivertedContextKg: number;
  totalContributorsCount: number;
  activeContributorsCount: number;
  activeSantriCount: number;
  activeWargaCount: number;
  vulnerableFamilyCount: number;
  pendingDistributionRequestsCount: number;
  totalPointsDistributed: number;
  totalPointsRedeemed: number;
  totalRedemptionsCount: number;
  pendingRedemptionsCount: number;
  totalFinancialIncentivesPaidOrApprovedIdr: number;
  communityActivitiesCount: number;
}

export interface TraceabilityStage {
  key:
    | 'submitted'
    | 'verified'
    | 'rewarded'
    | 'inventoried'
    | 'distributed'
    | 'utilized';
  label: string;
  state: 'completed' | 'current' | 'pending' | 'rejected';
  detail: string;
  timestamp?: string;
}

export type ContributionChartRange = '7d' | '30d' | '3m' | '1y';

export interface ContributionTimeBucket {
  label: string;
  submitted: number;
  verified: number;
}

export interface ContributionTimeSeriesResult {
  range: ContributionChartRange;
  buckets: ContributionTimeBucket[];
  totalSubmittedInPeriod: number;
  totalVerifiedInPeriod: number;
  previousSubmittedInPeriod: number;
  percentChange: number | null;
}

export interface ContributorStats {
  submittedUnits: number;
  verifiedUnits: number;
  pendingUnits: number;
  rejectedUnits: number;
  monthUnits: number;
  pointsEarned: number;
  pointsRedeemed: number;
  pointsBalance: number;
  rewardsRedeemedCount: number;
  latestSubmission?: EcobrickSubmission;
}

export interface ActiveSegmentBreakdown {
  segment: 'Santri' | 'Warga' | 'Keluarga Rentan';
  registeredCount: number;
  activeCount: number;
  submittedUnits: number;
  verifiedUnits: number;
}

export const POINTS_PER_ECOBRICK = 20;

export const ALL_ROLES: UserRole[] = ['Kontributor', 'Admin', 'Mitra'];

export const PENYERAH_ROLES: UserRole[] = ['Kontributor'];

export function isPenyerahRole(role: UserRole): boolean {
  return role === 'Kontributor';
}

export function isVerifierRole(role: UserRole): boolean {
  return role === 'Admin';
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'Admin';
}

export function isMitraRole(role: UserRole): boolean {
  return role === 'Mitra';
}

export const CHECKLIST_LABELS: {
  key: keyof PhysicalChecklist;
  label: string;
}[] = [
  {
    key: 'kondisiBotol',
    label: 'Kondisi botol PET utuh, bersih, dan tutup terpasang rapat',
  },
  {
    key: 'kebersihan',
    label: 'Kebersihan isi plastik terjaga (bebas sisa makanan & minyak)',
  },
  {
    key: 'kekeringan',
    label: 'Kekeringan isi plastik terpenuhi (tidak lembab atau berjamur)',
  },
  {
    key: 'kepadatan',
    label: 'Kepadatan/kompaksi merata dan tidak kempes saat ditekan',
  },
  {
    key: 'kondisiFisik',
    label: 'Bentuk dan kondisi fisik botol layak untuk perakitan',
  },
  {
    key: 'kesesuaianStandar',
    label: 'Material isi sesuai standar program (plastik kering non-B3)',
  },
  {
    key: 'jumlahSesuai',
    label: 'Jumlah unit fisik terhitung sesuai catatan verifikasi',
  },
  {
    key: 'beratSesuai',
    label: 'Berat memenuhi standar ukuran botol (jika ditimbang)',
  },
];

export function defaultSegmentForRole(role: UserRole): ContributorSegment {
  if (role === 'Kontributor') return 'Warga';
  if (role === 'Admin') return 'Admin';
  return 'Mitra';
}

export function canVerifySubmission(
  submission: Pick<EcobrickSubmission, 'contributorId' | 'status'>,
  verifierId: string
): { allowed: boolean; reason?: string } {
  if (submission.status !== 'Pending') {
    return {
      allowed: false,
      reason: `Submission sudah berstatus ${submission.status} dan tidak berada di antrean verifikasi.`,
    };
  }
  if (submission.contributorId === verifierId) {
    return {
      allowed: false,
      reason:
        'Aturan tata kelola TRACECO: Verifikator/Admin tidak diperbolehkan memverifikasi kontribusi miliknya sendiri.',
    };
  }
  return { allowed: true };
}

export function isChecklistComplete(checklist: PhysicalChecklist): boolean {
  return Object.values(checklist).every(Boolean);
}

export function generateNextSubmissionId(
  submissions: EcobrickSubmission[]
): string {
  const maxNum = submissions.reduce((max, s) => {
    const match = s.submissionId.match(/TRC-2026-(\d+)/);
    if (!match) return max;
    const num = parseInt(match[1], 10);
    return num > max ? num : max;
  }, 0);
  return `TRC-2026-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateNextBatchId(batches: EcobrickBatch[]): string {
  const maxNum = batches.reduce((max, b) => {
    const match = b.batchId.match(/TRC-B-(\d+)/);
    if (!match) return max;
    const num = parseInt(match[1], 10);
    return num > max ? num : max;
  }, 0);
  return `TRC-B-${String(maxNum + 1).padStart(3, '0')}`;
}

export function submitEcobrickContributionInState(
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
): { nextState: TracecoState; submission?: EcobrickSubmission; error?: string } {
  if (
    payload.quantitySubmitted <= 0 ||
    !Number.isInteger(payload.quantitySubmitted)
  ) {
    return {
      nextState: state,
      error: 'Jumlah ecobrick yang diserahkan minimal 1 unit (bilangan bulat).',
    };
  }
  if (payload.weightKg !== undefined && payload.weightKg <= 0) {
    return {
      nextState: state,
      error: 'Jika berat diisi, nilainya harus lebih dari 0 kg.',
    };
  }

  const point = state.dropoff_points.find(
    (dp) => dp.id === payload.dropoffPointId
  );
  const contributor = state.contributors.find(
    (c) => c.id === payload.contributorId
  );
  if (!contributor) {
    return { nextState: state, error: 'Penyerah ecobrick tidak ditemukan.' };
  }

  const nextId = generateNextSubmissionId(state.ecobrick_submissions);
  const newSubmission: EcobrickSubmission = {
    submissionId: nextId,
    contributorId: payload.contributorId,
    dropoffPointId: payload.dropoffPointId,
    dropoffPointName: point?.name ?? 'Pos Eco-Hub Utama Pesantren',
    date: payload.date,
    bottleSize: payload.bottleSize,
    quantitySubmitted: payload.quantitySubmitted,
    weightKg: payload.weightKg,
    iotSimulatedWeightKg: payload.iotSimulatedWeightKg,
    photoDataUrl: payload.photoDataUrl,
    photoLabel: payload.photoLabel,
    notes: payload.notes?.trim() || undefined,
    status: 'Pending',
    verifiedQuantity: 0,
    rejectedQuantity: 0,
  };

  return {
    submission: newSubmission,
    nextState: {
      ...state,
      ecobrick_submissions: [newSubmission, ...state.ecobrick_submissions],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          title: `Submission Baru ${nextId} Masuk Antrean Verifikasi`,
          detail: `${contributor.name} (${contributor.role}) menyerahkan ${payload.quantitySubmitted} ecobrick (${payload.weightKg ? `${payload.weightKg} kg` : 'menunggu timbang'}).`,
          timestamp: `${payload.date} 10:00`,
          category: 'Submission',
          read: false,
          targetPage: 'verification',
        },
        ...state.notifications,
      ],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: `${payload.date} 10:00`,
          category: 'Kontribusi',
          title: `Submission ${nextId} dicatat (${payload.quantitySubmitted} ecobrick)`,
          detail: `${contributor.name} (${contributor.role}) menyerahkan ecobrick di ${point?.name ?? 'Eco-Hub'}.`,
          submissionId: nextId,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function verifySubmissionInState(
  state: TracecoState,
  params: {
    submissionId: string;
    verifierId: string;
    checklist: PhysicalChecklist;
    verifiedCount: number;
    rejectionReason?: string;
    verifiedAt: string;
    verifiedWeightKg?: number;
  }
): {
  nextState: TracecoState;
  batch?: EcobrickBatch;
  verification?: VerificationRecord;
  error?: string;
} {
  const submission = state.ecobrick_submissions.find(
    (s) => s.submissionId === params.submissionId
  );
  if (!submission) {
    return { nextState: state, error: 'Submission tidak ditemukan.' };
  }

  const guard = canVerifySubmission(submission, params.verifierId);
  if (!guard.allowed) {
    return { nextState: state, error: guard.reason };
  }

  if (
    !Number.isInteger(params.verifiedCount) ||
    params.verifiedCount < 0 ||
    params.verifiedCount > submission.quantitySubmitted
  ) {
    return {
      nextState: state,
      error: `Jumlah unit terverifikasi harus antara 0 hingga ${submission.quantitySubmitted}.`,
    };
  }

  const rejectedCount = submission.quantitySubmitted - params.verifiedCount;

  if (params.verifiedCount > 0 && !isChecklistComplete(params.checklist)) {
    return {
      nextState: state,
      error:
        'Semua 8 item checklist pemeriksaan fisik wajib dipenuhi untuk unit yang dinyatakan Verified.',
    };
  }

  if (
    rejectedCount > 0 &&
    (!params.rejectionReason || params.rejectionReason.trim().length < 5)
  ) {
    return {
      nextState: state,
      error:
        'Alasan penolakan (rejection reason) wajib diisi minimal 5 karakter apabila ada unit yang ditolak.',
    };
  }

  const verifier = state.contributors.find((c) => c.id === params.verifierId);
  const contributor = state.contributors.find(
    (c) => c.id === submission.contributorId
  );

  const decision: SubmissionStatus =
    params.verifiedCount === 0
      ? 'Rejected'
      : rejectedCount === 0
        ? 'Verified'
        : 'Partially Verified';

  const updatedSubmissions = state.ecobrick_submissions.map((s) =>
    s.submissionId === params.submissionId
      ? {
          ...s,
          status: decision,
          verifiedQuantity: params.verifiedCount,
          rejectedQuantity: rejectedCount,
        }
      : s
  );

  let createdBatch: EcobrickBatch | undefined;
  let updatedBatches = state.ecobrick_batches;
  let updatedPoints = state.green_points;

  if (params.verifiedCount > 0) {
    const nextBatchId = generateNextBatchId(state.ecobrick_batches);
    const baseWeight =
      params.verifiedWeightKg ??
      (submission.weightKg
        ? Number(
            (
              (submission.weightKg * params.verifiedCount) /
              submission.quantitySubmitted
            ).toFixed(2)
          )
        : Number((params.verifiedCount * 0.35).toFixed(2)));

    createdBatch = {
      batchId: nextBatchId,
      submissionId: submission.submissionId,
      contributorId: submission.contributorId,
      date: submission.date,
      verifiedAt: params.verifiedAt,
      bottleSize: submission.bottleSize,
      quantity: params.verifiedCount,
      weightKg: baseWeight,
      notes:
        rejectedCount > 0
          ? `Terverifikasi ${params.verifiedCount} dari ${submission.quantitySubmitted} unit (${rejectedCount} unit ditolak).`
          : `Terverifikasi penuh dari submission ${submission.submissionId}.`,
    };
    updatedBatches = [createdBatch, ...state.ecobrick_batches];

    const earnedPoints = params.verifiedCount * POINTS_PER_ECOBRICK;
    updatedPoints = [
      {
        id: `GP-${String(state.green_points.length + 1).padStart(3, '0')}`,
        contributorId: submission.contributorId,
        date: params.verifiedAt.slice(0, 10),
        type: 'Earned',
        points: earnedPoints,
        sourceLabel: `Verifikasi ${submission.submissionId} (${params.verifiedCount} ecobrick terverifikasi · Batch ${nextBatchId})`,
        submissionId: submission.submissionId,
        batchId: nextBatchId,
      },
      ...state.green_points,
    ];
  }

  const newVerification: VerificationRecord = {
    id: `VER-${String(state.verification_records.length + 1).padStart(3, '0')}`,
    submissionId: submission.submissionId,
    batchId: createdBatch?.batchId,
    checklist: params.checklist,
    verifierId: params.verifierId,
    verifierName: verifier?.name ?? 'Admin Eco-Hub',
    verifiedAt: params.verifiedAt,
    verifiedCount: params.verifiedCount,
    rejectedCount,
    decision:
      decision === 'Verified' || decision === 'Partially Verified'
        ? decision
        : 'Rejected',
    rejectionReason:
      rejectedCount > 0 ? params.rejectionReason?.trim() : undefined,
  };

  const earnedPoints = params.verifiedCount * POINTS_PER_ECOBRICK;
  const summaryTitle =
    decision === 'Verified'
      ? `${submission.submissionId} Terverifikasi (${params.verifiedCount} unit)`
      : decision === 'Partially Verified'
        ? `${submission.submissionId}: ${params.verifiedCount} Verified, ${rejectedCount} Rejected`
        : `${submission.submissionId} Ditolak (${rejectedCount} unit)`;

  const summaryDetail = createdBatch
    ? `${params.verifiedCount} ecobrick masuk Batch ${createdBatch.batchId} & inventori · +${earnedPoints} Green Points untuk ${contributor?.name ?? 'Penyerah'}${rejectedCount > 0 ? ` · ${rejectedCount} ditolak: ${params.rejectionReason?.trim()}` : ''}`
    : `Seluruh ${rejectedCount} unit ditolak oleh ${verifier?.name ?? 'Verifikator'}: ${params.rejectionReason?.trim()}`;

  return {
    batch: createdBatch,
    verification: newVerification,
    nextState: {
      ...state,
      ecobrick_submissions: updatedSubmissions,
      verification_records: [newVerification, ...state.verification_records],
      ecobrick_batches: updatedBatches,
      green_points: updatedPoints,
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          title: summaryTitle,
          detail: summaryDetail,
          timestamp: params.verifiedAt,
          category: 'Verification',
          read: false,
          targetPage: 'verification',
        },
        ...state.notifications,
      ],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: params.verifiedAt,
          category: 'Verifikasi',
          title: summaryTitle,
          detail: summaryDetail,
          submissionId: submission.submissionId,
          batchId: createdBatch?.batchId,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function computeVerifiedInventory(
  batches: EcobrickBatch[],
  distributions: DistributionRequest[],
  contributors: Contributor[]
): InventoryItem[] {
  return batches.map((batch) => {
    const contributor = contributors.find((c) => c.id === batch.contributorId);

    const reservedCount = distributions
      .filter((d) => d.batchId === batch.batchId && d.status === 'Approved')
      .reduce((acc, d) => acc + d.requestedCount, 0);

    const handedOverCount = distributions
      .filter((d) => d.batchId === batch.batchId && d.status === 'Handed Over')
      .reduce((acc, d) => acc + d.requestedCount, 0);

    const utilizedCount = distributions
      .filter((d) => d.batchId === batch.batchId && d.status === 'Utilized')
      .reduce((acc, d) => acc + d.requestedCount, 0);

    const committedCount = reservedCount + handedOverCount + utilizedCount;
    const availableCount = Math.max(0, batch.quantity - committedCount);
    const unitWeight =
      batch.quantity > 0 ? Number((batch.weightKg / batch.quantity).toFixed(3)) : 0;

    let inventoryStatus: InventoryStatus = 'Available';
    if (availableCount === 0) {
      if (utilizedCount === batch.quantity) {
        inventoryStatus = 'Utilized';
      } else if (handedOverCount + utilizedCount > 0) {
        inventoryStatus = 'Distributed';
      } else {
        inventoryStatus = 'Reserved';
      }
    } else if (reservedCount > 0) {
      inventoryStatus = 'Available';
    }

    return {
      batchId: batch.batchId,
      submissionId: batch.submissionId,
      contributorId: batch.contributorId,
      contributorName: contributor?.name ?? 'Kontributor',
      contributorRole: contributor?.role ?? 'Warga',
      contributorSegment: contributor?.segment ?? '-',
      verifiedAt: batch.verifiedAt,
      totalVerifiedCount: batch.quantity,
      reservedCount,
      distributedCount: handedOverCount + utilizedCount,
      utilizedCount,
      availableCount,
      weightPerEcobrickKg: unitWeight,
      availableWeightKg: Number((availableCount * unitWeight).toFixed(2)),
      totalWeightKg: batch.weightKg,
      bottleSize: batch.bottleSize,
      inventoryStatus,
    };
  });
}

export function computeContributorPointsBalance(
  state: TracecoState,
  contributorId: string
): { earned: number; redeemed: number; balance: number } {
  const entries = state.green_points.filter(
    (r) => r.contributorId === contributorId
  );
  const earned = entries
    .filter((e) => e.type === 'Earned')
    .reduce((sum, e) => sum + e.points, 0);
  const redeemed = entries
    .filter((e) => e.type === 'Redeemed')
    .reduce((sum, e) => sum + e.points, 0);
  return {
    earned,
    redeemed,
    balance: Math.max(0, earned - redeemed),
  };
}

export function computeContributorStats(
  state: TracecoState,
  contributorId: string,
  referenceDate = '2026-11-18'
): ContributorStats {
  const subs = state.ecobrick_submissions
    .filter((s) => s.contributorId === contributorId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const currentMonthPrefix = referenceDate.slice(0, 7);
  const submittedUnits = subs.reduce((acc, s) => acc + s.quantitySubmitted, 0);
  const verifiedUnits = subs.reduce((acc, s) => acc + s.verifiedQuantity, 0);
  const pendingUnits = subs
    .filter((s) => s.status === 'Pending')
    .reduce((acc, s) => acc + s.quantitySubmitted, 0);
  const rejectedUnits = subs.reduce((acc, s) => acc + s.rejectedQuantity, 0);
  const monthUnits = subs
    .filter((s) => s.date.startsWith(currentMonthPrefix))
    .reduce((acc, s) => acc + s.quantitySubmitted, 0);

  const pts = computeContributorPointsBalance(state, contributorId);
  const rewardsRedeemedCount = state.redemptions.filter(
    (r) => r.contributorId === contributorId
  ).length;

  return {
    submittedUnits,
    verifiedUnits,
    pendingUnits,
    rejectedUnits,
    monthUnits,
    pointsEarned: pts.earned,
    pointsRedeemed: pts.redeemed,
    pointsBalance: pts.balance,
    rewardsRedeemedCount,
    latestSubmission: subs[0],
  };
}

function parseIsoDateUtc(dateStr: string): Date {
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

function formatDayShort(d: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function formatMonthShort(year: number, monthIdx: number): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return `${months[monthIdx]} '${String(year).slice(-2)}`;
}

export function computeContributionTimeSeries(
  submissions: EcobrickSubmission[],
  range: ContributionChartRange,
  referenceDate = '2026-11-18'
): ContributionTimeSeriesResult {
  const ref = parseIsoDateUtc(referenceDate);
  const msPerDay = 86400000;

  if (range === '7d') {
    const buckets: ContributionTimeBucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(ref.getTime() - i * msPerDay);
      const iso = day.toISOString().slice(0, 10);
      const matches = submissions.filter((s) => s.date.slice(0, 10) === iso);
      buckets.push({
        label: formatDayShort(day),
        submitted: matches.reduce((a, s) => a + s.quantitySubmitted, 0),
        verified: matches.reduce((a, s) => a + s.verifiedQuantity, 0),
      });
    }
    const prevStart = new Date(ref.getTime() - 13 * msPerDay);
    const prevEnd = new Date(ref.getTime() - 7 * msPerDay);
    const prevTotal = submissions
      .filter((s) => {
        const d = parseIsoDateUtc(s.date);
        return d >= prevStart && d <= prevEnd;
      })
      .reduce((a, s) => a + s.quantitySubmitted, 0);

    const totalSubmitted = buckets.reduce((a, b) => a + b.submitted, 0);
    const totalVerified = buckets.reduce((a, b) => a + b.verified, 0);
    return {
      range,
      buckets,
      totalSubmittedInPeriod: totalSubmitted,
      totalVerifiedInPeriod: totalVerified,
      previousSubmittedInPeriod: prevTotal,
      percentChange:
        prevTotal > 0
          ? Math.round(((totalSubmitted - prevTotal) / prevTotal) * 100)
          : null,
    };
  }

  if (range === '30d') {
    // 5 contiguous 6-day windows covering 30 days up to referenceDate
    const buckets: ContributionTimeBucket[] = [];
    for (let w = 4; w >= 0; w--) {
      const end = new Date(ref.getTime() - w * 6 * msPerDay);
      const start = new Date(end.getTime() - 5 * msPerDay);
      const matches = submissions.filter((s) => {
        const d = parseIsoDateUtc(s.date);
        return d >= start && d <= end;
      });
      buckets.push({
        label: `${start.getUTCDate()}–${formatDayShort(end)}`,
        submitted: matches.reduce((a, s) => a + s.quantitySubmitted, 0),
        verified: matches.reduce((a, s) => a + s.verifiedQuantity, 0),
      });
    }
    const curStart = new Date(ref.getTime() - 29 * msPerDay);
    const prevStart = new Date(ref.getTime() - 59 * msPerDay);
    const prevEnd = new Date(curStart.getTime() - msPerDay);
    const prevTotal = submissions
      .filter((s) => {
        const d = parseIsoDateUtc(s.date);
        return d >= prevStart && d <= prevEnd;
      })
      .reduce((a, s) => a + s.quantitySubmitted, 0);

    const totalSubmitted = buckets.reduce((a, b) => a + b.submitted, 0);
    const totalVerified = buckets.reduce((a, b) => a + b.verified, 0);
    return {
      range,
      buckets,
      totalSubmittedInPeriod: totalSubmitted,
      totalVerifiedInPeriod: totalVerified,
      previousSubmittedInPeriod: prevTotal,
      percentChange:
        prevTotal > 0
          ? Math.round(((totalSubmitted - prevTotal) / prevTotal) * 100)
          : null,
    };
  }

  // Monthly aggregation: 3m (3 months) or 1y (6 or 12 months -> 6 bi-monthly or 12 months; use 3 months for 3m, 6 months or 12 months for 1y)
  const monthCount = range === '3m' ? 3 : 12;
  const buckets: ContributionTimeBucket[] = [];
  const refYear = ref.getUTCFullYear();
  const refMonth = ref.getUTCMonth();

  for (let i = monthCount - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(refYear, refMonth - i, 1));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
    const matches = submissions.filter((s) => s.date.startsWith(prefix));
    buckets.push({
      label: formatMonthShort(y, m),
      submitted: matches.reduce((a, s) => a + s.quantitySubmitted, 0),
      verified: matches.reduce((a, s) => a + s.verifiedQuantity, 0),
    });
  }

  let prevTotal = 0;
  for (let i = monthCount * 2 - 1; i >= monthCount; i--) {
    const dt = new Date(Date.UTC(refYear, refMonth - i, 1));
    const prefix = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
    prevTotal += submissions
      .filter((s) => s.date.startsWith(prefix))
      .reduce((a, s) => a + s.quantitySubmitted, 0);
  }

  const totalSubmitted = buckets.reduce((a, b) => a + b.submitted, 0);
  const totalVerified = buckets.reduce((a, b) => a + b.verified, 0);
  return {
    range,
    buckets,
    totalSubmittedInPeriod: totalSubmitted,
    totalVerifiedInPeriod: totalVerified,
    previousSubmittedInPeriod: prevTotal,
    percentChange:
      prevTotal > 0
        ? Math.round(((totalSubmitted - prevTotal) / prevTotal) * 100)
        : null,
  };
}

export function computeActiveContributorBreakdown(
  state: TracecoState
): ActiveSegmentBreakdown[] {
  const segments: ('Santri' | 'Warga' | 'Keluarga Rentan')[] = [
    'Santri',
    'Warga',
    'Keluarga Rentan',
  ];

  return segments.map((seg) => {
    const matchingContributors = state.contributors.filter(
      (c) => c.segment === seg
    );
    const ids = new Set(matchingContributors.map((c) => c.id));
    const subs = state.ecobrick_submissions.filter((s) =>
      ids.has(s.contributorId)
    );
    const activeIds = new Set(subs.map((s) => s.contributorId));

    return {
      segment: seg,
      registeredCount: matchingContributors.length,
      activeCount: activeIds.size,
      submittedUnits: subs.reduce((a, s) => a + s.quantitySubmitted, 0),
      verifiedUnits: subs.reduce((a, s) => a + s.verifiedQuantity, 0),
    };
  });
}

export function redeemRewardInState(
  state: TracecoState,
  params: {
    contributorId: string;
    rewardId: string;
    requestedAt?: string;
  }
): { nextState: TracecoState; error?: string } {
  const reward = state.rewards.find((r) => r.id === params.rewardId);
  if (!reward) {
    return { nextState: state, error: 'Item katalog reward tidak ditemukan.' };
  }

  const bal = computeContributorPointsBalance(state, params.contributorId);
  if (bal.balance < reward.pointsCost) {
    return {
      nextState: state,
      error: `Saldo Green Points (${bal.balance} pts) belum mencukupi untuk menukar ${reward.title} (${reward.pointsCost} pts).`,
    };
  }

  const contributor = state.contributors.find(
    (c) => c.id === params.contributorId
  );
  const dateStr = params.requestedAt ?? '2026-11-18';
  const nextRedemptionId = `RDM-${String(state.redemptions.length + 1).padStart(3, '0')}`;

  return {
    nextState: {
      ...state,
      green_points: [
        {
          id: `GP-${String(state.green_points.length + 1).padStart(3, '0')}`,
          contributorId: params.contributorId,
          date: dateStr,
          type: 'Redeemed',
          points: reward.pointsCost,
          sourceLabel: `Penukaran (${nextRedemptionId}): ${reward.title}`,
        },
        ...state.green_points,
      ],
      redemptions: [
        {
          id: nextRedemptionId,
          contributorId: params.contributorId,
          rewardId: reward.id,
          rewardTitle: reward.title,
          pointsCost: reward.pointsCost,
          status: 'Pending',
          requestedAt: dateStr,
          updatedAt: dateStr,
        },
        ...state.redemptions,
      ],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          title: `Permintaan Redemption ${nextRedemptionId}`,
          detail: `${contributor?.name ?? 'Kontributor'} menukar ${reward.pointsCost} Green Points untuk ${reward.title}.`,
          timestamp: `${dateStr} 14:50`,
          category: 'Reward',
          read: false,
          targetPage: 'reward',
        },
        ...state.notifications,
      ],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: `${dateStr} 14:50`,
          category: 'Reward',
          title: `Redeem ${reward.pointsCost} pts oleh ${contributor?.name ?? 'Kontributor'}`,
          detail: `${reward.title} · Status: Pending`,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function updateRedemptionStatusInState(
  state: TracecoState,
  redemptionId: string,
  status: RedemptionStatus,
  updatedAt = '2026-11-18'
): TracecoState {
  return {
    ...state,
    redemptions: state.redemptions.map((r) =>
      r.id === redemptionId ? { ...r, status, updatedAt } : r
    ),
  };
}

export function createDistributionRequestInState(
  state: TracecoState,
  payload: {
    batchId: string;
    requesterId?: string;
    requesterName: string;
    requesterType: DistributionRequest['requesterType'];
    requestedCount: number;
    utilizationCategory: DistributionRequest['utilizationCategory'];
    location?: string;
    neededDate?: string;
    utilizationDetail: string;
    requestedAt?: string;
  }
): { nextState: TracecoState; request?: DistributionRequest; error?: string } {
  const inventory = computeVerifiedInventory(
    state.ecobrick_batches,
    state.distribution_requests,
    state.contributors
  );
  const targetItem = inventory.find((i) => i.batchId === payload.batchId);
  if (!targetItem) {
    return { nextState: state, error: 'Batch inventori tidak ditemukan.' };
  }
  if (
    !Number.isInteger(payload.requestedCount) ||
    payload.requestedCount <= 0
  ) {
    return {
      nextState: state,
      error: 'Jumlah unit yang diajukan harus minimal 1 ecobrick.',
    };
  }
  if (payload.requestedCount > targetItem.availableCount) {
    return {
      nextState: state,
      error: `Jumlah diajukan (${payload.requestedCount}) melebihi stok tersedia (${targetItem.availableCount} unit) pada batch ${payload.batchId}.`,
    };
  }

  const nextId = `DR-${String(state.distribution_requests.length + 1).padStart(3, '0')}`;
  const reqDate = payload.requestedAt ?? '2026-11-18';

  const newRequest: DistributionRequest = {
    id: nextId,
    batchId: payload.batchId,
    requesterId: payload.requesterId,
    requesterName: payload.requesterName,
    requesterType: payload.requesterType,
    requestedCount: payload.requestedCount,
    utilizationCategory: payload.utilizationCategory,
    location: payload.location?.trim() || undefined,
    neededDate: payload.neededDate || undefined,
    utilizationDetail: payload.utilizationDetail,
    status: 'Pending Review',
    requestedAt: reqDate,
  };

  return {
    request: newRequest,
    nextState: {
      ...state,
      distribution_requests: [newRequest, ...state.distribution_requests],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          title: `Permintaan Distribusi ${nextId}`,
          detail: `${payload.requesterName} mengajukan ${payload.requestedCount} unit dari ${payload.batchId}.`,
          timestamp: `${reqDate} 15:00`,
          category: 'Distribution',
          read: false,
          targetPage: 'distribution',
        },
        ...state.notifications,
      ],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: `${reqDate} 15:00`,
          category: 'Distribusi',
          title: `Permintaan ${nextId} diajukan (${payload.utilizationCategory})`,
          detail: `${payload.requesterName} meminta ${payload.requestedCount} ecobrick dari ${payload.batchId}${payload.location ? ` · ${payload.location}` : ''}.`,
          batchId: payload.batchId,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function updateDistributionStatusInState(
  state: TracecoState,
  params: {
    requestId: string;
    nextStatus: DistributionRequest['status'];
    reviewerName: string;
    receiverName?: string;
    documentationNote?: string;
    actionDate?: string;
  }
): TracecoState {
  const target = state.distribution_requests.find(
    (r) => r.id === params.requestId
  );
  if (!target) return state;

  const dateStr = params.actionDate ?? '2026-11-18';
  const updatedRequests = state.distribution_requests.map((req) => {
    if (req.id !== params.requestId) return req;
    return {
      ...req,
      status: params.nextStatus,
      reviewedBy: req.reviewedBy ?? params.reviewerName,
      handoverDate:
        params.nextStatus === 'Handed Over' || params.nextStatus === 'Utilized'
          ? req.handoverDate ?? dateStr
          : req.handoverDate,
      receiverName: params.receiverName ?? req.receiverName,
      documentationNote: params.documentationNote ?? req.documentationNote,
    };
  });

  let updatedUtilization = state.utilization_records;
  if (params.nextStatus === 'Utilized') {
    const alreadyRecorded = state.utilization_records.some(
      (u) => u.requestId === target.id
    );
    if (!alreadyRecorded) {
      updatedUtilization = [
        {
          id: `UTL-${String(state.utilization_records.length + 1).padStart(3, '0')}`,
          requestId: target.id,
          batchId: target.batchId,
          recipientName:
            params.receiverName ?? target.receiverName ?? target.requesterName,
          utilizationCategory: target.utilizationCategory,
          location: target.location,
          purpose: target.utilizationDetail,
          quantityUtilized: target.requestedCount,
          documentedAt: dateStr,
          documentationNote:
            params.documentationNote ??
            'Pemanfaatan aktual selesai diverifikasi di lokasi penerima.',
        },
        ...state.utilization_records,
      ];
    }
  }

  return {
    ...state,
    distribution_requests: updatedRequests,
    utilization_records: updatedUtilization,
    recent_activities: [
      {
        id: `ACT-${Date.now()}`,
        timestamp: `${dateStr} 15:15`,
        category: 'Distribusi',
        title: `Status ${target.id} diperbarui ke ${params.nextStatus}`,
        detail: `${target.requesterName} · ${target.requestedCount} ecobrick (${target.batchId})`,
        batchId: target.batchId,
      },
      ...state.recent_activities,
    ],
  };
}

export function computePlatformMetrics(state: TracecoState): PlatformMetrics {
  const totalSubmissionsCount = state.ecobrick_submissions.length;
  const pendingSubmissionsCount = state.ecobrick_submissions.filter(
    (s) => s.status === 'Pending'
  ).length;
  const verifiedSubmissionsCount = state.ecobrick_submissions.filter(
    (s) => s.status === 'Verified'
  ).length;
  const partialSubmissionsCount = state.ecobrick_submissions.filter(
    (s) => s.status === 'Partially Verified'
  ).length;
  const rejectedSubmissionsCount = state.ecobrick_submissions.filter(
    (s) => s.status === 'Rejected'
  ).length;

  const ecobricksSubmittedCount = state.ecobrick_submissions.reduce(
    (s, sub) => s + sub.quantitySubmitted,
    0
  );
  const ecobricksVerifiedCount = state.ecobrick_submissions.reduce(
    (s, sub) => s + sub.verifiedQuantity,
    0
  );
  const ecobricksRejectedCount = state.ecobrick_submissions.reduce(
    (s, sub) => s + sub.rejectedQuantity,
    0
  );
  const ecobricksPendingCount = state.ecobrick_submissions
    .filter((s) => s.status === 'Pending')
    .reduce((s, sub) => s + sub.quantitySubmitted, 0);

  const reviewedUnits = ecobricksVerifiedCount + ecobricksRejectedCount;
  const verificationRatePercent =
    ecobricksSubmittedCount > 0
      ? Math.round((ecobricksVerifiedCount / ecobricksSubmittedCount) * 100)
      : reviewedUnits > 0
        ? Math.round((ecobricksVerifiedCount / reviewedUnits) * 100)
        : 0;

  const inventoryItems = computeVerifiedInventory(
    state.ecobrick_batches,
    state.distribution_requests,
    state.contributors
  );

  const ecobricksReservedCount = inventoryItems.reduce(
    (s, item) => s + item.reservedCount,
    0
  );
  const ecobricksDistributedCount = inventoryItems.reduce(
    (s, item) => s + item.distributedCount,
    0
  );
  const ecobricksUtilizedCount = inventoryItems.reduce(
    (s, item) => s + item.utilizedCount,
    0
  );
  const inventoryAvailableCount = inventoryItems.reduce(
    (s, item) => s + item.availableCount,
    0
  );

  const plasticDivertedContextKg = Number(
    state.ecobrick_batches.reduce((s, b) => s + b.weightKg, 0).toFixed(1)
  );

  const contributorIdsWithActivity = new Set<string>(
    state.ecobrick_submissions.map((s) => s.contributorId)
  );

  const activeSantriCount = state.contributors.filter(
    (c) => c.segment === 'Santri' && contributorIdsWithActivity.has(c.id)
  ).length;
  const activeWargaCount = state.contributors.filter(
    (c) => c.segment === 'Warga' && contributorIdsWithActivity.has(c.id)
  ).length;
  const vulnerableFamilyCount = state.contributors.filter(
    (c) => c.segment === 'Keluarga Rentan'
  ).length;

  const pendingDistributionRequestsCount = state.distribution_requests.filter(
    (d) => d.status === 'Pending Review'
  ).length;

  const totalPointsDistributed = state.green_points
    .filter((r) => r.type === 'Earned')
    .reduce((s, r) => s + r.points, 0);

  const totalPointsRedeemed = state.green_points
    .filter((r) => r.type === 'Redeemed')
    .reduce((s, r) => s + r.points, 0);

  const totalFinancialIncentivesPaidOrApprovedIdr = state.financial_incentives
    .filter((f) => f.status === 'Approved' || f.status === 'Paid')
    .reduce((s, f) => s + f.amountIdr, 0);

  return {
    totalSubmissionsCount,
    pendingSubmissionsCount,
    verifiedSubmissionsCount,
    partialSubmissionsCount,
    rejectedSubmissionsCount,
    ecobricksSubmittedCount,
    ecobricksVerifiedCount,
    ecobricksRejectedCount,
    ecobricksPendingCount,
    ecobricksReservedCount,
    ecobricksDistributedCount,
    ecobricksUtilizedCount,
    inventoryAvailableCount,
    verificationRatePercent,
    plasticDivertedContextKg,
    totalContributorsCount: state.contributors.filter((c) =>
      isPenyerahRole(c.role)
    ).length,
    activeContributorsCount: state.contributors.filter(
      (c) => isPenyerahRole(c.role) && contributorIdsWithActivity.has(c.id)
    ).length,
    activeSantriCount,
    activeWargaCount,
    vulnerableFamilyCount,
    pendingDistributionRequestsCount,
    totalPointsDistributed,
    totalPointsRedeemed,
    totalRedemptionsCount: state.redemptions.length,
    pendingRedemptionsCount: state.redemptions.filter(
      (r) => r.status === 'Pending'
    ).length,
    totalFinancialIncentivesPaidOrApprovedIdr,
    communityActivitiesCount: state.community_activities.length,
  };
}

export function buildSubmissionTraceability(
  state: TracecoState,
  targetId: string
): TraceabilityStage[] {
  const batchByTarget = state.ecobrick_batches.find(
    (b) => b.batchId === targetId
  );
  const submission = batchByTarget
    ? state.ecobrick_submissions.find(
        (s) => s.submissionId === batchByTarget.submissionId
      )
    : state.ecobrick_submissions.find((s) => s.submissionId === targetId);

  if (!submission) return [];

  const batch =
    batchByTarget ??
    state.ecobrick_batches.find(
      (b) => b.submissionId === submission.submissionId
    );
  const contributor = state.contributors.find(
    (c) => c.id === submission.contributorId
  );
  const verification = state.verification_records.find(
    (v) => v.submissionId === submission.submissionId
  );
  const reward = state.green_points.find(
    (g) => g.submissionId === submission.submissionId && g.type === 'Earned'
  );
  const distributions = batch
    ? state.distribution_requests.filter(
        (d) => d.batchId === batch.batchId && d.status !== 'Rejected'
      )
    : [];
  const handedOver = distributions.find(
    (d) => d.status === 'Handed Over' || d.status === 'Utilized'
  );
  const utilized = distributions.find((d) => d.status === 'Utilized');

  const isRejectedAll = submission.status === 'Rejected';
  const hasVerifiedUnits = submission.verifiedQuantity > 0;

  return [
    {
      key: 'submitted',
      label: 'Submitted',
      state: 'completed',
      detail: `${contributor?.name ?? 'Kontributor'} (${contributor?.role ?? '-'}) menyerahkan ${submission.quantitySubmitted} ecobrick (${submission.bottleSize}) di ${submission.dropoffPointName}.`,
      timestamp: submission.date,
    },
    {
      key: 'verified',
      label: 'Verified',
      state: hasVerifiedUnits
        ? 'completed'
        : isRejectedAll
          ? 'rejected'
          : 'current',
      detail: verification
        ? verification.decision === 'Verified'
          ? `${verification.verifiedCount} unit lolos pemeriksaan fisik oleh ${verification.verifierName} -> Batch ${batch?.batchId ?? '-'}.`
          : verification.decision === 'Partially Verified'
            ? `${verification.verifiedCount} unit Verified (Batch ${batch?.batchId ?? '-'}) dan ${verification.rejectedCount} unit Rejected (${verification.rejectionReason ?? '-'}) oleh ${verification.verifierName}.`
            : `Seluruh ${verification.rejectedCount} unit ditolak oleh ${verification.verifierName}: ${verification.rejectionReason ?? 'Tidak memenuhi standar'}`
        : 'Menunggu pemeriksaan fisik 8 kriteria oleh Admin Eco-Hub.',
      timestamp: verification?.verifiedAt,
    },
    {
      key: 'rewarded',
      label: 'Rewarded',
      state: reward
        ? 'completed'
        : isRejectedAll
          ? 'rejected'
          : hasVerifiedUnits
            ? 'current'
            : 'pending',
      detail: reward
        ? `+${reward.points} Green Points diterbitkan untuk ${contributor?.name ?? 'kontributor'} (${submission.verifiedQuantity} unit terverifikasi).`
        : isRejectedAll
          ? 'Tidak ada Green Points diterbitkan karena seluruh unit ditolak.'
          : 'Green Points diterbitkan otomatis setelah unit lolos verifikasi fisik.',
      timestamp: reward?.date,
    },
    {
      key: 'inventoried',
      label: 'Inventoried',
      state: batch
        ? 'completed'
        : isRejectedAll
          ? 'rejected'
          : 'pending',
      detail: batch
        ? `Batch ${batch.batchId} masuk Eco-Inventory terverifikasi (${batch.quantity} unit · ${batch.weightKg} kg).`
        : isRejectedAll
          ? 'Tidak masuk inventori terverifikasi.'
          : 'Menunggu keputusan verifikasi.',
      timestamp: batch?.verifiedAt,
    },
    {
      key: 'distributed',
      label: 'Distributed',
      state: handedOver
        ? 'completed'
        : distributions.length > 0 && batch
          ? 'current'
          : isRejectedAll
            ? 'rejected'
            : 'pending',
      detail: handedOver
        ? `${handedOver.requestedCount} unit diserahterimakan kepada ${handedOver.requesterName} (${handedOver.id}).`
        : distributions.length > 0
          ? `Permintaan aktif ${distributions[0].id}: ${distributions[0].requesterName} (${distributions[0].status}).`
          : batch
            ? 'Tersedia di inventori untuk diajukan pemanfaatannya.'
            : 'Belum memasuki tahap distribusi.',
      timestamp: handedOver?.handoverDate ?? distributions[0]?.requestedAt,
    },
    {
      key: 'utilized',
      label: 'Utilized',
      state: utilized
        ? 'completed'
        : handedOver
          ? 'current'
          : isRejectedAll
            ? 'rejected'
            : 'pending',
      detail: utilized
        ? `${utilized.utilizationCategory}: ${utilized.utilizationDetail}`
        : handedOver
          ? `Dalam tahap pemanfaatan oleh penerima: ${handedOver.utilizationDetail}`
          : 'Belum tercatat dokumentasi pemanfaatan aktual.',
      timestamp: utilized?.handoverDate,
    },
  ];
}

export function generateDeterministicQrMatrix(
  seedText: string,
  size = 21
): boolean[][] {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const drawFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startR + r][startC + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      matrix[r][c] = (hash >>> 28) % 2 === 0;
    }
  }

  return matrix;
}

export function registerUserAccount(
  state: TracecoState,
  payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    segment?: ContributorSegment;
    unitOrAddress: string;
    registeredAt?: string;
  }
): { nextState: TracecoState; account?: UserAccount; error?: string } {
  const trimmedName = payload.name.trim();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const trimmedUnit = payload.unitOrAddress.trim();

  if (trimmedName.length < 3) {
    return { nextState: state, error: 'Nama lengkap minimal 3 karakter.' };
  }
  if (
    !normalizedEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return { nextState: state, error: 'Format alamat email tidak valid.' };
  }
  if (state.accounts.some((a) => a.email.toLowerCase() === normalizedEmail)) {
    return {
      nextState: state,
      error:
        'Email sudah terdaftar. Silakan masuk menggunakan akun yang sudah ada.',
    };
  }
  if (!trimmedUnit) {
    return {
      nextState: state,
      error: 'Unit asrama, lembaga, atau alamat wajib diisi.',
    };
  }
  if (payload.password.length < 6) {
    return {
      nextState: state,
      error: 'Kata sandi minimal 6 karakter.',
    };
  }
  if (payload.password !== payload.confirmPassword) {
    return {
      nextState: state,
      error: 'Konfirmasi kata sandi tidak cocok.',
    };
  }

  const today = payload.registeredAt ?? '2026-11-18';
  const nextSeq = state.contributors.length + 1;
  const newId = `CTR-USR-${String(nextSeq).padStart(3, '0')}`;
  const resolvedSegment = payload.segment ?? defaultSegmentForRole(payload.role);

  const newAccount: UserAccount = {
    id: newId,
    name: trimmedName,
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
    segment: resolvedSegment,
    unitOrAddress: trimmedUnit,
    registeredAt: today,
  };

  const newContributor: Contributor = {
    id: newId,
    name: trimmedName,
    role: payload.role,
    segment: resolvedSegment,
    unitOrAddress: trimmedUnit,
    activeSince: today,
    participationRole: `Terdaftar sebagai ${payload.role}`,
  };

  return {
    account: newAccount,
    nextState: {
      ...state,
      currentUserId: newId,
      activeRole: payload.role,
      activeActorIdByRole: {
        ...state.activeActorIdByRole,
        [payload.role]: newId,
      },
      accounts: [...state.accounts, newAccount],
      contributors: [...state.contributors, newContributor],
    },
  };
}

export function authenticateUser(
  state: TracecoState,
  email: string,
  password: string
): { nextState: TracecoState; account?: UserAccount; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return {
      nextState: state,
      error: 'Email dan kata sandi wajib diisi.',
    };
  }

  const account = state.accounts.find(
    (a) => a.email.toLowerCase() === normalizedEmail
  );

  if (!account || account.password !== password) {
    return {
      nextState: state,
      error: 'Email atau kata sandi tidak sesuai.',
    };
  }

  return {
    account,
    nextState: {
      ...state,
      currentUserId: account.id,
      activeRole: account.role,
      activeActorIdByRole: {
        ...state.activeActorIdByRole,
        [account.role]: account.id,
      },
    },
  };
}

export function switchPreviewRole(
  state: TracecoState,
  role: UserRole
): TracecoState {
  const matchingAccount = state.accounts.find((a) => a.role === role);
  const matchingContributor = state.contributors.find((c) => c.role === role);
  const actorId =
    matchingAccount?.id ??
    matchingContributor?.id ??
    state.activeActorIdByRole[role];

  return {
    ...state,
    activeRole: role,
    currentUserId: matchingAccount ? matchingAccount.id : state.currentUserId,
    activeActorIdByRole: {
      ...state.activeActorIdByRole,
      [role]: actorId,
    },
  };
}

export function logoutUser(state: TracecoState): TracecoState {
  return {
    ...state,
    currentUserId: null,
  };
}

export function toggleJoinCommunityActivityInState(
  state: TracecoState,
  params: {
    activityId: string;
    actorId: string;
    actionDate?: string;
  }
): { nextState: TracecoState; joined: boolean; error?: string } {
  const activity = state.community_activities.find(
    (a) => a.id === params.activityId
  );
  if (!activity) {
    return { nextState: state, joined: false, error: 'Agenda tidak ditemukan.' };
  }
  if (activity.status === 'Selesai') {
    return {
      nextState: state,
      joined: false,
      error: 'Agenda yang sudah selesai tidak dapat diubah pendaftarannya.',
    };
  }

  const currentList = activity.registeredParticipantIds ?? [];
  const alreadyJoined = currentList.includes(params.actorId);
  const actor = state.contributors.find((c) => c.id === params.actorId);
  const dateStr = params.actionDate ?? '2026-11-18';

  const updatedActivities = state.community_activities.map((a) => {
    if (a.id !== params.activityId) return a;
    const prevIds = a.registeredParticipantIds ?? [];
    if (alreadyJoined) {
      return {
        ...a,
        registeredParticipantIds: prevIds.filter((id) => id !== params.actorId),
        participantCount: Math.max(0, a.participantCount - 1),
      };
    }
    return {
      ...a,
      registeredParticipantIds: [...prevIds, params.actorId],
      participantCount: a.participantCount + 1,
    };
  });

  if (alreadyJoined) {
    return {
      joined: false,
      nextState: {
        ...state,
        community_activities: updatedActivities,
      },
    };
  }

  return {
    joined: true,
    nextState: {
      ...state,
      community_activities: updatedActivities,
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: `${dateStr} 15:30`,
          category: 'Komunitas',
          title: `${actor?.name ?? 'Peserta'} mendaftar ke ${activity.title}`,
          detail: `Partisipasi ${actor?.role ?? 'Komunitas'} pada ${activity.date} di ${activity.location}.`,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function createCommunityActivityInState(
  state: TracecoState,
  payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
    creatorId: string;
  }
): { nextState: TracecoState; activity?: CommunityActivity; error?: string } {
  const title = payload.title.trim();
  const location = payload.location.trim();
  const summary = payload.participantSummary.trim();
  const note = payload.inclusiveParticipationNote.trim();

  if (title.length < 5) {
    return {
      nextState: state,
      error: 'Judul kegiatan minimal 5 karakter.',
    };
  }
  if (!payload.date || !location) {
    return {
      nextState: state,
      error: 'Tanggal dan lokasi kegiatan wajib diisi.',
    };
  }

  const nextId = `COM-${String(state.community_activities.length + 1).padStart(3, '0')}`;
  const newActivity: CommunityActivity = {
    id: nextId,
    title,
    category: payload.category,
    date: payload.date,
    location,
    participantSummary:
      summary || 'Terbuka untuk Santri, Warga, Keluarga Rentan, & Mitra',
    participantCount: 1,
    registeredParticipantIds: [payload.creatorId],
    inclusiveParticipationNote:
      note ||
      'Agenda kolaborasi terbuka di Community Hub Pesantren Al-Amanah.',
    status: 'Terjadwal',
  };

  return {
    activity: newActivity,
    nextState: {
      ...state,
      community_activities: [newActivity, ...state.community_activities],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          title: `Agenda Komunitas Baru: ${title}`,
          detail: `Jadwal ${payload.date} di ${location} (${payload.category}).`,
          timestamp: `${payload.date} 08:00`,
          category: 'Community',
          read: false,
          targetPage: 'community',
        },
        ...state.notifications,
      ],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: `${payload.date} 08:00`,
          category: 'Komunitas',
          title: `Agenda baru ${nextId}: ${title}`,
          detail: `Dijadwalkan pada ${payload.date} di ${location}.`,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function updateCommunityActivityStatusInState(
  state: TracecoState,
  activityId: string,
  status: CommunityActivity['status']
): TracecoState {
  return {
    ...state,
    community_activities: state.community_activities.map((a) =>
      a.id === activityId ? { ...a, status } : a
    ),
  };
}

export function createCommunityPostInState(
  state: TracecoState,
  payload: {
    authorId: string;
    category: CommunityPostCategory;
    title: string;
    body: string;
    timestamp?: string;
  }
): { nextState: TracecoState; post?: CommunityPost; error?: string } {
  const title = payload.title.trim();
  const body = payload.body.trim();
  if (title.length < 4) {
    return { nextState: state, error: 'Judul topik diskusi minimal 4 karakter.' };
  }
  if (body.length < 8) {
    return {
      nextState: state,
      error: 'Isi pertanyaan atau catatan komunitas minimal 8 karakter.',
    };
  }

  const author = state.contributors.find((c) => c.id === payload.authorId);
  const existingPosts = state.community_posts ?? [];
  const nextId = `POST-${String(existingPosts.length + 1).padStart(3, '0')}`;
  const ts = payload.timestamp ?? '2026-11-18 14:20';

  const newPost: CommunityPost = {
    id: nextId,
    authorId: payload.authorId,
    authorName: author?.name ?? 'Anggota Komunitas',
    authorRole: author?.role ?? state.activeRole,
    authorSegment: author?.segment ?? defaultSegmentForRole(state.activeRole),
    category: payload.category,
    title,
    body,
    timestamp: ts,
    status: 'Terbuka',
    replies: [],
  };

  return {
    post: newPost,
    nextState: {
      ...state,
      community_posts: [newPost, ...existingPosts],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: ts,
          category: 'Komunitas',
          title: `Topik forum ${nextId}: ${title}`,
          detail: `${newPost.authorName} (${newPost.authorRole}) membuka diskusi kategori ${payload.category}.`,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function replyCommunityPostInState(
  state: TracecoState,
  payload: {
    postId: string;
    authorId: string;
    body: string;
    timestamp?: string;
  }
): { nextState: TracecoState; reply?: CommunityReply; error?: string } {
  const body = payload.body.trim();
  if (body.length < 3) {
    return { nextState: state, error: 'Tanggapan minimal 3 karakter.' };
  }

  const existingPosts = state.community_posts ?? [];
  const target = existingPosts.find((p) => p.id === payload.postId);
  if (!target) {
    return { nextState: state, error: 'Topik diskusi tidak ditemukan.' };
  }

  const author = state.contributors.find((c) => c.id === payload.authorId);
  const ts = payload.timestamp ?? '2026-11-18 15:00';
  const totalReplies = existingPosts.reduce(
    (sum, p) => sum + p.replies.length,
    0
  );
  const authorRole = author?.role ?? state.activeRole;

  const newReply: CommunityReply = {
    id: `RPL-${String(totalReplies + 1).padStart(3, '0')}`,
    authorId: payload.authorId,
    authorName: author?.name ?? 'Anggota Komunitas',
    authorRole,
    authorSegment: author?.segment ?? defaultSegmentForRole(authorRole),
    timestamp: ts,
    body,
  };

  return {
    reply: newReply,
    nextState: {
      ...state,
      community_posts: existingPosts.map((p) =>
        p.id === payload.postId
          ? {
              ...p,
              status: isVerifierRole(authorRole) ? 'Terjawab' : p.status,
              replies: [...p.replies, newReply],
            }
          : p
      ),
    },
  };
}

export function toggleCommunityPostStatusInState(
  state: TracecoState,
  postId: string
): TracecoState {
  const existingPosts = state.community_posts ?? [];
  return {
    ...state,
    community_posts: existingPosts.map((p) =>
      p.id === postId
        ? { ...p, status: p.status === 'Terbuka' ? 'Terjawab' : 'Terbuka' }
        : p
    ),
  };
}

export function createCollaborationProposalInState(
  state: TracecoState,
  payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
    proposedByRole: UserRole;
    actionDate?: string;
  }
): {
  nextState: TracecoState;
  collaboration?: CollaborationPartner;
  error?: string;
} {
  const partnerName = payload.partnerName.trim();
  const collaborationType = payload.collaborationType.trim();
  const activity = payload.activity.trim();

  if (partnerName.length < 3 || collaborationType.length < 3 || activity.length < 8) {
    return {
      nextState: state,
      error: 'Nama mitra, jenis kolaborasi, dan rincian rencana wajib diisi lengkap.',
    };
  }

  const nextId = `COLB-${String(state.collaborations.length + 1).padStart(2, '0')}`;
  const dateStr = payload.actionDate ?? '2026-11-18';
  const newColb: CollaborationPartner = {
    id: nextId,
    partnerName,
    collaborationType,
    activity,
    proposedByRole: payload.proposedByRole,
    status: 'Dalam Koordinasi',
  };

  return {
    collaboration: newColb,
    nextState: {
      ...state,
      collaborations: [newColb, ...state.collaborations],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          title: `Usulan Kolaborasi Baru: ${partnerName}`,
          detail: `${collaborationType} — menunggu tindak lanjut Admin.`,
          timestamp: `${dateStr} 15:40`,
          category: 'Community',
          read: false,
          targetPage: 'community',
        },
        ...state.notifications,
      ],
      recent_activities: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: `${dateStr} 15:40`,
          category: 'Komunitas',
          title: `Usulan kolaborasi ${nextId}: ${partnerName}`,
          detail: `${collaborationType} · ${activity}`,
        },
        ...state.recent_activities,
      ],
    },
  };
}

export function updateCollaborationStatusInState(
  state: TracecoState,
  collaborationId: string,
  status: CollaborationPartner['status']
): TracecoState {
  return {
    ...state,
    collaborations: state.collaborations.map((c) =>
      c.id === collaborationId ? { ...c, status } : c
    ),
  };
}
