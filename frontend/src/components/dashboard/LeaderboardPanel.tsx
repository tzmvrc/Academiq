import { Card } from "../ui/Card";
const leaders = [
{ rank: 1, name: "Zoe Chen", points: 2340 },
{ rank: 2, name: "You", points: 1420 },
{ rank: 3, name: "Leo Smith", points: 1380 },
];
export const LeaderboardPanel = () => (
  <div className="flex flex-col gap-4">
    {leaders.map((u) => (
      <Card key={u.rank} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-black text-2xl">#{u.rank}</span>
          <span className="font-bold">{u.name}</span>
        </div>
        <span className="font-bold">{u.points} pts</span>
      </Card>
    ))}
  </div>
);