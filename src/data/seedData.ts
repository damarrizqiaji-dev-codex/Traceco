import type {
  DropOffPoint,
  RewardCatalogItem,
  TracecoState,
} from '../types/traceco';

export const EMPTY_TRACECO_STATE: TracecoState = {
  currentUserId: null,
  activeRole: 'Kontributor',
  accounts: [],
  contributors: [],
  dropoff_points: [],
  ecobrick_submissions: [],
  verification_records: [],
  ecobrick_batches: [],
  green_points: [],
  rewards: [],
  redemptions: [],
  financial_incentives: [],
  distribution_requests: [],
  utilization_records: [],
  community_activities: [],
  collaborations: [],
  community_posts: [],
  notifications: [],
  recent_activities: [],
};

export const DEFAULT_PESANTREN_DROPOFF_POINTS: DropOffPoint[] = [
  {
    id: 'DP-01',
    name: 'Pos Eco-Hub Utama Pesantren',
    area: 'Halaman Timur Masjid Pesantren Al-Amanah',
    schedule: 'Senin, Rabu, Sabtu · 07.30–10.30 WIB',
    coordinator: 'Tim Verifikator Pesantren',
  },
  {
    id: 'DP-02',
    name: 'Titik Serah Asrama Putra & Putri',
    area: 'Koridor Tengah Kompleks Asrama',
    schedule: 'Selasa & Jumat · 15.30–17.00 WIB',
    coordinator: 'Koordinator Asrama',
  },
  {
    id: 'DP-03',
    name: 'Pos Komunitas RW 03 Dusun Krajan',
    area: 'Balai Warga RT 02 / RW 03',
    schedule: 'Kamis & Minggu · 08.00–11.00 WIB',
    coordinator: 'Relawan Pos Warga',
  },
];

export const DEFAULT_PESANTREN_REWARDS: RewardCatalogItem[] = [
  {
    id: 'REW-CAT-01',
    title: 'Tumbler Stainless & Tas Kain TRACECO',
    category: 'Merchandise Ramah Lingkungan',
    pointsCost: 160,
    description:
      'Merchandise harian untuk mengurangi ketergantungan kemasan plastik sekali pakai di asrama dan rumah.',
    stockNote: 'Tersedia di Koperasi Eco-Hub',
  },
  {
    id: 'REW-CAT-02',
    title: 'Paket Alat Tulis & Buku Catatan Daur Ulang',
    category: 'Perlengkapan Belajar',
    pointsCost: 200,
    description:
      'Perlengkapan belajar untuk santri dan anak-anak keluarga peserta program.',
    stockNote: 'Tersedia di Sekretariat Eco-Hub',
  },
  {
    id: 'REW-CAT-03',
    title: 'Voucher Pelatihan Kerajinan Modular Komunitas',
    category: 'Voucher Kegiatan',
    pointsCost: 120,
    description:
      'Akses sesi pendampingan perakitan modul kursi dan meja ecobrick bersama pengrajin lokal.',
    stockNote: 'Jadwal bulanan Community Hub',
  },
  {
    id: 'REW-CAT-04',
    title: 'Paket Kebutuhan Komunal Ramah Lingkungan',
    category: 'Benefit Komunitas',
    pointsCost: 100,
    description:
      'Dukungan kebutuhan harian guna ulang bagi warga dan keluarga rentan aktif.',
    stockNote: 'Tersedia di Pos Eco-Hub',
  },
  {
    id: 'REW-CAT-05',
    title: 'Apresiasi Kitab & Seragam Kegiatan Pesantren',
    category: 'Reward Program Pesantren',
    pointsCost: 300,
    description:
      'Dukungan perlengkapan pembinaan santri aktif dalam program lingkungan pesantren.',
    stockNote: 'Sekretariat Pesantren Al-Amanah',
  },
];
