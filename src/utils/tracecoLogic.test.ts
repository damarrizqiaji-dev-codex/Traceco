import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ROLES,
  buildSubmissionTraceability,
  canVerifySubmission,
  computeActiveContributorBreakdown,
  computeContributionTimeSeries,
  computeContributorPointsBalance,
  computeContributorStats,
  computeContributorTransactionsWithBalance,
  computePlatformMetrics,
  computeVerifiedInventory,
  createCollaborationProposalInState,
  createCommunityActivityInState,
  createCommunityPostInState,
  createDistributionRequestInState,
  generateNextBatchId,
  generateNextSubmissionId,
  getAvailableBatchQuantity,
  getSubmissionStatusLabel,
  POINTS_PER_ECOBRICK,
  redeemRewardInState,
  replyCommunityPostInState,
  submitEcobrickContributionInState,
  toggleCommunityPostStatusInState,
  toggleJoinCommunityActivityInState,
  updateCollaborationStatusInState,
  updateCommunityActivityStatusInState,
  updateDistributionStatusInState,
  verifySubmissionInState,
} from './tracecoLogic';
import { EMPTY_TRACECO_STATE } from '../data/seedData';
import type { EcobrickSubmission, PhysicalChecklist } from '../types/traceco';

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

test('Points per verified ecobrick equals 20 and empty state metrics reconcile accurately', () => {
  assert.equal(POINTS_PER_ECOBRICK, 20);
  const metrics = computePlatformMetrics(EMPTY_TRACECO_STATE);
  assert.equal(metrics.ecobricksSubmittedCount, 0);
  assert.equal(metrics.ecobricksVerifiedCount, 0);
  assert.equal(metrics.totalPointsDistributed, 0);
});

test('Admin cannot verify their own submission', () => {
  const dummySub: EcobrickSubmission = {
    submissionId: 'TRC-2026-001',
    contributorId: 'USER-ADMIN-01',
    dropoffPointId: 'DP-01',
    dropoffPointName: 'Pos Utama',
    date: '2026-11-18',
    bottleSize: 'Botol PET 600 ml',
    quantitySubmitted: 10,
    status: 'Pending',
    verifiedQuantity: 0,
    rejectedQuantity: 0,
  };

  const selfCheck = canVerifySubmission(dummySub, 'USER-ADMIN-01');
  assert.equal(selfCheck.allowed, false);
  assert.match(selfCheck.reason ?? '', /tidak diperbolehkan memverifikasi/i);
});
