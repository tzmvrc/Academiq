import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/integration/axiosInstance";
import { ForumCard } from "@/components/forum/ForumCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { SearchBar } from "@/components/forum/SearchBar";
import { CreatePostModal } from "@/components/forum/CreatePostModal";
import { Plus, Filter } from "lucide-react";

type ForumItem = {
  id: string;
  title: string;
  content: string;
  is_ai_verified: boolean;
  created_at: string;
  subjects?: { name: string };
  users?: { name: string; profile_url?: string };
  voteCount?: number;
  commentsCount?: number;
  
};

const getVoteColor = (votes: number) => {
  if (votes >= 200) return "pink";
  if (votes >= 150) return "yellow";
  if (votes >= 100) return "teal";
  if (votes >= 50) return "coral";
  return "mint";
};

export const FeedTab: React.FC = () => {
  const navigate = useNavigate();

  const [forums, setForums] = useState<ForumItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true);

        const res = await axiosInstance.get("/forums");
        setForums(res.data?.forums || []);
      } catch (err: any) {
        console.error("Fetch forums error:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForums();
  }, []);

  const filteredForums = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return forums.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q) ||
        f.subjects?.name?.toLowerCase().includes(q)
    );
  }, [forums, searchQuery]);

  const handlePostClick = (id: string) => {
    navigate(`/post/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forum Feed</h1>
          <p className="text-muted-foreground mt-1">
            Discover and engage with academic discussions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <BrutalButton
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </BrutalButton>

          <BrutalButton
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </BrutalButton>
        </div>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search discussions..."
      />

      {/* Forums */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-10 text-muted-foreground">
            Loading forums...
          </div>
        )}

        {!loading &&
          filteredForums.map((forum) => {
            const voteCount = forum.voteCount ?? 0;
            const commentsCount = forum.commentsCount ?? 0;

            return (
              <div
                key={forum.id}
                onClick={() => handlePostClick(forum.id)}
                className="cursor-pointer"
              >
                <ForumCard
                  title={forum.title}
                  subject={forum.subjects?.name || "Unknown"}
                  content={forum.content}
                  author={forum.users?.name || "Unknown"}
                  commentsCount={commentsCount}
                  voteCount={voteCount}
                  isAIVerified={forum.is_ai_verified}
                  voteColor={getVoteColor(voteCount)}
                  avatar={forum.users?.profile_url || undefined}
                />
              </div>
            );
          })}
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={() => {}}
      />
    </div>
  );
};