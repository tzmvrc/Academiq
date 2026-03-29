/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";

type Subject = {
  id: string;
  name: string;
};

const MAX_SUBJECTS_TO_SHOW = 18;

// Helper: map subject name to an icon component
const getIconForSubject = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("math")) return Icons.Calculator;
  if (lowerName.includes("physic")) return Icons.Atom;
  if (lowerName.includes("chem")) return Icons.FlaskConical;
  if (lowerName.includes("biol")) return Icons.Dna;
  if (lowerName.includes("comput") || lowerName.includes("program")) return Icons.Cpu;
  if (lowerName.includes("engin")) return Icons.Cog;
  if (lowerName.includes("busin") || lowerName.includes("econ")) return Icons.Briefcase;
  if (lowerName.includes("medic")) return Icons.Heart;
  if (lowerName.includes("psych")) return Icons.Brain;
  if (lowerName.includes("law") || lowerName.includes("legal")) return Icons.Scale;
  if (lowerName.includes("art") || lowerName.includes("design")) return Icons.Palette;
  if (lowerName.includes("histor")) return Icons.BookOpen;
  if (lowerName.includes("lang") || lowerName.includes("literature")) return Icons.Languages;
  if (lowerName.includes("geog")) return Icons.Globe;
  if (lowerName.includes("sociol") || lowerName.includes("anthro")) return Icons.Users;
  if (lowerName.includes("philos")) return Icons.Brain;
  if (lowerName.includes("educ")) return Icons.GraduationCap;
  return Icons.BookOpen;
};

// Optional: generate a consistent pastel color for the icon background
const getIconColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 85%)`;
};

const Onboarding = () => {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const visibleSubjects = subjects.slice(0, MAX_SUBJECTS_TO_SHOW);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/forums/subjects");
      setSubjects(res.data.subjects || []);
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      toast({
        title: "Failed to load subjects",
        description: error?.response?.data?.error || "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const toggle = (subjectId: string, subjectName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const isAdding = !next.has(subjectId);

      if (isAdding) {
        next.add(subjectId);
        toast({
          title: `Added ${subjectName}`,
          description: "Subject added to your interests.",
        });
      } else {
        next.delete(subjectId);
      }

      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size < 3) {
      toast({
        title: "Select more subjects",
        description: `Please select at least 3 subjects. You've selected ${selected.size}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await axiosInstance.post("/forums/my-subjects", {
        subjectIds: Array.from(selected),
      });

      toast({
        title: "Welcome to Academiq! 🎓",
        description: "Your feed has been personalized.",
      });

      navigate("/feed");
    } catch (error: any) {
      console.error("Save subjects error:", error);
      toast({
        title: "Failed to save subjects",
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
            What subjects are you interested in?
          </h1>
          <p className="text-muted-foreground">
            Select at least{" "}
            <span className="font-semibold text-foreground">3 subjects</span> to
            personalize your feed.
          </p>

          {!loading && subjects.length > MAX_SUBJECTS_TO_SHOW && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {MAX_SUBJECTS_TO_SHOW} of {subjects.length} subjects
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">Loading subjects...</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {visibleSubjects.map((subject, i) => {
              const isSelected = selected.has(subject.id);
              const Icon = getIconForSubject(subject.name);
              const iconBg = getIconColor(subject.name);

              return (
                <motion.button
                  key={subject.id}
                  type="button"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => toggle(subject.id, subject.name)}
                  className={`relative flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:shadow-md hover:border-primary/15"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: iconBg }}
                    >
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <span className="font-heading font-semibold text-foreground text-sm">
                      {subject.name}
                    </span>
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