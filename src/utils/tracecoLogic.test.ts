import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ROLES,
  authenticateUser,
  buildSubmissionTraceability,
  canVerifySubmission,
  computeActiveContributorBreakdown,
  computeContributionTimeSeries,
  computeContributorPointsBalance,
  computeContributorStats,
  computePlatformMetrics,
  computeVerifiedInventory,
  createCollaborationProposalInState,
  createCommunityActivityInState,
  createCommunityPostInState,
  createDistributionRequestInState,
  generateNextBatchId,
  generateNextSubmissionId,
  logoutUser,
  POINTS_PER_ECOBRICK,
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
  verifySubmissionInState,
} from './tracecoLogic';
import { INITIAL_TRACECO_STATE } from '../data/seedData';
import type { PhysicalChecklist } from '../types/traceco';

const ALL_TRUE_CHECKLIST: PhysicalChecklist = {
  kondisiBotol: true,
  kebersihan: true,
  kekeringan: true,
  kepadatan: true,
  kondisiFisik: true,
  kesesuaianStandar: true,
  jumlahSesuai: true,
  beratSesuai: true,
};

test('Points per verified ecobrick equals 20 and seed metrics reconcile accurately', () => {
  assert.equal(POINTS_PER_ECOBRICK, 20);
  const metrics = computePlatformMetrics(INITIAL_TRACECO_STATE);
  assert.equal(metrics.ecobricksSubmittedCount, 130);
  assert.equal(metrics.ecobricksVerifiedCount, 93);
  assert.equal(metrics.ecobricksPendingCount, 20);
  assert.equal(metrics.ecobricksRejectedCount, 17);
  assert.equal(metrics.ecobricksDistributedCount, 40);
  assert.equal(metrics.ecobricksUtilizedCount, 20);
  assert.equal(metrics.ecobricksReservedCount, 15);
  assert.equal(metrics.inventoryAvailableCount, 38);
  assert.equal(metrics.totalPointsDistributed, 93 * 20);
  assert.equal(metrics.totalContributorsCount, 5);
  assert.equal(metrics.activeContributorsCount, 5);

  const rizqiStats = computeContributorStats(
    INITIAL_TRACECO_STATE,
    'CTR-SAN-01',
    '2026-11-18'
  );
  assert.equal(rizqiStats.submittedUnits, 42);
  assert.equal(rizqiStats.verifiedUnits, 38);
  assert.equal(rizqiStats.pendingUnits, 4);
  assert.equal(rizqiStats.pointsEarned, 760);
  assert.equal(rizqiStats.pointsBalance, 640);
});

test('Admin cannot verify their own submission', () => {
  const pendingSubmission = INITIAL_TRACECO_STATE.ecobrick_submissions.find(
    (s) => s.status === 'Pending' && s.contributorId === 'CTR-VER-01'
  );
  assert.ok(
    pendingSubmission,
    'Expected a pending submission owned by CTR-VER-01'
  );

  const selfCheck = canVerifySubmission(
    pendingSubmission,
    pendingSubmission.contributorId
  );
  assert.equal(selfCheck.allowed, false);
  assert.match(selfCheck.reason ?? '', /tidak diperbolehkan memverifikasi/i);
});

