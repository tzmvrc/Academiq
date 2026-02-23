import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalTag } from "@/components/ui/BrutalTag";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Check,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/useAuth";
import axiosInstance from "@/integration/axiosInstance";


interface Topic {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Fetch topics and user-selected topics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/topics");
        setTopics(res.data.topics || []);
      } catch (err) {
        console.error(err);
        toast({ title: "Failed to load topics", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

  // Redirect if no user
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Save selected topics
  const handleContinue = async () => {
    if (selectedTopics.size < 3) {
      toast({ title: "Select at least 3 topics", variant: "destructive" });
      return;
    }
    console.log("Selected topic IDs:", Array.from(selectedTopics));

    setSaving(true);
    try {
      const res = await axiosInstance.post("/topics/users/topics", {
        topicIds: Array.from(selectedTopics),
      });
      toast({ title: res.data.message });
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast({
        title: err.response?.data?.error || "Failed to save topics",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Clear all selected topics
  const handleClearAll = () => {
    setSaving(true);

    try {
      setSelectedTopics(new Set());
    } catch (err) {
      toast({
        title: "Failed to clear topics",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(topics.map((t) => t.category))];
  const filteredTopics = filterCategory
    ? topics.filter((t) => t.category === filterCategory)
    : topics;

  const colorMap: Record<
    string,
    "yellow" | "teal" | "pink" | "coral" | "violet" | "mint" | "default"
  > = {
    yellow: "yellow",
    teal: "teal",
    pink: "pink",
    coral: "coral",
    violet: "violet",
    mint: "mint",
    default: "default",
  };

  if (authLoading || loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            What are you interested in?
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Pick at least{" "}
            <span className="font-bold text-foreground">3 topics</span> to
            personalize your feed
          </p>
        </div>

        {/* AI Badge */}
        <BrutalCard color="violet" className="p-4 mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold text-sm">
              We'll use these to recommend discussions & peers
            </span>
          </div>
        </BrutalCard>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <BrutalTag
            color={filterCategory === null ? "violet" : "default"}
            onClick={() => setFilterCategory(null)}
            className="cursor-pointer"
          >
            All
          </BrutalTag>
          {categories.map((cat) => (
            <BrutalTag
              key={cat}
              color={filterCategory === cat ? "violet" : "default"}
              onClick={() => setFilterCategory(cat)}
              className="cursor-pointer"
            >
              {cat}
            </BrutalTag>
          ))}
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
          <AnimatePresence mode="popLayout">
            {filteredTopics.map((topic) => {
              const isSelected = selectedTopics.has(topic.id);
              const cardColor = colorMap[topic.color] || "default";

              return (
                <motion.div
                  key={topic.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div onClick={() => toggleTopic(topic.id)}>
                    <BrutalCard
                      color={isSelected ? cardColor : "default"}
                      className={`p-4 cursor-pointer relative transition-all duration-150 ${isSelected ? "ring-4 ring-foreground ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"}`}
                      hoverEffect={!isSelected}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-foreground rounded-full flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-background" />
                        </motion.div>
                      )}
                      <div className="text-3xl mb-2">{topic.icon}</div>
                      <h3 className="font-bold text-sm leading-tight">
                        {topic.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {topic.category}
                      </p>
                    </BrutalCard>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t-[3px] border-foreground p-4 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground text-lg">
                  {selectedTopics.size}
                </span>{" "}
                selected
                {selectedTopics.size < 3 && (
                  <span className="text-muted-foreground"> (min 3)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <BrutalButton
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={saving}
              >
                <div className="flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </div>
              </BrutalButton>

              <BrutalButton
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                Skip for now
              </BrutalButton>
              <BrutalButton
                variant="primary"
                size="sm"
                onClick={handleContinue}
                disabled={saving || selectedTopics.size < 3}
              >
                <div className="flex items-center gap-2">
                  <span>{saving ? "Saving..." : "Continue"}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </BrutalButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
