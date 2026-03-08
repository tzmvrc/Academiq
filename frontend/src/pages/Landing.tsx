import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "../components/ui/Icon.png";
import { Sparkles, ShieldCheck, MessageCircle, BookOpen, Compass, ArrowRight, ChevronRight, Quote } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "AI Content Validation",
    description: "Every post is analyzed for academic rigor and factual accuracy using advanced AI models.",
  },
  {
    icon: Sparkles,
    title: "Discussion Summaries",
    description: "Get instant AI-generated summaries of lengthy academic discussions and threads.",
  },
  {
    icon: MessageCircle,
    title: "Comment Verification",
    description: "AI verifies claims in comments against academic databases and research papers.",
  },
  {
    icon: Compass,
    title: "Knowledge Discovery",
    description: "Discover related research, papers, and discussions tailored to your academic interests.",
  },
];

const sampleDiscussions = [
  {
    title: "Transformers vs. State Space Models: A Comprehensive Analysis",
    author: "Dr. Sarah Chen",
    field: "Machine Learning",
    engagement: "324 upvotes · 89 comments",
  },
  {
    title: "The Ethics of CRISPR Gene Editing in Human Embryos",
    author: "Prof. James Rivera",
    field: "Bioethics",
    engagement: "256 upvotes · 134 comments",
  },
  {
    title: "Quantum Error Correction: Bridging Theory and Practice",
    author: "Dr. Anika Patel",
    field: "Quantum Computing",
    engagement: "198 upvotes · 67 comments",
  },
];

const developers = [
  {
    name: "Marc Aspa",
    initials: "MA",
    role: "Lead Developer & AI Architect",
    quote: "Building bridges between AI and academia, one line of code at a time.",
  },
  {
    name: "Samantha Paradero",
    initials: "SP",
    role: "Fullstack Developer",
    quote: "Design should get out of the way of learning. Our goal is intuitive, delightful experiences.",
  },
  {
    name: "Lawrence De Guia",
    initials: "LD",
    role: "Backend AI Engineer",
    quote: "Every line of code we write is in service of helping students learn better and faster.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal top bar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            
              <img src={Icon} alt="Academiq Logo" className="h-12 w-12" />
           
            <span className="text-xl font-heading font-bold text-foreground tracking-tight">Academiq</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-ai-subtle px-4 py-1.5 text-sm text-ai font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Academic Community
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-foreground leading-tight mb-6">
            Where Academic Minds
            <br />
            <span className="text-primary">Connect & Discover</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Join a community of students and professors discussing research, sharing knowledge, and receiving
            AI-powered insights to elevate academic discourse.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3">
            AI That Elevates Academic Discourse
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built-in intelligence that validates, summarizes, and connects academic knowledge.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/10 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Community Section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3">
            Join the Conversation
          </h2>
          <p className="text-muted-foreground">See what researchers are discussing right now.</p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {sampleDiscussions.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all"
            >
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {d.field}
              </span>
              <h3 className="font-heading font-semibold text-foreground text-sm mt-3 mb-2 leading-snug">
                {d.title}
              </h3>
              <p className="text-xs text-muted-foreground">{d.author}</p>
              <p className="text-xs text-muted-foreground mt-2">{d.engagement}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About the Developers */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3">
            Meet the Team
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We're a small team of builders passionate about transforming academic collaboration through technology.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-3">
          {developers.map((dev, i) => (
            <motion.div
              key={dev.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="rounded-xl border border-border bg-card p-6 text-center hover:shadow-md hover:border-primary/10 transition-all"
            >
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{dev.initials}</span>
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{dev.name}</h3>
              <p className="text-xs text-accent font-medium mb-4">{dev.role}</p>
              <div className="relative">
                <Quote className="h-4 w-4 text-muted-foreground/30 absolute -top-1 -left-1" />
                <p className="text-sm text-muted-foreground italic leading-relaxed pl-4">
                  "{dev.quote}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card p-10"
        >
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-4">
            Ready to Join Academiq?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Start contributing to academic discussions, connect with peers, and leverage AI to enhance your research journey.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Create Account <ChevronRight className="h-4 w-4" />
            </Link>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 Academiq. Built for learners, by learners.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
