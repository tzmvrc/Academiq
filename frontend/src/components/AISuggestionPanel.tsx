import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const suggestions = [
  { title: "Neural Architecture Search: AutoML Beyond NAS", field: "ML" },
  { title: "mRNA Vaccine Design: Computational Approaches", field: "Biotech" },
  { title: "Category Theory in Functional Programming", field: "CS" },
  { title: "Climate Modeling with Graph Neural Networks", field: "Earth Sci" },
];

const AISuggestionPanel = () => {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-ai/10 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-ai" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">AI Suggestions</h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="w-full text-left group flex items-start gap-3 rounded-lg p-2.5 hover:bg-secondary transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.field}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </motion.aside>
  );
};

export default AISuggestionPanel;
