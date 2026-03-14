import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  Check,
  X,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import FeaturedSection from "@/components/FeaturedSection";
import DiscussionCard from "@/components/DiscussionCard";
import AISuggestionPanel from "@/components/AISuggestionPanel";
import CreatePostModal from "@/components/CreatePostModal";
import { toast } from "@/hooks/use-toast";
import { DiscussionCardSkeleton } from "@/components/SkeletonLoaders";
import {
  forumService,
  type DiscussionCardProps,
} from "@/integration/forum_service";

const suggestedPeople = [
  {
    name: "Dr. Sarah Chen",
    initials: "SC",
    university: "MIT",
    field: "Machine Learning",
    reputation: 4820,
  },
  {
    name: "Prof. James Rivera",
    initials: "JR",
    university: "Harvard",
    field: "Bioethics",
    reputation: 3950,
  },
  {
    name: "Dr. Anika Patel",
    initials: "AP",
    university: "Caltech",
    field: "Quantum Computing",
    reputation: 3640,
  },
  {
    name: "Dr. Emily Zhang",
    initials: "EZ",
    university: "Stanford",
    field: "NLP",
    reputation: 4150,
  },
  {
    name: "Prof. Yuki Tanaka",
    initials: "YT",
    university: "U of Tokyo",
    field: "Robotics",
    reputation: 3080,
  },
  {
    name: "Lina Kovacs",
    initials: "LK",
    university: "ETH Zürich",
    field: "PL Theory",
    reputation: 2870,
  },
];