test('End-to-End Flow across 3 roles: Kontributor submits 10 -> Admin verifies 8 & rejects 2 -> +160 pts -> Mitra requests 5 with location & date -> Admin approves & hands over -> Utilized', () => {
  const beforeMetrics = computePlatformMetrics(INITIAL_TRACECO_STATE);
  const santriId = 'CTR-SAN-01';
  const beforeBalance = computeContributorPointsBalance(
    INITIAL_TRACECO_STATE,
    santriId
  ).balance;

  // 1. Kontributor (Santri) submits 10 ecobricks with photo metadata
  const subRes = submitEcobrickContributionInState(INITIAL_TRACECO_STATE, {
    contributorId: santriId,
    dropoffPointId: 'DP-02',
    date: '2026-11-18',
    bottleSize: 'Botol PET 600 ml (Standar min. 250g/unit)',
    quantitySubmitted: 10,
    weightKg: 3.0,
    photoLabel: 'foto-setoran-santri.jpg',
    notes: '10 ecobrick siap periksa dari Asrama Al-Farabi',
  });
  assert.equal(subRes.error, undefined);
  assert.ok(subRes.submission);
  assert.equal(subRes.submission.photoLabel, 'foto-setoran-santri.jpg');
  const submissionId = subRes.submission.submissionId;

  // 2. Partial rejection requires rejectionReason
  const missingReason = verifySubmissionInState(subRes.nextState, {
    submissionId,
    verifierId: 'CTR-ADM-01',
    checklist: ALL_TRUE_CHECKLIST,
    verifiedCount: 8,
    rejectionReason: '',
    verifiedAt: '2026-11-18 11:00',
  });
  assert.ok(missingReason.error);

  // 3. Admin inspects -> 8 Verified, 2 Rejected with reason
  const verRes = verifySubmissionInState(subRes.nextState, {
    submissionId,
    verifierId: 'CTR-ADM-01',
    checklist: ALL_TRUE_CHECKLIST,
    verifiedCount: 8,
    rejectionReason: '2 botol bagian leher masih kurang padat.',
    verifiedAt: '2026-11-18 11:05',
  });
  assert.equal(verRes.error, undefined);
  assert.ok(verRes.batch);
  assert.equal(verRes.batch.quantity, 8);

  const updatedSub = verRes.nextState.ecobrick_submissions.find(
    (s) => s.submissionId === submissionId
  )!;
  assert.equal(updatedSub.status, 'Partially Verified');
  assert.equal(updatedSub.verifiedQuantity, 8);
  assert.equal(updatedSub.rejectedQuantity, 2);

  // 4. Green Points awarded ONLY for 8 verified units (8 * 20 = 160 pts)
  const afterBalance = computeContributorPointsBalance(
    verRes.nextState,
    santriId
  ).balance;
  assert.equal(afterBalance, beforeBalance + 8 * POINTS_PER_ECOBRICK);

  // 5. Santri redeems reward from catalog
  const redeemRes = redeemRewardInState(verRes.nextState, {
    contributorId: santriId,
    rewardId: 'REW-CAT-04',
    requestedAt: '2026-11-18',
  });
  assert.equal(redeemRes.error, undefined);

  // 6. 8 verified ecobricks enter inventory
  const invBeforeReq = computeVerifiedInventory(
    redeemRes.nextState.ecobrick_batches,
    redeemRes.nextState.distribution_requests,
    redeemRes.nextState.contributors
  ).find((i) => i.batchId === verRes.batch!.batchId);
  assert.equal(invBeforeReq?.availableCount, 8);

  // 7. Mitra requests 5 ecobricks with location & neededDate
  const reqRes = createDistributionRequestInState(redeemRes.nextState, {
    batchId: verRes.batch.batchId,
    requesterId: 'CTR-MITRA-01',
    requesterName: 'Bapak Slamet (Sanggar Bambu Krajan)',
    requesterType: 'Mitra Pemanfaat',
    requestedCount: 5,
    utilizationCategory: 'Proyek Mitra',
    location: 'Taman Baca RW 03',
    neededDate: '2026-11-28',
    utilizationDetail: 'Perakitan modul meja baca komunitas',
    requestedAt: '2026-11-18',
  });
  assert.equal(reqRes.error, undefined);
  assert.ok(reqRes.request);
  assert.equal(reqRes.request.location, 'Taman Baca RW 03');
  assert.equal(reqRes.request.neededDate, '2026-11-28');

  // 8. Admin approves & hands over -> Mitra confirms Utilized
  const approvedState = updateDistributionStatusInState(reqRes.nextState, {
    requestId: reqRes.request.id,
    nextStatus: 'Approved',
    reviewerName: 'Hendra Saputra',
  });
  const handedOverState = updateDistributionStatusInState(approvedState, {
    requestId: reqRes.request.id,
    nextStatus: 'Handed Over',
    reviewerName: 'Hendra Saputra',
    receiverName: 'Bapak Slamet',
    documentationNote: 'Serah terima 5 unit dicatat.',
  });
  const utilizedState = updateDistributionStatusInState(handedOverState, {
    requestId: reqRes.request.id,
    nextStatus: 'Utilized',
    reviewerName: 'Bapak Slamet (Sanggar Bambu Krajan)',
    receiverName: 'Bapak Slamet',
    documentationNote: 'Terpasang di ruang baca komunitas.',
  });

  // 9. Traceability timeline covers all 6 stages
  const stages = buildSubmissionTraceability(utilizedState, submissionId);
  assert.equal(stages.length, 6);
  assert.equal(stages.find((s) => s.key === 'verified')?.state, 'completed');
  assert.equal(stages.find((s) => s.key === 'rewarded')?.state, 'completed');
  assert.equal(stages.find((s) => s.key === 'inventoried')?.state, 'completed');
  assert.equal(stages.find((s) => s.key === 'distributed')?.state, 'completed');
  assert.equal(stages.find((s) => s.key === 'utilized')?.state, 'completed');

  // 10. Eco-Monitor reflects exact updates
  const afterMetrics = computePlatformMetrics(utilizedState);
  assert.equal(
    afterMetrics.ecobricksSubmittedCount,
    beforeMetrics.ecobricksSubmittedCount + 10
  );
  assert.equal(
    afterMetrics.ecobricksVerifiedCount,
    beforeMetrics.ecobricksVerifiedCount + 8
  );
  assert.equal(
    afterMetrics.ecobricksRejectedCount,
    beforeMetrics.ecobricksRejectedCount + 2
  );
  assert.equal(
    afterMetrics.ecobricksDistributedCount,
    beforeMetrics.ecobricksDistributedCount + 5
  );
  assert.equal(
    afterMetrics.ecobricksUtilizedCount,
    beforeMetrics.ecobricksUtilizedCount + 5
  );
  assert.equal(
    afterMetrics.inventoryAvailableCount,
    beforeMetrics.inventoryAvailableCount + 3
  );
});

