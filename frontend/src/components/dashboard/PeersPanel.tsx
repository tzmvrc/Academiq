import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
const peers = ["Alex Kim", "Maya Patel", "Jules Dubois"];
export const PeersPanel = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {peers.map((name) => (
      <Card key={name} className="flex items-center gap-4">
        <Avatar size="sm" />
        <div>
          <p className="font-bold">{name}</p>
          <p className="text-sm">2nd Year • CS</p>
        </div>
      </Card>
    ))}
  </div>
);