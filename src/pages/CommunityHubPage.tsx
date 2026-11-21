import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import type {
  AppPageId,
  CollaborationPartner,
  CommunityActivity,
  CommunityPostCategory,
  TracecoState,
} from '../types/traceco';
import {
  isMitraRole,
  isPenyerahRole,
  isVerifierRole,
} from '../utils/tracecoLogic';
import { PrimaryButton, SecondaryButton } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { FormField, fieldInputClass } from '../components/ui/FormField';
import { MetricStrip } from '../components/ui/Metric';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { RoleTag, StatusTag } from '../components/ui/StatusBadge';

interface CommunityHubPageProps {
  state: TracecoState;
  embedded?: boolean;
  onNavigate: (page: AppPageId) => void;
  onToggleJoinActivity: (activityId: string) => {
    joined: boolean;
    error?: string;
  };
  onCreateActivity: (payload: {
    title: string;
    category: CommunityActivity['category'];
    date: string;
    location: string;
    participantSummary: string;
    inclusiveParticipationNote: string;
  }) => { error?: string };
  onUpdateActivityStatus: (
    activityId: string,
    status: CommunityActivity['status']
  ) => void;
  onCreatePost: (payload: {
    category: CommunityPostCategory;
    title: string;
    body: string;
  }) => { error?: string };
  onReplyPost: (postId: string, body: string) => { error?: string };
  onTogglePostStatus: (postId: string) => void;
  onCreateCollaboration: (payload: {
    partnerName: string;
    collaborationType: string;
    activity: string;
  }) => { error?: string };
  onUpdateCollaborationStatus: (
    collaborationId: string,
    status: CollaborationPartner['status']
  ) => void;
}

interface EducationTopic {
  id: string;
  index: string;
  shortTitle: string;
  title: string;
  summary: string;
  acceptedItems: string[];
  rejectedItems: string[];
  targetAction: string;
}

const EDUCATION_TOPICS: EducationTopic[] = [
  {
    id: 'EDU-01',
    index: '01',
    shortTitle: 'Pembuatan',
    title: 'Standar Pembuatan & Pemadatan Ecobrick',
    summary:
      'Kontributor membuat ecobrick di rumah atau asrama menggunakan botol PET bersih dan kemasan plastik kering non-B3 sebelum diserahkan ke pos.',
    acceptedItems: [
      'Botol PET bening ukuran seragam (600 ml, 1000 ml, atau 1500 ml) dengan tutup asli terpasang rapat.',
      'Plastik kemasan fleksibel (bungkus mi, kopi, deterjen, kantong belanja) yang dicuci dan dijemur kering total.',
      'Pemadatan merata menggunakan tongkat kayu/bambu dari bagian dasar hingga leher botol.',
    ],
    rejectedItems: [
      'Sisa makanan, minyak basah, kertas, logam, kaca, baterai, atau limbah medis/B3.',
      'Botol penyok, retak, atau terasa empuk/kempes saat ditekan dua jari.',
    ],
    targetAction:
      'Pastikan berat botol memenuhi batas minimal sebelum dibawa ke pos.',
  },
  {
    id: 'EDU-02',
    index: '02',
    shortTitle: 'Pemeriksaan',
    title: 'Pemeriksaan Fisik 8 Kriteria di Pos Hub',
    summary:
      'Petugas memeriksa kondisi botol, kebersihan, kekeringan, kepadatan, kelayakan fisik, kesesuaian material, jumlah unit, dan berat standar.',
    acceptedItems: [
      'Botol 600 ml: minimal 250 gram per unit.',
      'Botol 1000 ml: minimal 400 gram per unit.',
      'Botol 1500 ml: minimal 500 gram per unit.',
    ],
    rejectedItems: [
      'Unit yang lembab atau berembun di dinding dalam botol otomatis ditolak sebagian (Partially Verified).',
      'Unit yang ditolak dikembalikan ke penyerah disertai catatan perbaikan tertulis.',
    ],
    targetAction:
      'Hanya unit yang lolos 8 kriteria yang memperoleh Batch ID & +20 Green Points.',
  },
  {
    id: 'EDU-03',
    index: '03',
    shortTitle: 'Peran Hub',
    title: 'Peran Pesantren sebagai Community Hub',
    summary:
      'Pesantren Al-Amanah mengoordinasikan penerimaan ecobrick jadi, verifikasi independen, inventori batch, Green Reward, dan penyaluran pemanfaatan.',
    acceptedItems: [
      'Penyerah Ecobrick (Santri, Warga, Keluarga Rentan) menyetorkan unit jadi pada jadwal pos.',
      'Petugas menjaga pemisahan pencatatan agar angka Submitted, Verified, Distributed, dan Utilized tidak tercampur.',
    ],
    rejectedItems: [
      'TRACECO tidak menerima sampah plastik mentah curah yang belum menjadi ecobrick.',
    ],
    targetAction:
      'Gunakan Forum Koordinasi jika membutuhkan jadwal serah kolektif RT/asrama.',
  },
  {
    id: 'EDU-04',
    index: '04',
    shortTitle: 'Kolaborasi',
    title: 'Pemanfaatan Kolektif & Kolaborasi Mitra',
    summary:
      'Stok ecobrick terverifikasi di inventori disalurkan ke sarana pesantren, kebun komunitas warga, dan sanggar mitra pengrajin lokal.',
    acceptedItems: [
      'Setiap modul meja, bangku taman, atau pembatas tanam memerlukan ukuran botol dan berat seragam.',
      'Mitra pemanfaat mengajukan permintaan dari Batch ID tersedia lalu mengonfirmasi status Utilized setelah terpasang.',
    ],
    rejectedItems: [
      'Pengambilan unit dari gudang hub tanpa persetujuan Request ID dan berita acara handover.',
    ],
    targetAction:
      'Mitra dapat mempublikasikan kebutuhan ukuran botol melalui Forum Koordinasi.',
  },
];

