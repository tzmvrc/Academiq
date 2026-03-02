import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { FeedTab } from "@/components/dashboard/FeedTab";
import { PeersTab } from "@/components/dashboard/PeersTab";
import { LeaderboardsTab } from "@/components/dashboard/LeaderboardsTab";
import { InterestTab } from "@/components/dashboard/InterestTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { NotificationModal } from "@/components/forum/NotificationModal";

const tabs: Record<string, React.ComponentType> = {
  profile: ProfileTab,
  feed: FeedTab,
  peers: PeersTab,
  leaderboards: LeaderboardsTab,
  interest: InterestTab,
  settings: SettingsTab,
};

const mockNotifications = [
  {
    id: "1",
    type: "upvote" as const,
    title: "Post Upvoted",
    message: 'Your post "Quantum Computing" received 10 new upvotes!',
    timestamp: "5 minutes ago",
  },
  {
    id: "2",
    type: "points" as const,
    title: "+50 Points",
    message: "You earned 50 points for your verified contribution.",
    timestamp: "1 hour ago",
  },
  {
    id: "3",
    type: "rank" as const,
    title: "Rank Update",
    message: "You moved up to #12 on the leaderboard!",
    timestamp: "2 hours ago",
  },
  {
    id: "4",
    type: "ai" as const,
    title: "AI Verified",
    message: 'Your comment on "CRISPR Guide" was verified by AI.',
    timestamp: "3 hours ago",
  },
];

export const Dashboard: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState("feed");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const ActiveComponent = tabs[activeTab] || FeedTab;

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
        notificationCount={mockNotifications.length}
      />
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <ActiveComponent />
        </div>
      </main>

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={mockNotifications}
      />
    </div>
  );
};
