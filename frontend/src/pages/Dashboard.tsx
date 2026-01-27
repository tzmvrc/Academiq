import { useState } from "react";
import { TabNav } from "../components/ui/TabNav";
import { ProfilePanel } from "../components/dashboard/ProfilePanel";
import { FeedPanel } from "../components/dashboard/FeedPanel";
import { PeersPanel } from "../components/dashboard/PeersPanel";
import { LeaderboardPanel } from "../components/dashboard/LeaderboardPanel";
import { InterestPanel } from "../components/dashboard/InterestPanel";

const tabs = [
  { id: "feed", label: "Feed" },
  { id: "profile", label: "Profile" },
  { id: "peers", label: "Peers" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "interests", label: "Interests" },
];

export function Dashboard() {
  const [active, setActive] = useState("feed");

  const renderActivePanel = () => {
    switch (active) {
      case "feed":
        return <FeedPanel />;
      case "profile":
        return <ProfilePanel />;
      case "peers":
        return <PeersPanel />;
      case "leaderboard":
        return <LeaderboardPanel />;
      case "interests":
        return <InterestPanel />;
      default:
        return null;
    }
  };

  return (
    <div>
      <TabNav tabs={tabs} active={active} onChange={setActive} />
      <div className="mt-8">{renderActivePanel()}</div>
    </div>
  );
}
