import { useState } from 'react';
import { Search } from 'lucide-react';
import type {
  ActivityFeedItem,
  AppPageId,
  CollaborationPartner,
  CommunityActivity,
  CommunityPostCategory,
  TracecoState,
} from '../types/traceco';
import { ActivityItem } from '../components/ui/ActivityItem';
import { FilterBar } from '../components/ui/FilterBar';
import { PageHeader, SectionHeader } from '../components/ui/PageHeader';
import { SubNavTabs } from '../components/ui/SubNavTabs';
import { CommunityHubPage } from './CommunityHubPage';

interface ActivitiesPageProps {
  state: TracecoState;
  activeSubTab: string;
  onChangeSubTab: (sub: string) => void;
  onNavigate: (page: AppPageId, sub?: string) => void;
  onOpenTraceDetail: (targetId: string) => void;
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

export function ActivitiesPage({
  state,
  activeSubTab,
  onChangeSubTab,
  onNavigate,
  onOpenTraceDetail,
  onToggleJoinActivity,
  onCreateActivity,
  onUpdateActivityStatus,
  onCreatePost,
  onReplyPost,
  onTogglePostStatus,
  onCreateCollaboration,
  onUpdateCollaborationStatus,
}: ActivitiesPageProps) {
  const [categoryFilter, setCategoryFilter] = useState<
    'Semua' | ActivityFeedItem['category']
  >('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const currentTab = activeSubTab === 'community' ? 'community' : 'feed';

  const filteredActivities = state.recent_activities.filter((act) => {
    const matchCategory =
      categoryFilter === 'Semua' ? true : act.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      act.title.toLowerCase().includes(q) ||
      act.detail.toLowerCase().includes(q) ||
      (act.submissionId ?? '').toLowerCase().includes(q) ||
      (act.batchId ?? '').toLowerCase().includes(q);
    return matchCategory && matchQuery;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivitas"
        description="Linimasa kronologis aktivitas kontribusi, verifikasi, reward, dan agenda komunitas Anda."
      />

      <SubNavTabs
        ariaLabel="Submenu Aktivitas"
        activeId={currentTab}
        onChange={onChangeSubTab}
        items={[
          {
            id: 'feed',
            label: 'Aktivitas Terbaru',
            badge: state.recent_activities.length,
          },
          {
            id: 'community',
            label: 'Komunitas & Edukasi',
            badge: state.community_activities.length,
          },
        ]}
      />

      {currentTab === 'feed' ? (
        <section className="space-y-4">
          <SectionHeader
            title="Linimasa Aktivitas"
            description="Ringkasan peristiwa terbaru di ekosistem TRACECO."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9E0DC] bg-white px-4 py-3">
            <FilterBar
              ariaLabel="Filter kategori aktivitas"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                {
                  value: 'Semua',
                  label: 'Semua',
                  count: state.recent_activities.length,
                },
                {
                  value: 'Kontribusi',
                  label: 'Kontribusi',
                  count: state.recent_activities.filter(
                    (a) => a.category === 'Kontribusi'
                  ).length,
                },
                {
                  value: 'Verifikasi',
                  label: 'Verifikasi',
                  count: state.recent_activities.filter(
                    (a) => a.category === 'Verifikasi'
                  ).length,
                },
                {
                  value: 'Reward',
                  label: 'Reward',
                  count: state.recent_activities.filter(
                    (a) => a.category === 'Reward'
                  ).length,
                },
                {
                  value: 'Komunitas',
                  label: 'Komunitas',
                  count: state.recent_activities.filter(
                    (a) => a.category === 'Komunitas'
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
                aria-label="Cari aktivitas atau ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari aktivitas atau ID..."
                className="w-full rounded-md border border-[#C5CEC9] bg-[#F8FAF9] py-1.5 pr-3 pl-8 text-xs text-[#1B231F] placeholder:text-[#78857E] transition-colors focus:border-[#1B5E43] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-[#EAEFEA] rounded-lg border border-[#D9E0DC] bg-white p-4 sm:px-5">
            {filteredActivities.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#58655E]">
                Tidak ada aktivitas yang cocok dengan filter atau pencarian.
              </p>
            ) : (
              filteredActivities.map((act) => (
                <ActivityItem
                  key={act.id}
                  item={act}
                  onInspectBatch={(id) => onOpenTraceDetail(id)}
                />
              ))
            )}
          </div>
        </section>
      ) : (
        <CommunityHubPage
          state={state}
          embedded
          onNavigate={(page) => onNavigate(page)}
          onToggleJoinActivity={onToggleJoinActivity}
          onCreateActivity={onCreateActivity}
          onUpdateActivityStatus={onUpdateActivityStatus}
          onCreatePost={onCreatePost}
          onReplyPost={onReplyPost}
          onTogglePostStatus={onTogglePostStatus}
          onCreateCollaboration={onCreateCollaboration}
          onUpdateCollaborationStatus={onUpdateCollaborationStatus}
        />
      )}
    </div>
  );
}