test('Contribution time series & active contributor segment breakdown compute accurately across ranges', () => {
  const rizqiSubs = INITIAL_TRACECO_STATE.ecobrick_submissions.filter(
    (s) => s.contributorId === 'CTR-SAN-01'
  );
  const res7d = computeContributionTimeSeries(rizqiSubs, '7d', '2026-11-18');
  assert.equal(res7d.buckets.length, 7);
  assert.equal(res7d.totalSubmittedInPeriod, 12); // Nov 12 (8) + Nov 16 (4)

  const res30d = computeContributionTimeSeries(rizqiSubs, '30d', '2026-11-18');
  assert.equal(res30d.buckets.length, 5);
  assert.equal(res30d.totalSubmittedInPeriod, 22); // Oct 28 (10) + Nov 12 (8) + Nov 16 (4)

  const res3m = computeContributionTimeSeries(rizqiSubs, '3m', '2026-11-18');
  assert.equal(res3m.buckets.length, 3); // Sep, Oct, Nov
  assert.equal(res3m.totalSubmittedInPeriod, 42);

  const res1y = computeContributionTimeSeries(rizqiSubs, '1y', '2026-11-18');
  assert.equal(res1y.buckets.length, 12);
  assert.equal(res1y.totalSubmittedInPeriod, 42);

  const segBreakdown = computeActiveContributorBreakdown(INITIAL_TRACECO_STATE);
  assert.equal(segBreakdown.length, 3);
  assert.equal(segBreakdown.find((b) => b.segment === 'Santri')?.activeCount, 2);
  assert.equal(segBreakdown.find((b) => b.segment === 'Warga')?.activeCount, 2);
  assert.equal(
    segBreakdown.find((b) => b.segment === 'Keluarga Rentan')?.activeCount,
    1
  );
});

test('Sequential IDs increment properly', () => {
  const nextSub = generateNextSubmissionId(
    INITIAL_TRACECO_STATE.ecobrick_submissions
  );
  const nextBatch = generateNextBatchId(INITIAL_TRACECO_STATE.ecobrick_batches);
  assert.match(nextSub, /^TRC-2026-\d{3}$/);
  assert.match(nextBatch, /^TRC-B-\d{3}$/);
});

test('Registration, authentication, Prototype Role Preview switching, and logout work across all 3 roles', () => {
  assert.equal(ALL_ROLES.length, 3);

  const regRes = registerUserAccount(INITIAL_TRACECO_STATE, {
    name: 'Keluarga Ibu Hasanah',
    email: 'hasanah@alamanah.id',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'Kontributor',
    segment: 'Keluarga Rentan',
    unitOrAddress: 'Kampung Pinggir Sungai RT 02',
    registeredAt: '2026-11-18',
  });
  assert.equal(regRes.error, undefined);
  assert.equal(regRes.nextState.activeRole, 'Kontributor');
  assert.equal(regRes.account?.segment, 'Keluarga Rentan');

  for (const role of ALL_ROLES) {
    const switched = switchPreviewRole(regRes.nextState, role);
    assert.equal(switched.activeRole, role);
  }

  const badLogin = authenticateUser(
    INITIAL_TRACECO_STATE,
    'admin.pesantren@alamanah.id',
    'wrong'
  );
  assert.ok(badLogin.error);

  const okLogin = authenticateUser(
    INITIAL_TRACECO_STATE,
    'admin.pesantren@alamanah.id',
    'traceco123'
  );
  assert.equal(okLogin.error, undefined);
  assert.equal(okLogin.nextState.activeRole, 'Admin');

  const loggedOut = logoutUser(okLogin.nextState);
  assert.equal(loggedOut.currentUserId, null);
});

