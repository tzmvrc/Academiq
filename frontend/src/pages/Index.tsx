import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Check, X, ArrowRight } from "lucide-react";
import FeaturedSection from "@/components/FeaturedSection";
import DiscussionCard from "@/components/DiscussionCard";
import AISuggestionPanel from "@/components/AISuggestionPanel";
import { toast } from "@/hooks/use-toast";

const discussions = [
  { title: "Attention Is All You Need — Revisited in 2026", author: "Dr. Emily Zhang", authorInitials: "EZ", field: "NLP · Stanford University", preview: "Three years after the transformer revolution, we examine what has changed, what remains, and what new architectures are challenging the paradigm.", aiSummary: "Compares original transformer architecture with modern alternatives including Mamba, RWKV, and hybrid approaches across standard benchmarks.", upvotes: 284, comments: 47, tag: "Deep Learning" },
  { title: "Bayesian Methods for Small-Sample Clinical Trials", author: "Prof. Michael Torres", authorInitials: "MT", field: "Biostatistics · Johns Hopkins", preview: "How Bayesian adaptive designs are revolutionizing rare disease clinical trials, enabling faster and more ethical drug development.", aiSummary: "Discusses adaptive Bayesian trial designs that allow dynamic sample size adjustments while maintaining statistical rigor.", upvotes: 156, comments: 32, tag: "Medicine" },
  { title: "Formal Verification of Smart Contracts Using Coq", author: "Lina Kovacs", authorInitials: "LK", field: "PL Theory · ETH Zürich", preview: "An exploration of using dependent types and proof assistants to verify correctness properties of Solidity smart contracts.", aiSummary: "Presents a framework for translating Solidity to Coq specifications, enabling formal proofs of contract invariants.", upvotes: 128, comments: 21, tag: "Computer Science" },
  { title: "The Political Economy of Carbon Pricing Mechanisms", author: "Dr. Ricardo Almeida", authorInitials: "RA", field: "Environmental Economics · LSE", preview: "Comparing cap-and-trade vs carbon tax approaches across different economic contexts and their effectiveness in reducing emissions.", aiSummary: "Analyzes empirical data from EU ETS, California's system, and Canada's carbon tax to evaluate policy effectiveness.", upvotes: 97, comments: 54, tag: "Economics" },
  { title: "Modern Approaches to Structural Engineering Optimization", author: "Dr. Wei Chen", authorInitials: "WC", field: "Civil Engineering · MIT", preview: "Applying topology optimization and generative design to create more efficient and sustainable structural systems.", aiSummary: "Reviews computational methods for structural optimization including SIMP, level-set, and AI-driven generative approaches.", upvotes: 73, comments: 18, tag: "Engineering" },
  { title: "Game Theory Applications in Business Strategy", author: "Prof. Anna Mueller", authorInitials: "AM", field: "Strategy · Wharton", preview: "How game-theoretic models help predict competitive dynamics and inform strategic decision-making in modern markets.", aiSummary: "Covers Nash equilibrium applications in pricing, market entry, and competitive positioning across industries.", upvotes: 112, comments: 29, tag: "Business" },
];

const suggestedPeople = [
  { name: "Dr. Sarah Chen", initials: "SC", university: "MIT", field: "Machine Learning", reputation: 4820 },
  { name: "Prof. James Rivera", initials: "JR", university: "Harvard", field: "Bioethics", reputation: 3950 },
  { name: "Dr. Anika Patel", initials: "AP", university: "Caltech", field: "Quantum Computing", reputation: 3640 },
  { name: "Dr. Emily Zhang", initials: "EZ", university: "Stanford", field: "NLP", reputation: 4150 },
  { name: "Prof. Yuki Tanaka", initials: "YT", university: "U of Tokyo", field: "Robotics", reputation: 3080 },
  { name: "Lina Kovacs", initials: "LK", university: "ETH Zürich", field: "PL Theory", reputation: 2870 },
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

  const toggleFollowPerson = (name: string) => {
    setFollowedPeople((prev) => {
      const next = new Set(prev);
      const isFollowing = next.has(name);
      isFollowing ? next.delete(name) : next.add(name);
      toast({ title: isFollowing ? `Unfollowed ${name}` : `Following ${name}` });
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
      toast({ title: isFollowing ? `Unfollowed ${name}` : `Following ${name}` });
      return next;
    });
  };

  const filteredDiscussions = topicFilter
    ? discussions.filter(d => d.tag.toLowerCase().includes(topicFilter.toLowerCase()))
    : discussions;

  // Interleave "People You May Know" after every 2 posts
  const feedItems: { type: "post" | "people"; index: number }[] = [];
  filteredDiscussions.forEach((_, i) => {
    feedItems.push({ type: "post", index: i });
    if (i === 1) {
      feedItems.push({ type: "people", index: 0 });
    }
  });

  const PeopleSection = () => (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 my-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-foreground">People You May Know</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {suggestedPeople.map((person, i) => (
          <div
            key={i}
            className="shrink-0 w-40 sm:w-44 rounded-xl border border-border bg-background p-3 sm:p-4 text-center hover:shadow-sm hover:border-primary/10 transition-all snap-start"
          >
            <div className="mx-auto mb-2.5 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{person.initials}</span>
            </div>
            <p className="text-xs font-medium text-foreground truncate">{person.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{person.university}</p>
            <p className="text-[10px] text-accent font-medium mt-0.5">{person.field}</p>
            <button
              onClick={() => toggleFollowPerson(person.name)}
              className={`mt-3 w-full flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                followedPeople.has(person.name)
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {followedPeople.has(person.name) ? <><Check className="h-3 w-3" /> Following</> : <><UserPlus className="h-3 w-3" /> Follow</>}
            </button>
          </div>
        ))}
        {/* See More card */}
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

      {/* Topic filter banner */}
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

      {/* Topics You May Like */}
      {!topicFilter && (
        <section className="mb-8 sm:mb-10">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-4">Topics You May Like</h2>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
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
                <span className="text-xs text-muted-foreground">{topic.followers}</span>
                {followedTopics.has(topic.name) && <Check className="h-3.5 w-3.5" />}
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
        {/* Discussion Feed with interleaved people */}
        <div className="space-y-4 min-w-0">
          <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground mb-2">
            {topicFilter ? "" : "Latest Discussions"}
          </h2>
          {feedItems.map((item, idx) => {
            if (item.type === "people") {
              return <PeopleSection key="people-section" />;
            }
            const d = filteredDiscussions[item.index];
            return (
              <Link to="/post/1" key={idx} className="block">
                <DiscussionCard {...d} index={item.index} />
              </Link>
            );
          })}
          {filteredDiscussions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No discussions found for "{topicFilter}".</p>
              <button onClick={() => setSearchParams({})} className="text-primary hover:underline text-sm mt-2">
                View all discussions
              </button>
            </div>
          )}
        </div>

        {/* Sidebar suggestions */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <AISuggestionPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
