export type AppPageId =
  | 'dashboard'
  | 'contribution'
  | 'marketplace'
  | 'transactions'
  | 'activities'
  | 'verification'
  | 'verified_list'
  | 'history'
  | 'reward'
  | 'traceability'
  | 'inventory'
  | 'distribution'
  | 'requests'
  | 'my_requests'
  | 'utilization'
  | 'monitor'
  | 'community'
  | 'profile'
  | 'notifications'
  | 'settings';

export type UserRole = 'Kontributor' | 'Admin' | 'Mitra';

export type ContributorSegment =
  | 'Santri'
  | 'Warga'
  | 'Keluarga Rentan'
  | 'Admin'
  | 'Mitra';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  segment: ContributorSegment;
  unitOrAddress: string;
  registeredAt: string;
}

export interface Contributor {
  id: string;
  name: string;
  role: UserRole;
  segment: ContributorSegment;
  unitOrAddress: string;
  activeSince: string;
  participationRole?: string;
}

export interface DropOffPoint {
  id: string;
  name: string;
  area: string;
  schedule: string;
  coordinator: string;
}

export type SubmissionStatus =
  | 'Pending'
  | 'Verified'
  | 'Partially Verified'
  | 'Rejected';

export interface EcobrickSubmission {
  submissionId: string;
  contributorId: string;
  dropoffPointId: string;
  dropoffPointName: string;
  date: string;
  bottleSize: string;
  quantitySubmitted: number;
  weightKg?: number;
  iotSimulatedWeightKg?: number;
  photoDataUrl?: string;
  photoLabel?: string;
  notes?: string;
  status: SubmissionStatus;
  verifiedQuantity: number;
  rejectedQuantity: number;
}

export interface PhysicalChecklist {
  kondisiBotol: boolean;
  kebersihan: boolean;
  kekeringan: boolean;
  kepadatan: boolean;
  kondisiFisik: boolean;
  kesesuaianStandar: boolean;
  jumlahSesuai: boolean;
  beratSesuai: boolean;
}

export interface VerificationRecord {
  id: string;
  submissionId: string;
  contributorId: string;
  batchId?: string;
  checklist: PhysicalChecklist;
  verifierId: string;
  verifierName: string;
  verifiedAt: string;
  verifiedCount: number;
  rejectedCount: number;
  decision: 'Verified' | 'Partially Verified' | 'Rejected';
  rejectionReason?: string;
}

export interface EcobrickBatch {
  batchId: string;
  submissionId: string;
  contributorId: string;
  date: string;
  verifiedAt: string;
  bottleSize: string;
  quantity: number;
  weightKg: number;
  notes?: string;
}

export interface GreenPointEntry {
  id: string;
  contributorId: string;
  date: string;
  type: 'Earned' | 'Redeemed';
  points: number;
  sourceLabel: string;
  submissionId?: string;
  batchId?: string;
  redemptionId?: string;
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  category:
    | 'Merchandise Ramah Lingkungan'
    | 'Voucher Kegiatan'
    | 'Perlengkapan Belajar'
    | 'Benefit Komunitas'
    | 'Reward Program Pesantren';
  pointsCost: number;
  description: string;
  stockNote: string;
}

export type RedemptionStatus = 'Pending' | 'Approved' | 'Completed';

export interface RewardRedemption {
  id: string;
  contributorId: string;
  rewardId: string;
  rewardTitle: string;
  pointsCost: number;
  status: RedemptionStatus;
  requestedAt: string;
  updatedAt: string;
}

export type IncentiveStatus = 'Pending' | 'Approved' | 'Paid';

export interface FinancialIncentive {
  id: string;
  contributorId: string;
  batchId: string;
  amountIdr: number;
  fundingSource: string;
  conditionNote: string;
  status: IncentiveStatus;
  updatedAt: string;
}

export type InventoryStatus =
  | 'Available'
  | 'Reserved'
  | 'Distributed'
  | 'Utilized';

