/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Check,
  Cpu,
  Cog,
  Calculator,
  Briefcase,
  Heart,
  FlaskConical,
  Globe,
  BookOpen,
  Atom,
  Brain,
  Scale,
  Palette,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";

type Topic = {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  icon?: string | null;
  color?: string | null;
};

const MAX_TOPICS_TO_SHOW = 18;

const iconMap: Record<string, any> = {
  "computer-science": Cpu,
  "artificial-intelligence": Brain,
  engineering: Cog,
  mathematics: Calculator,
  business: Briefcase,
  medicine: Heart,
  physics: Atom,
  "natural-sciences": FlaskConical,
  "social-sciences": Globe,
  humanities: BookOpen,
  law: Scale,
  "arts-design": Palette,
  "arts-and-design": Palette,
};

const getTopicIcon = (topic: Topic) => {
  if (topic.slug && iconMap[topic.slug]) return iconMap[topic.slug];

  const normalized = topic.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/&/g, "and");

  if (iconMap[normalized]) return iconMap[normalized];

  return BookOpen;
};

const Onboarding = () => {
  const navigate = useNavigate();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const visibleTopics = topics.slice(0, MAX_TOPICS_TO_SHOW);

  const fetchTopics = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/forums/topics");
      setTopics(res.data.topics || []);
    } catch (error: any) {
      console.error("Fetch topics error:", error);

      toast({
        title: "Failed to load topics",
        description:
          error?.response?.data?.error || "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const toggle = (topicId: string, topicName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const isAdding = !next.has(topicId);

      if (isAdding) {
        next.add(topicId);
        toast({
          title: `Added ${topicName}`,
          description: "Topic added to your interests.",
        });
      } else {
        next.delete(topicId);
      }

      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size < 3) {
      toast({
        title: "Select more topics",
        description: `Please select at least 3 topics. You've selected ${selected.size}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      await axiosInstance.post("/forums/my-topics", {
        topicIds: Array.from(selected),
      });

      toast({
        title: "Welcome to Academiq! 🎓",
        description: "Your feed has been personalized.",
      });

      navigate("/feed");
    } catch (error: any) {
      console.error("Save topics error:", error);

      toast({
        title: "Failed to save topics",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-heading font-bold text-foreground">
            Academiq
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            What are you interested in?
          </h1>
          <p className="text-muted-foreground">
            Select at least{" "}
            <span className="font-semibold text-foreground">3 topics</span> to
            personalize your feed.
          </p>

          {!loading && topics.length > MAX_TOPICS_TO_SHOW && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {MAX_TOPICS_TO_SHOW} of {topics.length} topics
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">Loading topics...</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {visibleTopics.map((topic, i) => {
              const isSelected = selected.has(topic.id);
              const Icon = getTopicIcon(topic);

              return (
                <motion.button
                  key={topic.id}
                  type="button"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => toggle(topic.id, topic.name)}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:shadow-md hover:border-primary/15"
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary/10" : "bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-foreground text-sm">
                      {topic.name}
                    </p>
                    {topic.category && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {topic.category}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selected.size}
            </span>{" "}
            selected • minimum 3 required
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={selected.size < 3 || saving || loading}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
              selected.size >= 3 && !saving && !loading
                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : "Continue to Feed"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;