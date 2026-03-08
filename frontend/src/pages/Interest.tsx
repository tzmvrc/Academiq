import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Cpu, Cog, Calculator, Briefcase, Heart, FlaskConical, Globe, BookOpen, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const topics = [
  { name: "Computer Science", icon: Cpu, followers: "24.5k" },
  { name: "Engineering", icon: Cog, followers: "18.2k" },
  { name: "Mathematics", icon: Calculator, followers: "15.8k" },
  { name: "Business", icon: Briefcase, followers: "21.3k" },
  { name: "Medicine", icon: Heart, followers: "19.7k" },
  { name: "Natural Sciences", icon: FlaskConical, followers: "12.4k" },
  { name: "Social Sciences", icon: Globe, followers: "11.1k" },
  { name: "Humanities", icon: BookOpen, followers: "9.8k" },
];

const Interests = () => {
  const navigate = useNavigate();
  const [followed, setFollowed] = useState<Set<string>>(new Set(["Computer Science", "Mathematics"]));

  const toggleFollow = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        toast({ title: `Unfollowed ${name}`, description: "You will no longer see this topic in your feed." });
      } else {
        next.add(name);
        toast({ title: `Following ${name}`, description: "This topic will now appear in your feed." });
      }
      return next;
    });
  };

  const handleTopicClick = (name: string) => {
    navigate(`/feed?topic=${encodeURIComponent(name)}`);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">Your Interests</h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Select topics to personalize your academic feed. Click a topic to view its discussions.</p>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, i) => {
          const isFollowed = followed.has(topic.name);
          const Icon = topic.icon;
          return (
            <motion.div
              key={topic.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              onClick={() => handleTopicClick(topic.name)}
              className={`relative flex flex-col rounded-xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
                isFollowed
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:shadow-md hover:border-primary/15"
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isFollowed ? "bg-primary/10" : "bg-secondary"
                }`}>
                  <Icon className={`h-5 w-5 ${isFollowed ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-foreground text-sm">{topic.name}</p>
                  <p className="text-xs text-muted-foreground">{topic.followers} followers</p>
                </div>
                {isFollowed && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <button
                onClick={(e) => toggleFollow(topic.name, e)}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                  isFollowed
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Interests;
