import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  UserPlus,
  Hash,
  TrendingUp,
  ArrowRight,
  Cpu,
  Cog,
  Calculator,
  Briefcase,
  Heart,
  FlaskConical,
  Globe,
  BookOpen,
  Atom,
  Dna,
  Brain,
  Scale,
  Palette,
  Languages,
  Users,
  GraduationCap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";

// Updated interfaces: use discussion_count instead of usage_count
interface Subject {
  id: string;
  name: string;
  discussion_count: number; // dynamic count from forums table
}

interface Tag {
  id: string;
  name: string;
  discussion_count: number; // dynamic count from forum_tags table
}

interface Forum {
  id: string;
  title: string;
  content: string;
  subject: { id: string; name: string };
  upvotes: number;
  comments: number;
  user: { name: string };
}

// Icon mapping (unchanged)
const getIconForSubject = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("math")) return Calculator;
  if (lowerName.includes("physic")) return Atom;
  if (lowerName.includes("chem")) return FlaskConical;
  if (lowerName.includes("biol")) return Dna;
  if (lowerName.includes("comput") || lowerName.includes("program")) return Cpu;
  if (lowerName.includes("engin")) return Cog;
  if (lowerName.includes("busin") || lowerName.includes("econ"))
    return Briefcase;
  if (lowerName.includes("medic")) return Heart;
  if (lowerName.includes("psych")) return Brain;
  if (lowerName.includes("law") || lowerName.includes("legal")) return Scale;
  if (lowerName.includes("art") || lowerName.includes("design")) return Palette;
  if (lowerName.includes("histor")) return BookOpen;
  if (lowerName.includes("lang") || lowerName.includes("literature"))
    return Languages;
  if (lowerName.includes("geog")) return Globe;
  if (lowerName.includes("sociol") || lowerName.includes("anthro"))
    return Users;
  if (lowerName.includes("philos")) return Brain;
  if (lowerName.includes("educ")) return GraduationCap;
  return BookOpen;
};

