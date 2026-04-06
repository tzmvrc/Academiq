import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/integration/axiosInstance";
import { ForumCard } from "@/components/forum/ForumCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { SearchBar } from "@/components/forum/SearchBar";
import { CreatePostModal } from "@/components/forum/CreatePostModal";
import { toast } from "@/components/ui/use-toast";
import { Plus, Filter } from "lucide-react";

type ForumItem = {
  id: string;
  title: string;
  content: string;
  is_ai_verified: boolean;
  created_at: string;
  subjects?: { name: string };
  users?: { name: string; profile_url?: string };

  // ✅ from DB
  vote_count?: number;
  comments_count?: number;

  document_url?: string | null;
};

// Vote color helper - kept for potential future use
// const getVoteColor = (votes: number) => {
//   if (votes >= 200) return "pink";
//   if (votes >= 150) return "yellow";
//   if (votes >= 100) return "teal";
//   if (votes >= 50) return "coral";
//   return "mint";
// };

export const FeedTab: React.FC = () => {
  const navigate = useNavigate();

  const [forums, setForums] = useState<ForumItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedForums, setSavedForums] = useState<Set<string>>(new Set());
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Load from localStorage cache first for quick UX
        const cachedSavedForums = localStorage.getItem("savedForums");
        if (cachedSavedForums) {
          try {
            const savedIds = JSON.parse(cachedSavedForums);
            setSavedForums(new Set(savedIds));
          } catch {
            // Ignore parse errors
          }
        }

        const cachedVotes = localStorage.getItem("userVotes");
        if (cachedVotes) {
          try {
            const votes = JSON.parse(cachedVotes);
            setUserVotes(votes);
          } catch {
            // Ignore parse errors
          }
        }

        // Fetch all forums
        const res = await axiosInstance.get("/forums");
        setForums(res.data?.forums || []);

        // Fetch saved forums list for current user
        try {
          const savedRes = await axiosInstance.get("/forums/saved/list");
          const forumIds = (savedRes.data?.forums || []).map(
            (f: ForumItem) => f.id,
          );
          setSavedForums(new Set(forumIds));
          // Update localStorage cache
          localStorage.setItem("savedForums", JSON.stringify(forumIds));
        } catch (err: any) {
          // If 401, user is not authenticated - this is fine
          if (err?.response?.status !== 401) {
            console.error("Fetch saved forums error:", err);
          }
        }
      } catch (err: any) {
        console.error("Fetch forums error:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredForums = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return forums.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q) ||
        f.subjects?.name?.toLowerCase().includes(q),
    );
  }, [forums, searchQuery]);

  const handlePostClick = (id: string) => {
    navigate(`/post/${id}`);
  };

  const handleUpvote = (forumId: string) => {
    setUserVotes((prev) => {
      const newVotes = { ...prev };
      if (newVotes[forumId] === 1) {
        // Remove upvote if already upvoted
        delete newVotes[forumId];
      } else {
        // Add upvote or change from downvote
        newVotes[forumId] = 1;
      }
      // Persist to localStorage
      localStorage.setItem("userVotes", JSON.stringify(newVotes));
      return newVotes;
    });
    axiosInstance
      .post(`/forums/${forumId}/vote`, { voteType: 1 })
      .catch(console.error);
  };

  const handleDownvote = (forumId: string) => {
    setUserVotes((prev) => {
      const newVotes = { ...prev };
      if (newVotes[forumId] === -1) {
        // Remove downvote if already downvoted
        delete newVotes[forumId];
      } else {
        // Add downvote or change from upvote
        newVotes[forumId] = -1;
      }
      // Persist to localStorage
      localStorage.setItem("userVotes", JSON.stringify(newVotes));
      return newVotes;
    });
    axiosInstance
      .post(`/forums/${forumId}/vote`, { voteType: -1 })
      .catch(console.error);
  };

  const handleSave = (forumId: string) => {
    setSavedForums((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(forumId)) {
        newSet.delete(forumId);
      } else {
        newSet.add(forumId);
      }
      // Cache in localStorage for quick access
      localStorage.setItem("savedForums", JSON.stringify([...newSet]));
      return newSet;
    });
    axiosInstance.post(`/forums/${forumId}/save`).catch(console.error);
  };

  const voteColors = ["yellow", "teal", "pink", "coral", "mint"] as const;

  const getRandomColorFromId = (id: string) => {
    let hash = 0;

    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    return voteColors[Math.abs(hash) % voteColors.length];
  };

  const handleCreateForum = async (postData: {
    title: string;
    subject: string;
    content: string;
    tags: string[];
    attachments?: { name: string; size: number; type: string }[];
  }) => {
    try {
      // Prepare forum data
      const forumPayload = {
        title: postData.title,
        content: postData.content,
        subject: postData.subject,
        topicIds: postData.tags.length > 0 ? postData.tags : [],
      };

      // Create the forum
      const response = await axiosInstance.post("/forums", forumPayload);
      const createdForum = response.data.forum;

      // Show success toast
      toast({
        title: "Success!",
        description: `"${postData.title}" has been posted successfully.`,
        variant: "default",
      });

      // Add to forums list and refresh
      setForums((prev) => [createdForum, ...prev]);

      // Optionally navigate to the new post
      setTimeout(() => {
        navigate(`/post/${createdForum.id}`);
      }, 500);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create forum. Please try again.";

      toast({
        title: "Error Creating Post",
        description: errorMessage,
        variant: "destructive",
      });

      console.error("Create forum error:", err);
    }
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
            className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </BrutalButton>

          <BrutalButton
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2">
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
            const voteCount = forum.vote_count ?? 0;
            const commentsCount = forum.comments_count ?? 0;
            return (
              <div
                key={forum.id}
                onClick={() => handlePostClick(forum.id)}
                className="cursor-pointer">
                <ForumCard
                  id={forum.id}
                  title={forum.title}
                  subject={forum.subjects?.name || "Unknown"}
                  content={forum.content}
                  author={forum.users?.name || "Unknown"}
                  commentsCount={commentsCount}
                  voteCount={voteCount}
                  documentUrl={forum.document_url || undefined}
                  isAIVerified={forum.is_ai_verified}
                  voteColor={getRandomColorFromId(forum.id)}
                  avatar={forum.users?.profile_url || undefined}
                  isSaved={savedForums.has(forum.id)}
                  initialUserVote={userVotes[forum.id] ?? null}
                  onUpvote={handleUpvote}
                  onDownvote={handleDownvote}
                  onSave={handleSave}
                />
              </div>
            );
          })}
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateForum}
      />
    </div>
  );
};