const suggestedTopics = [
  { name: "Computer Science", followers: "24.5k" },
  { name: "Artificial Intelligence", followers: "31.2k" },
  { name: "Engineering", followers: "18.2k" },
  { name: "Mathematics", followers: "15.8k" },
  { name: "Business", followers: "21.3k" },
];

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicFilter = searchParams.get("topic");
  const [followedPeople, setFollowedPeople] = useState<Set<string>>(new Set());
  const [followedTopics, setFollowedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [forums, setForums] = useState<DiscussionCardProps[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch forums from API on component mount
  useEffect(() => {
    const loadForums = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedForums = await forumService.getAllForums();
        setForums(fetchedForums);
      } catch (err) {
        console.error("Error loading forums:", err);
        setError("Failed to load forums. Showing sample data.");
        // Fallback to dummy data
        setForums(FALLBACK_DISCUSSIONS);
      } finally {
        setIsLoading(false);
      }
    };

    loadForums();
  }, []);

  // Handle new posts created
  const handleNewPost = (newPost: DiscussionCardProps) => {
    setForums([newPost, ...forums]);
  };

  const toggleFollowPerson = (name: string) => {
    setFollowedPeople((prev) => {
      const next = new Set(prev);
      const isFollowing = next.has(name);
      isFollowing ? next.delete(name) : next.add(name);
      toast({
        title: isFollowing ? `Unfollowed ${name}` : `Following ${name}`,
      });
      return next;
    });
  };

  const handleTopicClick = (name: string) => {
    navigate(`/feed?topic=${encodeURIComponent(name)}`);
  };

  const toggleFollowTopic = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowedTopics((prev) => {
      const next = new Set(prev);
      const isFollowing = next.has(name);
      isFollowing ? next.delete(name) : next.add(name);
      toast({
        title: isFollowing ? `Unfollowed ${name}` : `Following ${name}`,
      });
      return next;
    });
  };

  const handleCreatePost = async (data: {
    title: string;
    content: string;
    category: string;
    fileName?: string;
  }) => {
    try {
      setIsLoading(true);
      const newForum = await forumService.createForum({
        title: data.title,
        content: data.content,
        subject: data.category,
      });
      handleNewPost(newForum);
      toast({
        title: "Post created successfully",
        description: "Your forum discussion has been published.",
      });
    } catch (err) {
      console.error("Error creating post:", err);
      toast({
        title: "Error creating post",
        description:
          "Failed to create your forum discussion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoteForum = async (forumId: string, voteType: 1 | -1) => {
    try {
      const result = await forumService.voteForum(forumId, voteType);
      // Update both the vote state and the vote counts from the server response
      setForums((prevForums) =>
        prevForums.map((forum) =>
          forum.id === forumId
            ? {
                ...forum,
                userVoteState: voteType,
                upvotes: result.voteCount.upvotes,
                downvotes: result.voteCount.downvotes,
              }
            : forum,
        ),
      );
      toast({
        title: voteType === 1 ? "Upvoted!" : "Downvoted!",
      });
    } catch (err) {
      console.error("Error voting:", err);
      toast({
        title: "Error voting",
        description: "Failed to vote on this forum.",
        variant: "destructive",
      });
    }
  };

  const handleUnvoteForum = async (forumId: string) => {
    try {
      const result = await forumService.unvoteForum(forumId);
      // Update both the vote state and the vote count from the server response
      setForums((prevForums) =>
        prevForums.map((forum) =>
          forum.id === forumId
            ? {
                ...forum,
                userVoteState: null,
                upvotes: result.voteCount.upvotes,
                downvotes: result.voteCount.downvotes,
              }
            : forum,
        ),
      );
      toast({
        title: "Vote removed",
      });
    } catch (err) {
      console.error("Error removing vote:", err);
      toast({
        title: "Error removing vote",
        description: "Failed to remove your vote.",
        variant: "destructive",
      });
    }
  };

  const handleSaveForum = async (forumId: string) => {
    try {
      await forumService.toggleSaveForum(forumId);
      toast({
        title: "Forum saved",
      });
    } catch (err) {
      console.error("Error saving forum:", err);
      toast({
        title: "Error saving forum",
        description: "Failed to save this forum.",
        variant: "destructive",
      });
    }
  };

  const allDiscussions = forums;
  const filteredDiscussions = topicFilter
    ? allDiscussions.filter((d) =>
        d.tag.toLowerCase().includes(topicFilter.toLowerCase()),
      )
    : allDiscussions;

  const feedItems: { type: "post" | "people"; index: number }[] = [];
  filteredDiscussions.forEach((_, i) => {
    feedItems.push({ type: "post", index: i });
    if (i === 2) feedItems.push({ type: "people", index: 0 });
  });

  const peopleScrollRef = useRef<HTMLDivElement>(null);
  const topicsScrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback(
    (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
      if (ref.current) {
        ref.current.scrollBy({
          left: direction === "left" ? -200 : 200,
          behavior: "smooth",
        });
      }
    },
    [],
  );

  const ScrollButtons = ({
    scrollRef,
  }: {
    scrollRef: React.RefObject<HTMLDivElement>;
  }) => (
    <div className="flex gap-1">
      <button
        onClick={() => scroll(scrollRef, "left")}
        className="rounded-full border border-border bg-background p-1 hover:bg-secondary transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <button
        onClick={() => scroll(scrollRef, "right")}
        className="rounded-full border border-border bg-background p-1 hover:bg-secondary transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );

  const PeopleSection = () => (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 my-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-foreground">
          People You May Know
        </h3>
        <ScrollButtons scrollRef={peopleScrollRef} />
      </div>
      <div
        ref={peopleScrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        {suggestedPeople.map((person, i) => (
          <div
            key={i}
            className="shrink-0 w-40 sm:w-44 rounded-xl border border-border bg-background p-3 sm:p-4 text-center hover:shadow-sm hover:border-primary/10 transition-all snap-start"
          >
            <div className="mx-auto mb-2.5 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {person.initials}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground truncate">
              {person.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {person.university}
            </p>
            <p className="text-[10px] text-accent font-medium mt-0.5">
              {person.field}
            </p>
            <button
              onClick={() => toggleFollowPerson(person.name)}
              className={`mt-3 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                followedPeople.has(person.name)
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {followedPeople.has(person.name) ? (
                <>
                  <Check className="h-3 w-3" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3" /> Follow
                </>
              )}
            </button>
          </div>
        ))}
        <button
          onClick={() => navigate("/peers")}
          className="shrink-0 w-40 sm:w-44 rounded-xl border border-dashed border-border bg-background p-3 sm:p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-secondary/30 transition-all snap-start"
        >
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-secondary flex items-center justify-center">
            <ArrowRight className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium">See More</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      {!topicFilter && <FeaturedSection />}

      {topicFilter && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground">
            {topicFilter} Discussions
          </h2>
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-3 w-3" /> Clear filter
          </button>
        </div>
      )}

      {!topicFilter && (
        <section className="mb-8 sm:mb-10">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4">
            Topics You May Like
          </h2>
          <div className="flex items-center justify-between mb-2">
            <div />
            <ScrollButtons scrollRef={topicsScrollRef} />
          </div>
          <div
            ref={topicsScrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
          >
            {suggestedTopics.map((topic, i) => (
              <motion.button
                key={topic.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleTopicClick(topic.name)}
                className={`shrink-0 flex items-center gap-2 rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium transition-all ${
                  followedTopics.has(topic.name)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/15 hover:shadow-sm"
                }`}
              >
                {topic.name}
                <span className="text-xs text-muted-foreground">
                  {topic.followers}
                </span>
                {followedTopics.has(topic.name) && (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span
                  role="button"
                  onClick={(e) => toggleFollowTopic(topic.name, e)}
                  className="ml-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {followedTopics.has(topic.name) ? "✓" : "+"}
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              {topicFilter ? "" : "Latest Discussions"}
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> New Post
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <DiscussionCardSkeleton key={i} index={i} />
              ))}
            </div>
          ) : (
            <>
              {feedItems.map((item, idx) => {
                if (item.type === "people")
                  return <PeopleSection key="people-section" />;
                const d = filteredDiscussions[item.index];
                return (
                  <Link to="/post/1" key={idx} className="block">
                    <DiscussionCard
                      {...d}
                      index={item.index}
                      onVote={(voteType) => handleVoteForum(d.id!, voteType)}
                      onUnvote={() => handleUnvoteForum(d.id!)}
                      onSave={() => handleSaveForum(d.id!)}
                    />
                  </Link>
                );
              })}
              {filteredDiscussions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No discussions found for "{topicFilter}".
                  </p>
                  <button
                    onClick={() => setSearchParams({})}
                    className="text-primary hover:underline text-sm mt-2"
                  >
                    View all discussions
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <AISuggestionPanel />
          </div>
        </div>
      </div>

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};

export default Index;
