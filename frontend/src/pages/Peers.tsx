import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Star, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PeerCardSkeleton } from "@/components/SkeletonLoaders";

const peers = [
  { name: "Dr. Sarah Chen", initials: "SC", university: "MIT", field: "Machine Learning", reputation: 4820 },
  { name: "Prof. James Rivera", initials: "JR", university: "Harvard", field: "Bioethics", reputation: 3950 },
  { name: "Dr. Anika Patel", initials: "AP", university: "Caltech", field: "Quantum Computing", reputation: 3640 },
  { name: "Lina Kovacs", initials: "LK", university: "ETH Zürich", field: "PL Theory", reputation: 2870 },
  { name: "Prof. Michael Torres", initials: "MT", university: "Johns Hopkins", field: "Biostatistics", reputation: 3210 },
  { name: "Dr. Emily Zhang", initials: "EZ", university: "Stanford", field: "NLP", reputation: 4150 },
  { name: "Dr. Ricardo Almeida", initials: "RA", university: "LSE", field: "Economics", reputation: 2590 },
  { name: "Prof. Yuki Tanaka", initials: "YT", university: "University of Tokyo", field: "Robotics", reputation: 3080 },
];

const Peers = () => {
  const [followed, setFollowed] = useState<Set<string>>(new Set(["Prof. James Rivera", "Prof. Michael Torres"]));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleFollow = (name: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      const isFollowing = next.has(name);
      isFollowing ? next.delete(name) : next.add(name);
      toast({ title: isFollowing ? `Unfollowed ${name}` : `Following ${name}` });
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">Academic Peers</h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Connect with researchers and scholars across disciplines.</p>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <>
            {[...Array(8)].map((_, i) => (
              <PeerCardSkeleton key={i} index={i} />
            ))}
          </>
        ) : (
          peers.map((peer, i) => {
            const isFollowed = followed.has(peer.name);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center transition-all hover:shadow-md hover:border-primary/10"
              >
                <div className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-semibold text-primary">{peer.initials}</span>
                </div>
                <h3 className="font-heading font-semibold text-foreground text-sm">{peer.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{peer.university}</p>
                <p className="text-xs text-accent font-medium mt-1">{peer.field}</p>

                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-accent" />
                  <span>{peer.reputation.toLocaleString()} reputation</span>
                </div>

                <button
                  onClick={() => toggleFollow(peer.name)}
                  className={`mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                    isFollowed
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isFollowed ? (
                    <><Check className="h-3.5 w-3.5" /> Following</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5" /> Follow</>
                  )}
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Peers;