const BOTTLE_MIN_GRAMS: Record<
  '600' | '1000' | '1500',
  { label: string; minGrams: number; idealGrams: number }
> = {
  '600': { label: 'Botol PET 600 ml', minGrams: 250, idealGrams: 270 },
  '1000': { label: 'Botol PET 1000 ml', minGrams: 400, idealGrams: 420 },
  '1500': { label: 'Botol PET 1500 ml', minGrams: 500, idealGrams: 525 },
};

const ACTIVITY_CATEGORIES: CommunityActivity['category'][] = [
  'Edukasi Ecobrick',
  'Pelatihan',
  'Kampanye Komunitas',
  'Pemanfaatan Bersama',
];

const POST_CATEGORIES: CommunityPostCategory[] = [
  'Tanya Standar',
  'Koordinasi Pos',
  'Ide Pemanfaatan',
  'Dukungan Komunitas',
];

export function CommunityHubPage({
  state,
  embedded = false,
  onNavigate,
  onToggleJoinActivity,
  onCreateActivity,
  onUpdateActivityStatus,
  onCreatePost,
  onReplyPost,
  onTogglePostStatus,
  onCreateCollaboration,
  onUpdateCollaborationStatus,
}: CommunityHubPageProps) {
  const activeActorId = state.currentUserId ?? '';
  const activeActor = state.contributors.find((c) => c.id === activeActorId);
  const isHubCoordinator = isVerifierRole(state.activeRole);
  const canProposeCollab =
    isMitraRole(state.activeRole) || isVerifierRole(state.activeRole);

  // Section 1: Activities filter & Petugas creation
  const [activityStatusFilter, setActivityStatusFilter] = useState<
    'Semua' | CommunityActivity['status']
  >('Semua');
  const [activitySearch, setActivitySearch] = useState('');
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActCategory, setNewActCategory] =
    useState<CommunityActivity['category']>('Edukasi Ecobrick');
  const [newActDate, setNewActDate] = useState('2026-11-24');
  const [newActLocation, setNewActLocation] = useState('');
  const [newActSummary, setNewActSummary] = useState('');
  const [newActNote, setNewActNote] = useState('');
  const [activityFeedback, setActivityFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Section 2: Forum filter, post form & replies
  const [postStatusFilter, setPostStatusFilter] = useState<
    'Semua' | 'Terbuka' | 'Terjawab'
  >('Semua');
  const [postCategoryFilter, setPostCategoryFilter] = useState<
    'Semua' | CommunityPostCategory
  >('Semua');
  const [postSearch, setPostSearch] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [postCategory, setPostCategory] =
    useState<CommunityPostCategory>('Tanya Standar');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postFeedback, setPostFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyErrorByPost, setReplyErrorByPost] = useState<
    Record<string, string>
  >({});

  // Section 3: Interactive Education & Self-Check Readiness Calculator
  const [selectedTopicId, setSelectedTopicId] = useState(
    EDUCATION_TOPICS[0].id
  );
  const [studiedTopicIds, setStudiedTopicIds] = useState<string[]>(['EDU-01']);
  const [checkBottleSize, setCheckBottleSize] = useState<
    '600' | '1000' | '1500'
  >('600');
  const [checkWeightGrams, setCheckWeightGrams] = useState('265');
  const [checkCleanDry, setCheckCleanDry] = useState(true);
  const [checkDense, setCheckDense] = useState(true);
  const [checkCapTight, setCheckCapTight] = useState(true);

  // Section 4: Collaborations proposal
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [collabPartnerName, setCollabPartnerName] = useState(
    isMitraRole(state.activeRole) ? activeActor?.name ?? '' : ''
  );
  const [collabType, setCollabType] = useState(
    'Pemanfaatan Ecobrick Terverifikasi'
  );
  const [collabActivity, setCollabActivity] = useState('');
  const [collabFeedback, setCollabFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const posts = state.community_posts ?? [];
  const activeAgendaCount = state.community_activities.filter(
    (a) => a.status !== 'Selesai'
  ).length;
  const myJoinedCount = state.community_activities.filter((a) =>
    (a.registeredParticipantIds ?? []).includes(activeActorId)
  ).length;
  const openPostsCount = posts.filter((p) => p.status === 'Terbuka').length;
  const activeCollabCount = state.collaborations.filter(
    (c) => c.status === 'Aktif'
  ).length;

  const filteredActivities = state.community_activities.filter((act) => {
    const matchStatus =
      activityStatusFilter === 'Semua' || act.status === activityStatusFilter;
    const q = activitySearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      act.title.toLowerCase().includes(q) ||
      act.location.toLowerCase().includes(q) ||
      act.category.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const filteredPosts = posts.filter((post) => {
    const matchStatus =
      postStatusFilter === 'Semua' || post.status === postStatusFilter;
    const matchCategory =
      postCategoryFilter === 'Semua' || post.category === postCategoryFilter;
    const q = postSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q);
    return matchStatus && matchCategory && matchQuery;
  });

  const selectedTopic =
    EDUCATION_TOPICS.find((t) => t.id === selectedTopicId) ??
    EDUCATION_TOPICS[0];

  const bottleSpec = BOTTLE_MIN_GRAMS[checkBottleSize];
  const parsedGrams = parseFloat(checkWeightGrams);
  const weightOk =
    !Number.isNaN(parsedGrams) && parsedGrams >= bottleSpec.minGrams;
  const readinessIssues: string[] = [];
  if (Number.isNaN(parsedGrams) || parsedGrams <= 0) {
    readinessIssues.push('Masukkan perkiraan atau hasil timbang dalam gram.');
  } else if (parsedGrams < bottleSpec.minGrams) {
    readinessIssues.push(
      `Berat kurang ${Math.ceil(bottleSpec.minGrams - parsedGrams)} gram dari standar minimum ${bottleSpec.minGrams} g untuk ${bottleSpec.label}.`
    );
  }
  if (!checkCleanDry) {
    readinessIssues.push(
      'Isi plastik wajib bersih dari sisa makanan/minyak dan kering total.'
    );
  }
  if (!checkDense) {
    readinessIssues.push(
      'Padatkan isi botol secara merata hingga tidak kempes saat ditekan.'
    );
  }
  if (!checkCapTight) {
    readinessIssues.push('Pastikan botol PET utuh dan tutup terpasang rapat.');
  }
  const isEcobrickReady =
    weightOk && checkCleanDry && checkDense && checkCapTight;
  const readinessPassedCount =
    (weightOk ? 1 : 0) +
    (checkCleanDry ? 1 : 0) +
    (checkDense ? 1 : 0) +
    (checkCapTight ? 1 : 0);
  const readinessPct = Math.round((readinessPassedCount / 4) * 100);
  const readinessBarColor =
    readinessPassedCount === 4
      ? 'bg-[#1B5E43]'
      : readinessPassedCount === 3
        ? 'bg-[#2B5E6B]'
        : 'bg-[#B46B1E]';

  const vulnerableParticipants = state.contributors.filter(
    (c) => c.segment === 'Keluarga Rentan'
  );

  const handleToggleJoin = (activityId: string, title: string) => {
    const res = onToggleJoinActivity(activityId);
    if (res.error) {
      setActivityFeedback({ type: 'error', text: res.error });
      return;
    }
    setActivityFeedback({
      type: 'success',
      text: res.joined
        ? `Pendaftaran Anda pada "${title}" berhasil dicatat.`
        : `Pendaftaran Anda pada "${title}" telah dibatalkan.`,
    });
  };

  const handleCreateActivitySubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onCreateActivity({
      title: newActTitle,
      category: newActCategory,
      date: newActDate,
      location: newActLocation,
      participantSummary: newActSummary,
      inclusiveParticipationNote: newActNote,
    });
    if (res.error) {
      setActivityFeedback({ type: 'error', text: res.error });
      return;
    }
    setActivityFeedback({
      type: 'success',
      text: `Agenda baru "${newActTitle.trim()}" berhasil diterbitkan di Community Hub.`,
    });
    setNewActTitle('');
    setNewActLocation('');
    setNewActSummary('');
    setNewActNote('');
    setShowCreateActivity(false);
  };

  const handleCreatePostSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPostFeedback(null);
    const res = onCreatePost({
      category: postCategory,
      title: postTitle,
      body: postBody,
    });
    if (res.error) {
      setPostFeedback({ type: 'error', text: res.error });
      return;
    }
    setPostFeedback({
      type: 'success',
      text: `Topik diskusi "${postTitle.trim()}" berhasil diterbitkan ke forum Community Hub.`,
    });
    setPostTitle('');
    setPostBody('');
    setShowNewPostForm(false);
  };

  const handleReplySubmit = (e: FormEvent, postId: string) => {
    e.preventDefault();
    const draft = replyDrafts[postId] ?? '';
    const res = onReplyPost(postId, draft);
    if (res.error) {
      setReplyErrorByPost((prev) => ({ ...prev, [postId]: res.error! }));
      return;
    }
    setReplyErrorByPost((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleCreateCollaborationSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCollabFeedback(null);
    const res = onCreateCollaboration({
      partnerName: collabPartnerName,
      collaborationType: collabType,
      activity: collabActivity,
    });
    if (res.error) {
      setCollabFeedback({ type: 'error', text: res.error });
      return;
    }
    setCollabFeedback({
      type: 'success',
      text: `Usulan kolaborasi "${collabPartnerName.trim()}" tercatat dengan status Dalam Koordinasi.`,
    });
    setCollabActivity('');
    setShowCollabForm(false);
  };

  const toggleStudiedTopic = (topicId: string) => {
    setStudiedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const activityColumns: DataTableColumn<CommunityActivity>[] = [
    {
      key: 'title',
      header: 'Kegiatan',
      sortValue: (act) => act.title,
      render: (act) => (
        <div className="max-w-[210px] text-xs">
          <p className="font-semibold leading-snug text-[#1B231F]">
            {act.title}
          </p>
          <p className="text-[11px] font-medium text-[#2B5E6B]">
            {act.category}
          </p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Jadwal & Lokasi',
      sortValue: (act) => act.date,
      render: (act) => (
        <div className="max-w-[175px] space-y-0.5 text-xs">
          <p className="font-mono text-[11px] font-medium text-[#1B231F] tabular-nums whitespace-nowrap">
            {act.date}
          </p>
          <p className="leading-snug text-[11px] text-[#58655E]">
            {act.location}
          </p>
        </div>
      ),
    },
    {
      key: 'participants',
      header: 'Peserta & Inklusivitas',
      render: (act) => {
        const regIds = act.registeredParticipantIds ?? [];
        const registeredNames = regIds
          .map((id) => state.contributors.find((c) => c.id === id)?.name)
          .filter(Boolean);
        return (
          <div className="max-w-[240px] space-y-0.5 text-xs">
            <p className="leading-snug text-[#1B231F]">
              {act.participantSummary}
            </p>
            <p className="leading-snug text-[11px] text-[#58655E]">
              {act.inclusiveParticipationNote}
            </p>
            {registeredNames.length > 0 && (
              <p className="text-[11px] font-medium text-[#1B5E43]">
                Terdaftar ({registeredNames.length}):{' '}
                {registeredNames.slice(0, 2).join(', ')}
                {registeredNames.length > 2
                  ? ` +${registeredNames.length - 2} lainnya`
                  : ''}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'count',
      header: 'Jumlah',
      align: 'right',
      sortValue: (act) => act.participantCount,
      render: (act) => (
        <span className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
          {act.participantCount} orang
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (act) => act.status,
      render: (act) => <StatusTag status={act.status} />,
    },
    {
      key: 'action',
      header: 'Aksi',
      align: 'right',
      render: (act) => {
        const regIds = act.registeredParticipantIds ?? [];
        const isJoined = regIds.includes(activeActorId);
        return (
          <div className="inline-flex flex-col items-end gap-1.5">
            {act.status !== 'Selesai' && (
              <button
                type="button"
                onClick={() => handleToggleJoin(act.id, act.title)}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 whitespace-nowrap ${
                  isJoined
                    ? 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43] hover:bg-[#E3EFE9]'
                    : 'border-[#C5CEC9] bg-white text-[#1B231F] hover:border-[#1B5E43] hover:text-[#1B5E43]'
                }`}
              >
                {isJoined && (
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{isJoined ? 'Terdaftar · Batal' : 'Ikut Kegiatan'}</span>
              </button>
            )}
            {isHubCoordinator && act.status === 'Terjadwal' && (
              <SecondaryButton
                size="sm"
                onClick={() => onUpdateActivityStatus(act.id, 'Berlangsung')}
              >
                Mulai
              </SecondaryButton>
            )}
            {isHubCoordinator && act.status === 'Berlangsung' && (
              <SecondaryButton
                size="sm"
                onClick={() => onUpdateActivityStatus(act.id, 'Selesai')}
              >
                Tandai Selesai
              </SecondaryButton>
            )}
            {!isHubCoordinator && act.status === 'Selesai' && (
              <span className="text-[11px] text-[#58655E]">Selesai</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Community Hub"
          description="Pusat koordinasi operasional Pesantren Al-Amanah: pendaftaran agenda komunitas, forum tanya-jawab lintas peran, uji kelayakan standar ecobrick, dan pengelolaan kemitraan."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <RoleTag role={state.activeRole} />
            </div>
          }
          footer={
            <p className="text-xs text-[#58655E]">
              Partisipasi ekosistem:{' '}
              <span className="text-[#1B231F]">
                Kontributor (Santri · Warga ·{' '}
                <strong className="font-medium text-[#1B5E43]">
                  Keluarga Rentan
                </strong>
                )
              </span>{' '}
              · <span className="text-[#1B231F]">Admin</span> ·{' '}
              <span className="text-[#1B231F]">Mitra</span>
            </p>
          }
        />
      )}

      <MetricStrip
        columns={4}
        items={[
          {
            label: 'Agenda Aktif / Terjadwal',
            value: `${activeAgendaCount} agenda`,
            hint: `${state.community_activities.length} total kegiatan tercatat`,
            accent: 'primary',
          },
          {
            label: 'Partisipasi Anda',
            value: `${myJoinedCount} kegiatan`,
            hint: `Akun aktif: ${activeActor?.name ?? state.activeRole}`,
            accent: 'teal',
          },
          {
            label: 'Forum Koordinasi Warga',
            value: `${openPostsCount} terbuka`,
            hint: `${posts.length - openPostsCount} topik sudah terjawab`,
            accent: openPostsCount > 0 ? 'amber' : 'default',
          },
          {
            label: 'Kolaborasi Mitra Aktif',
            value: `${activeCollabCount} mitra`,
            hint: `${state.collaborations.length} total kemitraan`,
          },
        ]}
      />

      {/* 1. Activities & Training Schedule */}
      <section className="space-y-4">
        <SectionHeader
          title="1. Kegiatan & Jadwal Komunitas"
          description="Daftar kegiatan edukasi, pelatihan verifikasi, dan workshop perakitan bersama. Pendaftaran tersimpan sesuai akun dan peran Anda."
          rightSlot={
            isHubCoordinator ? (
              <PrimaryButton
                size="sm"
                onClick={() => setShowCreateActivity((prev) => !prev)}
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {showCreateActivity ? 'Tutup Form Agenda' : 'Buat Agenda Baru'}
                </span>
              </PrimaryButton>
            ) : undefined
          }
        />

        {activityFeedback && (
          <div
            role={activityFeedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-md border px-3.5 py-2.5 text-xs font-medium ${
              activityFeedback.type === 'error'
                ? 'border-[#E8C5C5] bg-[#FDF3F3] text-[#A62626]'
                : 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
            }`}
          >
            {activityFeedback.text}
          </div>
        )}

        {isHubCoordinator && showCreateActivity && (
          <form
            onSubmit={handleCreateActivitySubmit}
            className="space-y-4 rounded-lg border border-[#C5D9CD] bg-white p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#EAEFEA] pb-3">
              <div>
                <h3 className="text-[13px] font-semibold text-[#1B5E43]">
                  Jadwalkan Agenda Community Hub Baru
                </h3>
                <p className="text-xs text-[#58655E]">
                  Agenda baru langsung muncul di jadwal komunitas dan ringkasan
                  dashboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormField id="new-act-title" label="Judul Kegiatan">
                <input
                  id="new-act-title"
                  type="text"
                  required
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  placeholder="Contoh: Klinik Uji Kepadatan RT 02"
                  className={fieldInputClass}
                />
              </FormField>

              <FormField id="new-act-category" label="Kategori Kegiatan">
                <select
                  id="new-act-category"
                  value={newActCategory}
                  onChange={(e) =>
                    setNewActCategory(
                      e.target.value as CommunityActivity['category']
                    )
                  }
                  className={fieldInputClass}
                >
                  {ACTIVITY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="new-act-date" label="Tanggal Pelaksanaan">
                <input
                  id="new-act-date"
                  type="date"
                  required
                  value={newActDate}
                  onChange={(e) => setNewActDate(e.target.value)}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField id="new-act-location" label="Lokasi Pelaksanaan">
                <input
                  id="new-act-location"
                  type="text"
                  required
                  value={newActLocation}
                  onChange={(e) => setNewActLocation(e.target.value)}
                  placeholder="Contoh: Pos Eco-Hub Utama Pesantren"
                  className={fieldInputClass}
                />
              </FormField>

              <FormField
                id="new-act-summary"
                label="Sasaran Peserta (Opsional)"
              >
                <input
                  id="new-act-summary"
                  type="text"
                  value={newActSummary}
                  onChange={(e) => setNewActSummary(e.target.value)}
                  placeholder="Penyerah Ecobrick, Petugas, & Mitra"
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField
              id="new-act-note"
              label="Catatan Inklusivitas & Perlengkapan (Opsional)"
            >
              <input
                id="new-act-note"
                type="text"
                value={newActNote}
                onChange={(e) => setNewActNote(e.target.value)}
                placeholder="Contoh: Disiapkan timbangan digital dan alat pemadat untuk peserta baru."
                className={fieldInputClass}
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <SecondaryButton
                size="sm"
                onClick={() => setShowCreateActivity(false)}
              >
                Batal
              </SecondaryButton>
              <PrimaryButton type="submit" size="sm">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Terbitkan Agenda</span>
              </PrimaryButton>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9E0DC] bg-white px-4 py-3">
          <FilterBar
            ariaLabel="Filter status kegiatan"
            value={activityStatusFilter}
            onChange={setActivityStatusFilter}
            options={[
              {
                value: 'Semua',
                label: 'Semua',
                count: state.community_activities.length,
              },
              {
                value: 'Terjadwal',
                label: 'Terjadwal',
                count: state.community_activities.filter(
                  (a) => a.status === 'Terjadwal'
                ).length,
              },
              {
                value: 'Berlangsung',
                label: 'Berlangsung',
                count: state.community_activities.filter(
                  (a) => a.status === 'Berlangsung'
                ).length,
              },
              {
                value: 'Selesai',
                label: 'Selesai',
                count: state.community_activities.filter(
                  (a) => a.status === 'Selesai'
                ).length,
              },
            ]}
          />

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#58655E]"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Cari kegiatan atau lokasi"
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              placeholder="Cari kegiatan atau lokasi..."
              className="w-full rounded-md border border-[#C5CEC9] bg-[#F8FAF9] py-1.5 pr-3 pl-8 text-xs text-[#1B231F] placeholder:text-[#78857E] focus:border-[#1B5E43] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <DataTable
          columns={activityColumns}
          rows={filteredActivities}
          rowKey={(act) => act.id}
          emptyMessage="Tidak ada agenda komunitas yang cocok dengan filter pencarian."
        />
      </section>

      {/* 2. Forum Koordinasi & Tanya-Jawab Komunitas */}
      <section className="space-y-4">
        <SectionHeader
          title="2. Forum Koordinasi & Tanya-Jawab Komunitas"
          description="Saluran komunikasi langsung antara Penyerah Ecobrick, Petugas Eco-Hub, dan Mitra Pemanfaat terkait standar botol, jadwal pos, maupun kebutuhan proyek."
          rightSlot={
            <PrimaryButton
              size="sm"
              onClick={() => setShowNewPostForm((prev) => !prev)}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {showNewPostForm ? 'Tutup Form Topik' : 'Tulis Topik / Tanya'}
              </span>
            </PrimaryButton>
          }
        />

        {postFeedback && (
          <div
            role={postFeedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-md border px-3.5 py-2.5 text-xs font-medium ${
              postFeedback.type === 'error'
                ? 'border-[#E8C5C5] bg-[#FDF3F3] text-[#A62626]'
                : 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
            }`}
          >
            {postFeedback.text}
          </div>
        )}

        {showNewPostForm && (
          <form
            onSubmit={handleCreatePostSubmit}
            className="space-y-4 rounded-lg border border-[#C5D9CD] bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEFEA] pb-3">
              <div>
                <h3 className="text-[13px] font-semibold text-[#1B5E43]">
                  Buat Topik Diskusi / Koordinasi Baru
                </h3>
                <p className="text-xs text-[#58655E]">
                  Dikirim atas nama {activeActor?.name ?? state.activeRole} (
                  {state.activeRole}).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField id="forum-post-category" label="Kategori Topik">
                <select
                  id="forum-post-category"
                  value={postCategory}
                  onChange={(e) =>
                    setPostCategory(e.target.value as CommunityPostCategory)
                  }
                  className={fieldInputClass}
                >
                  {POST_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="forum-post-title"
                label="Judul Pertanyaan / Koordinasi"
                className="md:col-span-2"
              >
                <input
                  id="forum-post-title"
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Contoh: Jadwal penyerahan ecobrick 600 ml untuk Asrama Al-Farabi"
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField id="forum-post-body" label="Detail Pesan">
              <textarea
                id="forum-post-body"
                rows={3}
                required
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                placeholder="Tuliskan pertanyaan teknis, kebutuhan bahan, atau rencana koordinasi serah terima..."
                className={fieldInputClass}
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <SecondaryButton
                size="sm"
                onClick={() => setShowNewPostForm(false)}
              >
                Batal
              </SecondaryButton>
              <PrimaryButton type="submit" size="sm">
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kirim ke Forum</span>
              </PrimaryButton>
            </div>
          </form>
        )}

        {/* Forum Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9E0DC] bg-white px-4 py-3">
          <FilterBar
            ariaLabel="Filter status topik forum"
            value={postStatusFilter}
            onChange={setPostStatusFilter}
            options={[
              { value: 'Semua', label: 'Semua', count: posts.length },
              {
                value: 'Terbuka',
                label: 'Terbuka',
                count: posts.filter((p) => p.status === 'Terbuka').length,
              },
              {
                value: 'Terjawab',
                label: 'Terjawab',
                count: posts.filter((p) => p.status === 'Terjawab').length,
              },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#58655E]"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari topik forum"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="Cari topik atau penulis..."
                className="w-full rounded-md border border-[#C5CEC9] bg-[#F8FAF9] py-1 pr-2.5 pl-8 text-xs text-[#1B231F] placeholder:text-[#78857E] transition-colors focus:border-[#1B5E43] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="forum-filter-category"
                className="text-xs text-[#58655E] whitespace-nowrap"
              >
                Kategori:
              </label>
              <select
                id="forum-filter-category"
                value={postCategoryFilter}
                onChange={(e) =>
                  setPostCategoryFilter(
                    e.target.value as 'Semua' | CommunityPostCategory
                  )
                }
                className="rounded-md border border-[#C5CEC9] bg-white px-2.5 py-1 text-xs text-[#1B231F] focus:border-[#1B5E43] focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                {POST_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
          {filteredPosts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#58655E]">
              Belum ada topik diskusi untuk filter ini. Klik{' '}
              <strong>Tulis Topik / Tanya</strong> untuk memulai koordinasi.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const canToggleStatus =
                isHubCoordinator || post.authorId === activeActorId;
              const replyErr = replyErrorByPost[post.id];

              return (
                <article key={post.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#58655E]">
                        <span className="font-mono font-semibold text-[#1B5E43]">
                          {post.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#2B5E6B]">
                          {post.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{post.authorName}</span>
                        <RoleTag role={post.authorRole} />
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {post.timestamp}
                        </span>
                      </div>
                      <h3 className="text-[14px] font-semibold text-[#141B17]">
                        {post.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusTag status={post.status} />
                      {canToggleStatus && (
                        <button
                          type="button"
                          onClick={() => onTogglePostStatus(post.id)}
                          className="rounded-md border border-[#C5CEC9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1B231F] transition-colors hover:bg-[#F8FAF9] whitespace-nowrap"
                        >
                          {post.status === 'Terbuka'
                            ? 'Tandai Terjawab'
                            : 'Buka Kembali'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-[#1B231F]">
                    {post.body}
                  </p>

                  {post.replies.length > 0 && (
                    <div className="space-y-2 divide-y divide-[#EAEFEA] border-t border-[#EAEFEA] pt-3">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1 pt-2 first:pt-0">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#58655E]">
                            <span className="font-semibold text-[#1B231F]">
                              {reply.authorName}
                            </span>
                            <RoleTag role={reply.authorRole} />
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {reply.timestamp}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#1B231F]">
                            {reply.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => handleReplySubmit(e, post.id)}
                    className="space-y-1.5 pt-1"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        aria-label={`Balas topik ${post.title}`}
                        value={replyDrafts[post.id] ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          isHubCoordinator
                            ? 'Tulis jawaban resmi Koordinator Hub (otomatis menandai Terjawab)...'
                            : 'Tulis tanggapan atau informasi tambahan...'
                        }
                        className="flex-1 rounded-md border border-[#C5CEC9] bg-[#F8FAF9] px-3 py-1.5 text-xs text-[#1B231F] placeholder:text-[#78857E] focus:border-[#1B5E43] focus:bg-white focus:outline-none"
                      />
                      <SecondaryButton type="submit" size="sm">
                        <Send className="h-3 w-3" aria-hidden="true" />
                        <span>Kirim Balasan</span>
                      </SecondaryButton>
                    </div>
                    {replyErr && (
                      <p className="text-[11px] font-medium text-[#A62626]">
                        {replyErr}
                      </p>
                    )}
                  </form>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Interactive Education Guide + Pre-Submission Ecobrick Readiness Check */}
      <section className="space-y-4">
        <SectionHeader
          title="3. Panduan Standar & Uji Kelayakan Mandiri Ecobrick"
          description="Pelajari standar pembuatan ecobrick dan lakukan simulasi pemeriksaan kelayakan sebelum menyerahkan ke Pos Eco-Hub."
          rightSlot={
            <span className="font-mono text-xs font-medium text-[#1B5E43] tabular-nums">
              Materi dipahami: {studiedTopicIds.length} /{' '}
              {EDUCATION_TOPICS.length}
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Interactive Topic Explorer */}
          <div className="overflow-hidden rounded-lg border border-[#D9E0DC] bg-white lg:col-span-7">
            <div className="grid grid-cols-2 border-b border-[#D9E0DC] bg-[#F8FAF9] sm:grid-cols-4">
              {EDUCATION_TOPICS.map((topic) => {
                const isSelected = topic.id === selectedTopic.id;
                const isStudied = studiedTopicIds.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`flex items-center justify-between gap-1.5 border-b-2 px-3 py-2.5 text-left text-xs font-medium transition-colors duration-150 ${
                      isSelected
                        ? 'border-[#1B5E43] bg-[#EFF5F2] text-[#1B5E43]'
                        : 'border-transparent text-[#58655E] hover:bg-white hover:text-[#1B231F]'
                    }`}
                  >
                    <span className="whitespace-nowrap">
                      {topic.index}. {topic.shortTitle}
                    </span>
                    {isStudied && (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-[#1B5E43]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[11px] font-medium text-[#2B5E6B]">
                    Materi {selectedTopic.index}
                  </span>
                  <h3 className="font-display text-base font-semibold text-[#141B17]">
                    {selectedTopic.title}
                  </h3>
                </div>
                <SecondaryButton
                  size="sm"
                  onClick={() => toggleStudiedTopic(selectedTopic.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {studiedTopicIds.includes(selectedTopic.id)
                      ? 'Sudah Dipahami'
                      : 'Tandai Dipahami'}
                  </span>
                </SecondaryButton>
              </div>

              <p className="text-xs leading-relaxed text-[#58655E]">
                {selectedTopic.summary}
              </p>

              <div className="grid grid-cols-1 gap-4 border-t border-[#EAEFEA] pt-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#1B5E43]">
                    Ketentuan yang Diterima
                  </p>
                  <ul className="list-disc space-y-1.5 pl-4 text-xs text-[#1B231F]">
                    {selectedTopic.acceptedItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#A62626]">
                    Yang Menyebabkan Penolakan
                  </p>
                  <ul className="list-disc space-y-1.5 pl-4 text-xs text-[#58655E]">
                    {selectedTopic.rejectedItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="rounded-md border border-[#C4D8DD] bg-[#F1F6F7] px-3 py-2 text-[11px] font-medium text-[#2B5E6B]">
                Catatan praktis: {selectedTopic.targetAction}
              </p>
            </div>
          </div>

          {/* Pre-Submission Ecobrick Readiness Checker */}
          <div className="space-y-4 rounded-lg border border-[#D9E0DC] bg-white p-5 lg:col-span-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-[#141B17]">
                  Uji Kelayakan Mandiri Sebelum Ke Pos
                </h3>
                <p className="mt-0.5 text-xs text-[#58655E]">
                  Periksa berat dan kondisi fisik ecobrick Anda agar lolos
                  verifikasi pada percobaan pertama.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-[#1B5E43] tabular-nums whitespace-nowrap">
                {readinessPassedCount}/4
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ECF0ED]">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${readinessBarColor}`}
                style={{ width: `${readinessPct}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField id="selfcheck-size" label="Ukuran Botol PET">
                <select
                  id="selfcheck-size"
                  value={checkBottleSize}
                  onChange={(e) =>
                    setCheckBottleSize(
                      e.target.value as '600' | '1000' | '1500'
                    )
                  }
                  className={fieldInputClass}
                >
                  <option value="600">600 ml (Min. 250 g)</option>
                  <option value="1000">1000 ml (Min. 400 g)</option>
                  <option value="1500">1500 ml (Min. 500 g)</option>
                </select>
              </FormField>

              <FormField
                id="selfcheck-weight"
                label="Berat per Unit (gram)"
                hint={`Target ideal: ~${bottleSpec.idealGrams} g`}
              >
                <input
                  id="selfcheck-weight"
                  type="number"
                  min={50}
                  step={5}
                  value={checkWeightGrams}
                  onChange={(e) => setCheckWeightGrams(e.target.value)}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="space-y-2 border-t border-[#EAEFEA] pt-3">
              <label className="flex cursor-pointer items-start gap-2 text-xs text-[#1B231F]">
                <input
                  type="checkbox"
                  checked={checkCleanDry}
                  onChange={(e) => setCheckCleanDry(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1B5E43]"
                />
                <span>Isi plastik bersih dari minyak dan kering total</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-[#1B231F]">
                <input
                  type="checkbox"
                  checked={checkDense}
                  onChange={(e) => setCheckDense(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1B5E43]"
                />
                <span>Kompaksi padat merata (tidak kempes saat ditekan)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-[#1B231F]">
                <input
                  type="checkbox"
                  checked={checkCapTight}
                  onChange={(e) => setCheckCapTight(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1B5E43]"
                />
                <span>Botol utuh dan tutup botol terpasang rapat</span>
              </label>
            </div>

            <div
              role="status"
              className={`space-y-1.5 rounded-md border p-3.5 text-xs ${
                isEcobrickReady
                  ? 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
                  : 'border-[#E6D2B5] bg-[#FBF6EE] text-[#A15C17]'
              }`}
            >
              <p className="font-semibold">
                {isEcobrickReady
                  ? `Siap Diserahkan (${bottleSpec.label} · ${parsedGrams} g)`
                  : 'Perlu Penyesuaian Sebelum Diserahkan'}
              </p>
              {isEcobrickReady ? (
                <p>
                  Ecobrick memenuhi standar minimum ({bottleSpec.minGrams} g)
                  dan siap dibawa ke Pos Eco-Hub untuk verifikasi Petugas.
                </p>
              ) : (
                <ul className="list-disc space-y-0.5 pl-4">
                  {readinessIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            {(isPenyerahRole(state.activeRole) || isHubCoordinator) && (
              <PrimaryButton
                size="sm"
                className="w-full"
                onClick={() => onNavigate('contribution')}
              >
                <span>Buka Form Penyerahan Ecobrick</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </PrimaryButton>
            )}
          </div>
        </div>
      </section>

      {/* 4. Inclusive Participation + Interactive Partner Collaborations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className="space-y-3 lg:col-span-5">
          <SectionHeader
            title="4. Partisipasi Aktif Keluarga Rentan"
            description="Jejak kontribusi terverifikasi, keikutsertaan kegiatan, dan dukungan program secara setara."
          />
          <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
            {vulnerableParticipants.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#58655E]">
                Belum ada akun segmen Keluarga Rentan yang terdaftar di
                database.
              </p>
            ) : (
              vulnerableParticipants.map((person) => {
                const verifiedUnits = state.ecobrick_submissions
                  .filter((s) => s.contributorId === person.id)
                  .reduce((sum, s) => sum + s.verifiedQuantity, 0);
                const joinedActivities = state.community_activities.filter(
                  (a) => (a.registeredParticipantIds ?? []).includes(person.id)
                ).length;
                const incentivesTotal = state.financial_incentives
                  .filter(
                    (f) =>
                      f.contributorId === person.id &&
                      (f.status === 'Paid' || f.status === 'Approved')
                  )
                  .reduce((sum, f) => sum + f.amountIdr, 0);

                return (
                  <div key={person.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[#1B231F]">
                        {person.name}
                      </span>
                      <RoleTag role={person.role} segment={person.segment} />
                    </div>
                    <p className="text-xs text-[#58655E]">
                      {person.unitOrAddress}
                    </p>
                    {person.participationRole && (
                      <p className="text-xs font-medium text-[#1B5E43]">
                        Peran ekosistem: {person.participationRole}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#EAEFEA] pt-2 font-mono text-[11px] text-[#58655E] tabular-nums">
                      <span>{verifiedUnits} unit verified</span>
                      <span aria-hidden="true">·</span>
                      <span>{joinedActivities} agenda diikuti</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Insentif Rp {incentivesTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-3 lg:col-span-7">
          <SectionHeader
            title="5. Kolaborasi Mitra"
            description="Mitra pemanfaat ecobrick, penyedia katalog reward, dan pendukung program Community Hub."
            rightSlot={
              canProposeCollab ? (
                <SecondaryButton
                  size="sm"
                  onClick={() => setShowCollabForm((prev) => !prev)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {showCollabForm ? 'Tutup Form' : 'Ajukan Kolaborasi'}
                  </span>
                </SecondaryButton>
              ) : undefined
            }
          />

          {collabFeedback && (
            <div
              role={collabFeedback.type === 'error' ? 'alert' : 'status'}
              className={`rounded-md border px-3.5 py-2.5 text-xs font-medium ${
                collabFeedback.type === 'error'
                  ? 'border-[#E8C5C5] bg-[#FDF3F3] text-[#A62626]'
                  : 'border-[#C5D9CD] bg-[#EFF5F2] text-[#1B5E43]'
              }`}
            >
              {collabFeedback.text}
            </div>
          )}

          {canProposeCollab && showCollabForm && (
            <form
              onSubmit={handleCreateCollaborationSubmit}
              className="space-y-3 rounded-lg border border-[#C5D9CD] bg-white p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField id="collab-partner-name" label="Nama Mitra / Lembaga">
                  <input
                    id="collab-partner-name"
                    type="text"
                    required
                    value={collabPartnerName}
                    onChange={(e) => setCollabPartnerName(e.target.value)}
                    placeholder="Contoh: Komunitas Taman Baca Krajan"
                    className={fieldInputClass}
                  />
                </FormField>

                <FormField id="collab-type" label="Jenis Kolaborasi">
                  <input
                    id="collab-type"
                    type="text"
                    required
                    value={collabType}
                    onChange={(e) => setCollabType(e.target.value)}
                    placeholder="Contoh: Workshop Perakitan Modul"
                    className={fieldInputClass}
                  />
                </FormField>
              </div>

              <FormField
                id="collab-activity"
                label="Rencana Kegiatan & Kebutuhan"
              >
                <textarea
                  id="collab-activity"
                  rows={2}
                  required
                  value={collabActivity}
                  onChange={(e) => setCollabActivity(e.target.value)}
                  placeholder="Jelaskan bentuk kolaborasi bersama pesantren dan kontributor..."
                  className={fieldInputClass}
                />
              </FormField>

              <div className="flex justify-end gap-2">
                <SecondaryButton
                  size="sm"
                  onClick={() => setShowCollabForm(false)}
                >
                  Batal
                </SecondaryButton>
                <PrimaryButton type="submit" size="sm">
                  Kirim Usulan Kolaborasi
                </PrimaryButton>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white">
            {state.collaborations.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#58655E]">
                Belum ada kolaborasi mitra tercatat.
              </p>
            ) : (
              state.collaborations.map((colb) => (
                <div key={colb.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[13px] font-semibold text-[#1B231F]">
                        {colb.partnerName}
                      </span>
                      <p className="text-xs font-medium text-[#2B5E6B]">
                        {colb.collaborationType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusTag status={colb.status} />
                      {isHubCoordinator &&
                        colb.status === 'Dalam Koordinasi' && (
                          <SecondaryButton
                            size="sm"
                            onClick={() =>
                              onUpdateCollaborationStatus(colb.id, 'Aktif')
                            }
                          >
                            Aktifkan
                          </SecondaryButton>
                        )}
                      {isHubCoordinator && colb.status === 'Aktif' && (
                        <SecondaryButton
                          size="sm"
                          onClick={() =>
                            onUpdateCollaborationStatus(colb.id, 'Selesai')
                          }
                        >
                          Selesaikan
                        </SecondaryButton>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#58655E]">{colb.activity}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
