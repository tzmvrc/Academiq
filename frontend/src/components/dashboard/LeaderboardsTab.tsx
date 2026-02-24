import React, { useEffect } from "react";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import confetti from "canvas-confetti";

const mockLeaderboard = [
  {
    rank: 1,
    name: "Liu Wei",
    points: 5234,
    field: "Computer Science",
    trend: "up",
  },
  {
    rank: 2,
    name: "Sarah Kim",
    points: 4102,
    field: "Environmental Science",
    trend: "up",
  },
  {
    rank: 3,
    name: "Emma Thompson",
    points: 3678,
    field: "Physics",
    trend: "same",
  },
  {
    rank: 4,
    name: "Maria Santos",
    points: 3421,
    field: "Social Sciences",
    trend: "up",
  },
  {
    rank: 5,
    name: "James Wilson",
    points: 2890,
    field: "Biology",
    trend: "down",
  },
  {
    rank: 6,
    name: "Alex Chen",
    points: 2847,
    field: "Computer Science",
    trend: "up",
  },
  {
    rank: 7,
    name: "David Park",
    points: 2156,
    field: "Philosophy",
    trend: "same",
  },
  {
    rank: 8,
    name: "Anna Müller",
    points: 2034,
    field: "Chemistry",
    trend: "up",
  },
  {
    rank: 9,
    name: "Carlos Rodriguez",
    points: 1987,
    field: "Mathematics",
    trend: "down",
  },
  {
    rank: 10,
    name: "Yuki Tanaka",
    points: 1856,
    field: "Economics",
    trend: "up",
  },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-6 h-6 text-secondary-foreground" />;
    case 2:
      return <Medal className="w-6 h-6 text-muted-foreground" />;
    case 3:
      return <Award className="w-6 h-6 text-accent-foreground" />;
    default:
      return <span className="text-lg font-bold">#{rank}</span>;
  }
};

const getRankColor = (rank: number): "yellow" | "teal" | "pink" | "default" => {
  switch (rank) {
    case 1:
      return "yellow";
    case 2:
      return "teal";
    case 3:
      return "pink";
    default:
      return "default";
  }
};

export const LeaderboardsTab: React.FC = () => {
  useEffect(() => {
    // Fire confetti from both sides when tab opens
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: [
          "#FFE566",
          "#5ECFCF",
          "#FF9ECD",
          "#FF8E72",
          "#B39DDB",
          "#7CFFB2",
        ],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: [
          "#FFE566",
          "#5ECFCF",
          "#FF9ECD",
          "#FF8E72",
          "#B39DDB",
          "#7CFFB2",
        ],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboards</h1>
        <p className="text-muted-foreground mt-1">
          Top contributors in the Academiq community
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Second Place */}
        <BrutalCard color="teal" className="p-6 text-center md:mt-8">
          <Medal className="w-12 h-12 mx-auto mb-3" />
          <div className="text-4xl font-bold mb-1">2nd</div>
          <h3 className="font-bold text-lg">{mockLeaderboard[1].name}</h3>
          <p className="text-sm opacity-80">{mockLeaderboard[1].field}</p>
          <div className="text-2xl font-bold mt-3">
            {mockLeaderboard[1].points} pts
          </div>
        </BrutalCard>

        {/* First Place */}
        <BrutalCard color="yellow" className="p-6 text-center md:-mt-4">
          <Trophy className="w-16 h-16 mx-auto mb-3" />
          <div className="text-5xl font-bold mb-1">1st</div>
          <h3 className="font-bold text-xl">{mockLeaderboard[0].name}</h3>
          <p className="text-sm opacity-80">{mockLeaderboard[0].field}</p>
          <div className="text-3xl font-bold mt-3">
            {mockLeaderboard[0].points} pts
          </div>
        </BrutalCard>

        {/* Third Place */}
        <BrutalCard color="pink" className="p-6 text-center md:mt-12">
          <Award className="w-10 h-10 mx-auto mb-3" />
          <div className="text-3xl font-bold mb-1">3rd</div>
          <h3 className="font-bold text-lg">{mockLeaderboard[2].name}</h3>
          <p className="text-sm opacity-80">{mockLeaderboard[2].field}</p>
          <div className="text-2xl font-bold mt-3">
            {mockLeaderboard[2].points} pts
          </div>
        </BrutalCard>
      </div>

      {/* Full Leaderboard */}
      <BrutalCard className="overflow-hidden">
        <div className="p-4 border-b-[3px] border-foreground bg-muted">
          <h3 className="font-bold text-lg">All Rankings</h3>
        </div>
        <div className="divide-y-[2px] divide-foreground/20">
          {mockLeaderboard.map((user) => (
            <div
              key={user.rank}
              className={`flex items-center gap-4 p-4 ${user.rank <= 3 ? "bg-muted/50" : ""}`}
            >
              <div className="w-12 flex items-center justify-center">
                {getRankIcon(user.rank)}
              </div>
              <div className="w-12 h-12 bg-primary rounded-xl border-[2px] border-foreground shadow-brutal-sm flex items-center justify-center text-lg font-bold text-primary-foreground">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{user.name}</h4>
                <p className="text-sm text-muted-foreground">{user.field}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.trend === "up" && (
                  <TrendingUp className="w-4 h-4 text-mint" />
                )}
                <span className="text-xl font-bold">{user.points}</span>
                <span className="text-sm text-muted-foreground">pts</span>
              </div>
            </div>
          ))}
        </div>
      </BrutalCard>
    </div>
  );
};