export type DistributionStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Handed Over'
  | 'Utilized';

export type RequesterType =
  | 'Pesantren'
  | 'Komunitas'
  | 'Pengrajin'
  | 'Mitra Pemanfaat';

export type UtilizationCategory =
  | 'Fasilitas Pesantren'
  | 'Kegiatan Komunitas'
  | 'Produk Kerajinan'
  | 'Proyek Mitra';

export interface DistributionRequest {
  id: string;
  batchId: string;
  batchContributorId?: string;
  requesterId?: string;
  requesterName: string;
  requesterType: RequesterType;
  requestedCount: number;
  utilizationCategory: UtilizationCategory;
  location?: string;
  neededDate?: string;
  utilizationDetail: string;
  status: DistributionStatus;
  requestedAt: string;
  reviewedBy?: string;
  handoverDate?: string;
  receiverName?: string;
  documentationNote?: string;
}

export interface UtilizationRecord {
  id: string;
  requestId: string;
  batchId: string;
  batchContributorId?: string;
  requesterId?: string;
  recipientName: string;
  utilizationCategory: UtilizationCategory;
  location?: string;
  purpose: string;
  quantityUtilized: number;
  documentedAt: string;
  documentationNote: string;
}

export interface CommunityActivity {
  id: string;
  title: string;
  category:
    | 'Edukasi Ecobrick'
    | 'Pelatihan'
    | 'Kampanye Komunitas'
    | 'Pemanfaatan Bersama';
  date: string;
  location: string;
  participantSummary: string;
  participantCount: number;
  registeredParticipantIds: string[];
  inclusiveParticipationNote: string;
  status: 'Terjadwal' | 'Berlangsung' | 'Selesai';
}

export interface CollaborationPartner {
  id: string;
  partnerName: string;
  collaborationType: string;
  activity: string;
  proposedByRole?: UserRole;
  status: 'Aktif' | 'Dalam Koordinasi' | 'Selesai';
}

export type CommunityPostCategory =
  | 'Tanya Standar'
  | 'Koordinasi Pos'
  | 'Ide Pemanfaatan'
  | 'Dukungan Komunitas';

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorSegment: ContributorSegment;
  timestamp: string;
  body: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorSegment: ContributorSegment;
  category: CommunityPostCategory;
  title: string;
  body: string;
  timestamp: string;
  status: 'Terbuka' | 'Terjawab';
  replies: CommunityReply[];
}

export interface AppNotification {
  id: string;
  recipientUid?: string;
  recipientRole?: UserRole;
  title: string;
  detail: string;
  timestamp: string;
  category:
    | 'Submission'
    | 'Verification'
    | 'Reward'
    | 'Distribution'
    | 'Community';
  read: boolean;
  targetPage: AppPageId;
}

export interface ActivityFeedItem {
  id: string;
  actorUid?: string;
  targetContributorUid?: string;
  timestamp: string;
  category:
    | 'Kontribusi'
    | 'Verifikasi'
    | 'Reward'
    | 'Distribusi'
    | 'Komunitas';
  title: string;
  detail: string;
  submissionId?: string;
  batchId?: string;
}

export interface TracecoState {
  currentUserId: string | null;
  activeRole: UserRole;
  accounts: UserAccount[];
  contributors: Contributor[];
  dropoff_points: DropOffPoint[];
  ecobrick_submissions: EcobrickSubmission[];
  verification_records: VerificationRecord[];
  ecobrick_batches: EcobrickBatch[];
  green_points: GreenPointEntry[];
  rewards: RewardCatalogItem[];
  redemptions: RewardRedemption[];
  financial_incentives: FinancialIncentive[];
  distribution_requests: DistributionRequest[];
  utilization_records: UtilizationRecord[];
  community_activities: CommunityActivity[];
  collaborations: CollaborationPartner[];
  community_posts: CommunityPost[];
  notifications: AppNotification[];
  recent_activities: ActivityFeedItem[];
}