test('Community Hub supports persistent activity RSVP, agenda creation, forum Q&A, and collaboration workflow', () => {
  const joinRes = toggleJoinCommunityActivityInState(INITIAL_TRACECO_STATE, {
    activityId: 'COM-001',
    actorId: 'CTR-SAN-01',
  });
  assert.equal(joinRes.joined, true);
  const com1AfterJoin = joinRes.nextState.community_activities.find(
    (a) => a.id === 'COM-001'
  )!;
  assert.equal(com1AfterJoin.participantCount, 46);
  assert.ok(com1AfterJoin.registeredParticipantIds.includes('CTR-SAN-01'));

  const leaveRes = toggleJoinCommunityActivityInState(joinRes.nextState, {
    activityId: 'COM-001',
    actorId: 'CTR-SAN-01',
  });
  assert.equal(leaveRes.joined, false);
  assert.equal(
    leaveRes.nextState.community_activities.find((a) => a.id === 'COM-001')!
      .participantCount,
    45
  );

  const actRes = createCommunityActivityInState(leaveRes.nextState, {
    title: 'Klinik Pemadatan Ecobrick Asrama Putri',
    category: 'Edukasi Ecobrick',
    date: '2026-11-25',
    location: 'Serambi Asrama Putri',
    participantSummary: 'Santri Putri & Relawan Verifikator',
    inclusiveParticipationNote: 'Pendampingan alat pemadat standar.',
    creatorId: 'CTR-ADM-01',
  });
  assert.equal(actRes.error, undefined);
  assert.ok(actRes.activity);
  const statusUpdated = updateCommunityActivityStatusInState(
    actRes.nextState,
    actRes.activity.id,
    'Berlangsung'
  );
  assert.equal(
    statusUpdated.community_activities.find((a) => a.id === actRes.activity!.id)
      ?.status,
    'Berlangsung'
  );

  const postRes = createCommunityPostInState(statusUpdated, {
    authorId: 'CTR-SAN-01',
    category: 'Tanya Standar',
    title: 'Bolehkah memakai botol PET 1500 ml bening tanpa label?',
    body: 'Kami punya banyak botol 1500 ml bersih tanpa merek, apakah diterima di pos?',
  });
  assert.equal(postRes.error, undefined);
  assert.ok(postRes.post);
  assert.equal(postRes.post.status, 'Terbuka');

  const replyRes = replyCommunityPostInState(postRes.nextState, {
    postId: postRes.post.id,
    authorId: 'CTR-VER-01',
    body: 'Boleh, botol tanpa label justru memudahkan pengecekan kepadatan isi.',
  });
  assert.equal(replyRes.error, undefined);
  const answeredPost = replyRes.nextState.community_posts.find(
    (p) => p.id === postRes.post!.id
  )!;
  assert.equal(answeredPost.status, 'Terjawab');
  assert.equal(answeredPost.replies.length, 1);

  const reopened = toggleCommunityPostStatusInState(
    replyRes.nextState,
    postRes.post.id
  );
  assert.equal(
    reopened.community_posts.find((p) => p.id === postRes.post!.id)?.status,
    'Terbuka'
  );

  const colbRes = createCollaborationProposalInState(reopened, {
    partnerName: 'Komunitas Taman Baca Krajan',
    collaborationType: 'Workshop Perakitan Rak Buku',
    activity: 'Merakit 3 rak buku dari ecobrick 600 ml terverifikasi bersama santri.',
    proposedByRole: 'Mitra',
  });
  assert.equal(colbRes.error, undefined);
  assert.ok(colbRes.collaboration);
  assert.equal(colbRes.collaboration.status, 'Dalam Koordinasi');

  const activatedColb = updateCollaborationStatusInState(
    colbRes.nextState,
    colbRes.collaboration.id,
    'Aktif'
  );
  assert.equal(
    activatedColb.collaborations.find(
      (c) => c.id === colbRes.collaboration!.id
    )?.status,
    'Aktif'
  );
});
