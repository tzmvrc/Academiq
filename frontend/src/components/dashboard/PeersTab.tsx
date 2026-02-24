import React from "react";
import { useNavigate } from "react-router-dom";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalTag } from "@/components/ui/BrutalTag";
import { BrutalInput } from "@/components/ui/BrutalInput";
import { UserPlus, MessageCircle, Search } from "lucide-react";

const mockPeers = [
  {
    id: "user2",
    name: "Maria Santos",
    field: "Social Sciences",
    institution: "Stanford University",
    points: 3421,
    interests: ["Research Methods", "Psychology"],
    isConnected: true,
  },
  {
    id: "user3",
    name: "James Wilson",
    field: "Biology",
    institution: "MIT",
    points: 2890,
    interests: ["CRISPR", "Gene Therapy"],
    isConnected: false,
  },
  {
    id: "user4",
    name: "Sarah Kim",
    field: "Environmental Science",
    institution: "UC Berkeley",
    points: 4102,
    interests: ["Climate Modeling", "Machine Learning"],
    isConnected: true,
  },
  {
    id: "user5",
    name: "David Park",
    field: "Philosophy",
    institution: "Oxford University",
    points: 2156,
    interests: ["Consciousness", "Ethics"],
    isConnected: false,
  },
  {
    id: "user6",
    name: "Emma Thompson",
    field: "Physics",
    institution: "Caltech",
    points: 3678,
    interests: ["Quantum Mechanics", "Particle Physics"],
    isConnected: false,
  },
  {
    id: "user7",
    name: "Liu Wei",
    field: "Computer Science",
    institution: "Carnegie Mellon",
    points: 5234,
    interests: ["NLP", "Deep Learning"],
    isConnected: true,
  },
];

export const PeersTab: React.FC = () => {
  const navigate = useNavigate();

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Peers</h1>
          <p className="text-muted-foreground mt-1">
            Connect with fellow researchers and students
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <BrutalInput
          placeholder="Search peers by name, field, or interest..."
          className="pl-12"
        />
      </div>

      {/* Peers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockPeers.map((peer) => (
          <BrutalCard key={peer.id} className="p-5">
            <div
              className="flex items-start gap-4 cursor-pointer"
              onClick={() => handleViewProfile(peer.id)}
            >
              <div className="w-14 h-14 bg-primary rounded-xl border-[2px] border-foreground shadow-brutal-sm flex items-center justify-center text-xl font-bold text-primary-foreground flex-shrink-0">
                {peer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{peer.name}</h3>
                <p className="text-sm text-muted-foreground">{peer.field}</p>
                <p className="text-xs text-muted-foreground">
                  {peer.institution}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {peer.interests.map((interest) => (
                <BrutalTag key={interest} color="teal" className="text-xs">
                  {interest}
                </BrutalTag>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t-[2px] border-foreground/20">
              <span className="text-sm font-bold">{peer.points} pts</span>
              <div className="flex gap-2">
                {peer.isConnected ? (
                  <BrutalButton variant="teal" size="sm">
                    <MessageCircle className="w-4 h-4" />
                  </BrutalButton>
                ) : (
                  <BrutalButton variant="primary" size="sm">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Connect
                  </BrutalButton>
                )}
              </div>
            </div>
          </BrutalCard>
        ))}
      </div>
    </div>
  );
};
