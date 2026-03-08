import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Check, Cpu, Cog, Calculator, Briefcase, Heart, FlaskConical, Globe, BookOpen, Atom, Brain, Scale, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const topics = [
  { name: "Computer Science", icon: Cpu },
  { name: "Artificial Intelligence", icon: Brain },
  { name: "Engineering", icon: Cog },
  { name: "Mathematics", icon: Calculator },
  { name: "Business", icon: Briefcase },
  { name: "Medicine", icon: Heart },
  { name: "Physics", icon: Atom },
  { name: "Natural Sciences", icon: FlaskConical },
  { name: "Social Sciences", icon: Globe },
  { name: "Humanities", icon: BookOpen },
  { name: "Law", icon: Scale },
  { name: "Arts & Design", icon: Palette },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    if (!selected.has(name)) {
      toast({ title: `Added ${name}`, description: "Topic added to your interests." });
    }
  };

  const handleContinue = () => {
    if (selected.size < 3) {
      toast({ title: "Select more topics", description: `Please select at least 3 topics. You've selected ${selected.size}.`, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome to Academiq! 🎓", description: "Your feed has been personalized." });
    navigate("/feed");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-heading font-bold text-foreground">Academiq</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">What are you interested in?</h1>
          <p className="text-muted-foreground">Select at least <span className="font-semibold text-foreground">3 topics</span> to personalize your feed.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {topics.map((topic, i) => {
            const isSelected = selected.has(topic.name);
            const Icon = topic.icon;
            return (
              <motion.button
                key={topic.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                onClick={() => toggle(topic.name)}
                className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:shadow-md hover:border-primary/15"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? "bg-primary/10" : "bg-secondary"
                }`}>
                  <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <p className="font-heading font-semibold text-foreground text-sm flex-1">{topic.name}</p>
                {isSelected && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{selected.size}</span> of 3 minimum selected
          </p>
          <button
            onClick={handleContinue}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
              selected.size >= 3
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            Continue to Feed
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
