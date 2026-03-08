import { TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import AIBadge from "../components/AIBadge";

const featured = [
  {
    title: "Transformers vs. State Space Models: A Comprehensive Analysis of Sequence Modeling",
    author: "Dr. Sarah Chen",
    field: "Machine Learning",
    tag: "Computer Science",
    summary: "This discussion compares attention-based transformers with emerging SSM architectures across benchmarks in NLP, vision, and genomics.",
    engagement: "324 upvotes · 89 comments",
  },
  {
    title: "The Ethics of CRISPR Gene Editing in Human Embryos: Where Do We Draw the Line?",
    author: "Prof. James Rivera",
    field: "Bioethics",
    tag: "Medicine",
    summary: "A multidisciplinary discussion examining regulatory frameworks, societal implications, and moral boundaries of germline editing.",
    engagement: "256 upvotes · 134 comments",
  },
  {
    title: "Quantum Error Correction: Bridging Theory and Practical Implementation",
    author: "Dr. Anika Patel",
    field: "Quantum Computing",
    tag: "Physics",
    summary: "Exploring recent breakthroughs in topological codes and their implications for fault-tolerant quantum computation.",
    engagement: "198 upvotes · 67 comments",
  },
];

const FeaturedSection = () => {
  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <TrendingUp className="h-5 w-5 text-accent" />
        <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">
          Trending Academic Discussions
        </h2>
      </div>

      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/15 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {item.tag}
              </span>
              <AIBadge variant="verified" />
            </div>

            <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {item.title}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{item.author} · {item.field}</p>

            <div className="rounded-lg bg-ai-subtle/50 border border-ai/10 p-2.5 sm:p-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-3 w-3 text-ai" />
                <span className="text-xs font-medium text-ai">AI Summary</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.summary}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">{item.engagement}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedSection;