const Interests = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [trendingTags, setTrendingTags] = useState<Tag[]>([]);
  const [followedSubjectIds, setFollowedSubjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featuredForums, setFeaturedForums] = useState<Forum[]>([]);
  const [loadingForums, setLoadingForums] = useState(false);

  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const [showAllDiscover, setShowAllDiscover] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data using dynamic-count endpoints
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Get all subjects with dynamic discussion_count
        const subjectsRes = await axiosInstance.get("/subjects/with-count");
        const allSubjects = subjectsRes.data.subjects || [];
        setSubjects(allSubjects);

        // 2. Get top 15 tags by discussion_count
        const tagsRes = await axiosInstance.get("/tags/with-count?limit=15");
        setTrendingTags(tagsRes.data.tags || []);

        // 3. Get user's followed subjects
        const mySubjectsRes = await axiosInstance.get("/subjects/my-subjects");
        const followed = mySubjectsRes.data.subjects || [];
        setFollowedSubjectIds(new Set(followed.map((s: Subject) => s.id)));
      } catch (err) {
        console.error("Error fetching interests data:", err);
        toast({ title: "Failed to load interests", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Featured forums from top 3 subjects by discussion_count
  useEffect(() => {
    const fetchFeaturedForums = async () => {
      if (subjects.length === 0) return;
      const topSubjects = [...subjects]
        .sort((a, b) => b.discussion_count - a.discussion_count)
        .slice(0, 3);
      if (topSubjects.length === 0) return;

      setLoadingForums(true);
      try {
        const promises = topSubjects.map((subject) =>
          axiosInstance.get(
            `/forums?subjectId=${subject.id}&limit=2&sort=upvotes`,
          ),
        );
        const results = await Promise.all(promises);
        const forums = results.flatMap((res) => res.data.forums || []);
        const unique = forums.filter(
          (f, idx, self) => self.findIndex((f2) => f2.id === f.id) === idx,
        );
        setFeaturedForums(unique.slice(0, 5));
      } catch (err) {
        console.error("Error fetching featured forums:", err);
      } finally {
        setLoadingForums(false);
      }
    };
    fetchFeaturedForums();
  }, [subjects]);

  const toggleFollow = async (
    subjectId: string,
    name: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const isFollowing = followedSubjectIds.has(subjectId);
    const newSet = new Set(followedSubjectIds);
    isFollowing ? newSet.delete(subjectId) : newSet.add(subjectId);
    setFollowedSubjectIds(newSet);

    setSaving(true);
    try {
      if (isFollowing) {
        // Unfollow
        await axiosInstance.delete(`/subjects/follow/${subjectId}`);
        toast({ title: `Unfollowed ${name}` });
      } else {
        // Follow
        await axiosInstance.post(`/subjects/follow/${subjectId}`);
        toast({ title: `Following ${name}` });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      toast({ title: "Failed to update preferences", variant: "destructive" });
      setFollowedSubjectIds(followedSubjectIds); // revert
    } finally {
      setSaving(false);
    }
  };

  const handleSubjectClick = (subjectId: string) => {
    navigate(`/feed?subjectId=${subjectId}`);
  };

  const handleTagClick = (tagId: string) => {
    navigate(`/feed?tagId=${tagId}`);
  };

  const handleForumClick = (forumId: string) => {
    navigate(`/post/${forumId}`);
  };

  // Derived data – all sorted by discussion_count (most active first)
  const topTrendingSubjects = [...subjects]
    .sort((a, b) => b.discussion_count - a.discussion_count)
    .slice(0, 6);

  // Followed subjects – sorted by discussion_count
  const followedSubjects = subjects
    .filter((s) => followedSubjectIds.has(s.id))
    .sort((a, b) => b.discussion_count - a.discussion_count);
  const visibleFollowed = showAllFollowed
    ? followedSubjects
    : followedSubjects.slice(0, 3);

  // Discover subjects (not followed) – sorted by discussion_count
  const discoverSubjects = subjects
    .filter((s) => !followedSubjectIds.has(s.id))
    .sort((a, b) => b.discussion_count - a.discussion_count);
  const filteredDiscover = discoverSubjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const visibleDiscover = showAllDiscover
    ? filteredDiscover
    : filteredDiscover.slice(0, 6);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">
          Your Interests
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
          Loading topics...
        </p>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-secondary animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">
        Your Interests
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
        Explore topics and discussions tailored to you.
      </p>

      {/* Trending Tags - now using discussion_count */}
      {trendingTags.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              Trending Tags
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 transition-colors">
                <Hash className="h-3.5 w-3.5" />
                {tag.name}
                <span className="ml-1 text-xs text-primary/70">
                  {tag.discussion_count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Subjects - using discussion_count */}
      {topTrendingSubjects.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              Trending Subjects
            </h2>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {topTrendingSubjects.map((subject) => {
              const Icon = getIconForSubject(subject.name);
              const isFollowed = followedSubjectIds.has(subject.id);
              return (
                <div
                  key={subject.id}
                  onClick={() => handleSubjectClick(subject.id)}
                  className={`flex flex-col rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
                    isFollowed
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isFollowed ? "bg-primary/10" : "bg-secondary"
                      }`}>
                      <Icon
                        className={`h-5 w-5 ${isFollowed ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm truncate">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {subject.discussion_count} discussions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFollow(subject.id, subject.name, e)}
                    disabled={saving}
                    className={`mt-auto w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      isFollowed
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}>
                    {isFollowed ? (
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
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Discussions - unchanged */}
      {featuredForums.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4">
            Featured Discussions
          </h2>
          <div className="space-y-3">
            {featuredForums.map((forum) => (
              <div
                key={forum.id}
                onClick={() => handleForumClick(forum.id)}
                className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
                <h3 className="font-heading font-semibold text-foreground mb-1 line-clamp-1">
                  {forum.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {forum.content}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                    {forum.subject.name}
                  </span>
                  <span>↑ {forum.upvotes}</span>
                  <span>💬 {forum.comments}</span>
                  <span>by {forum.user?.name || "Anonymous"}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={() => navigate("/feed")}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View more <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Your Followed Subjects - sorted by discussion_count */}
      {followedSubjects.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              Your Followed Subjects
            </h2>
            {followedSubjects.length > 3 && (
              <button
                onClick={() => setShowAllFollowed(!showAllFollowed)}
                className="text-sm text-primary hover:underline">
                {showAllFollowed ? "Show less" : "View more"}
              </button>
            )}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFollowed.map((subject) => {
              const Icon = getIconForSubject(subject.name);
              return (
                <div
                  key={subject.id}
                  onClick={() => handleSubjectClick(subject.id)}
                  className="flex flex-col rounded-xl border border-primary bg-primary/5 p-4 transition-all cursor-pointer hover:shadow-md">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm truncate">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {subject.discussion_count} discussions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFollow(subject.id, subject.name, e)}
                    disabled={saving}
                    className="mt-auto w-full flex items-center justify-center gap-1.5 rounded-lg bg-secondary py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">
                    <Check className="h-3 w-3" /> Following
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discover More Subjects - sorted by discussion_count */}
      {discoverSubjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">
              Discover More Subjects
            </h2>
            {!searchTerm && discoverSubjects.length > 6 && (
              <button
                onClick={() => setShowAllDiscover(!showAllDiscover)}
                className="text-sm text-primary hover:underline">
                {showAllDiscover ? "Show less" : "Browse all subjects"}
              </button>
            )}
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowAllDiscover(false);
              }}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDiscover.map((subject) => {
              const Icon = getIconForSubject(subject.name);
              return (
                <div
                  key={subject.id}
                  onClick={() => handleSubjectClick(subject.id)}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 transition-all cursor-pointer hover:shadow-md">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm truncate">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {subject.discussion_count} discussions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFollow(subject.id, subject.name, e)}
                    disabled={saving}
                    className="mt-auto w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    <UserPlus className="h-3 w-3" /> Follow
                  </button>
                </div>
              );
            })}
          </div>

          {searchTerm && filteredDiscover.length > 6 && !showAllDiscover && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllDiscover(true)}
                className="text-sm text-primary hover:underline">
                Show all {filteredDiscover.length} results
              </button>
            </div>
          )}
          {searchTerm && showAllDiscover && filteredDiscover.length > 6 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllDiscover(false)}
                className="text-sm text-primary hover:underline">
                Show less
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Interests;
