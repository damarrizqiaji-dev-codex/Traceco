import { useState } from 'react';
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

  const currentTab = activeSubTab === 'community' ? 'community' : 'feed';

  const filteredActivities = state.recent_activities.filter((act) =>
    categoryFilter === 'Semua' ? true : act.category === categoryFilter
  );

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              title="Linimasa Aktivitas"
              description="Ringkasan peristiwa terbaru di ekosistem TRACECO."
            />
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
          </div>

          <div className="divide-y divide-[#EEF2EF] rounded-md border border-[#E3E8E4] bg-white p-4 sm:p-5">
            {filteredActivities.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#6B756F]">
                Belum ada aktivitas pada kategori ini.
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
