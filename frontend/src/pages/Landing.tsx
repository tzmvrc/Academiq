import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  MessageCircle,
  BookOpen,
  Compass,
  ArrowRight,
  ChevronRight,
  Quote,
  Users,
  FileText,
  Search,
  Brain,
  Upload,
  UserPlus,
  Heart,
  Lightbulb,
  GraduationCap,
  MessagesSquare,
  Share2,
} from "lucide-react";
import academiqLogo from "@/components/ui/Icon.png";
import previewFeed from "@/components/ui/preview-feed.png";
import previewCreatePost from "@/components/ui/preview-create-post.png";
import previewProfile from "@/components/ui/preview-profile.png";

const features = [
  {
    icon: MessagesSquare,
    title: "Topic-Based Forums",
    description:
      "Engage in structured academic discussions organized by subject, field, and research area.",
  },
  {
    icon: Brain,
    title: "AI-Powered Tools",
    description:
      "Get AI-generated summaries, content validation, and smart recommendations for your research.",
  },
  {
    icon: Upload,
    title: "Notes & Reviewer Sharing",
    description:
      "Upload lecture notes, reviewers, and academic materials to share with your community.",
  },
  {
    icon: Search,
    title: "Smart Search",
    description:
      "Find discussions, peers, and resources with intelligent search and personalized recommendations.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "Connect with students and professors, upvote quality content, and build your academic network.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Content",
    description:
      "AI validates claims against academic databases ensuring high-quality, factual discourse.",
  },
];

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create an Account",
    description:
      "Sign up in seconds with your email or Google account to join the community.",
  },
  {
    icon: Heart,
    step: "02",
    title: "Select Your Interests",
    description:
      "Choose academic topics and fields that match your studies and research focus.",
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "Join Discussions",
    description:
      "Browse forums, ask questions, share insights, and engage with peers on topics you care about.",
  },
  {
    icon: Share2,
    step: "04",
    title: "Share & Collaborate",
    description:
      "Upload notes, share resources, and collaborate with students across disciplines.",
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

const appPreviews = [
  {
    image: previewFeed,
    caption: "Topic-Based Discussion Feed",
    description:
      "Browse and engage with academic discussions organized by field and topic.",
  },
  {
    image: previewCreatePost,
    caption: "Create Academic Forum Posts",
    description:
      "Publish discussions with rich content, categories, and optional file attachments.",
  },
  {
    image: previewProfile,
    caption: "Academic Profile & Activity",
    description:
      "Track your contributions, manage interests, and build your academic reputation.",
  },
];

const developers = [
  {
    name: "Marc Aspa",
    initials: "MA",
    role: "Lead Developer & AI Architect",
    quote:
      "Building bridges between AI and academia, one line of code at a time.",
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
    quote:
      "Every line of code we write is in service of helping students learn better and faster.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <img
              src={academiqLogo}
              alt="Academiq"
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-heading font-bold text-foreground tracking-tight">
              Academiq
            </span>
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

      {/* Hero with background logo */}
      <section className="relative mx-auto max-w-4xl px-6 pt-20 sm:pt-28 pb-20 text-center overflow-hidden">
        {/* Background logo watermark */}
        <img
          src={academiqLogo}
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain opacity-[0.07] pointer-events-none select-none"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
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
            Join a community of students and professors discussing research,
            sharing knowledge, and receiving AI-powered insights to elevate
            academic discourse.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Platform Overview */}
      <section className="relative mx-auto max-w-5xl px-6 py-20">
        <img
          src={academiqLogo}
          alt=""
          aria-hidden="true"
          className="absolute top-0 right-0 w-[350px] h-[350px] object-contain opacity-[0.05] pointer-events-none select-none translate-x-1/4 -translate-y-1/4"
        />
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-14 relative z-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium mb-4">
            <GraduationCap className="h-3.5 w-3.5" />
            Platform Overview
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-4">
            What is Academiq?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Academiq is an AI-powered academic platform designed for students
            and educators. Engage in topic-based discussions, share lecture
            notes and reviewers, collaborate across disciplines, and leverage AI
            tools to enhance the quality of academic discourse.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
          {[
            {
              icon: MessagesSquare,
              label: "Academic Discussions",
              desc: "Structured forums by topic and field",
            },
            {
              icon: FileText,
              label: "Share Notes",
              desc: "Upload and access study materials",
            },
            {
              icon: Compass,
              label: "Topic Forums",
              desc: "Organized by subject and interest",
            },
            {
              icon: Users,
              label: "Collaboration",
              desc: "Connect with peers and mentors",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="rounded-xl border border-border bg-card p-5 text-center hover:shadow-md hover:border-primary/15 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/15 transition-colors">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground text-sm mb-1">
                {item.label}
              </h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-secondary/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm text-accent font-medium mb-4">
              <Lightbulb className="h-3.5 w-3.5" />
              Key Features
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-4">
              Everything You Need for Academic Success
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to make learning, sharing, and
              collaborating more effective.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className="rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/10 transition-all group"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-sm font-medium mb-4"
            style={{ color: "hsl(150, 50%, 45%)" }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            How It Works
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-4">
            Get Started in 4 Simple Steps
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From sign-up to collaboration — it only takes a few minutes to join
            the community.
          </p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative text-center group"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px border-t-2 border-dashed border-border" />
              )}
              <div className="relative z-10 mx-auto mb-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/15 transition-colors">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {s.step}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* App Preview */}
      <section className="bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-ai-subtle px-4 py-1.5 text-sm text-ai font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              App Preview
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-4">
              See Academiq in Action
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Take a look at the platform interface and discover what awaits you
              inside.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {appPreviews.map((preview, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all group"
              >
                <div className="overflow-hidden">
                  <img
                    src={preview.image}
                    alt={preview.caption}
                    className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-semibold text-foreground mb-1.5">
                    {preview.caption}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {preview.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community / Sample Discussions */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3">
            Join the Conversation
          </h2>
          <p className="text-muted-foreground">
            See what researchers are discussing right now.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {sampleDiscussions.map((d, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/10 transition-all"
            >
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {d.field}
              </span>
              <h3 className="font-heading font-semibold text-foreground text-sm mt-3 mb-2 leading-snug">
                {d.title}
              </h3>
              <p className="text-xs text-muted-foreground">{d.author}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {d.engagement}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About the Developers */}
      <section className="bg-secondary/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3">
              Meet the Team
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We're a small team of builders passionate about transforming
              academic collaboration through technology.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-3">
            {developers.map((dev, i) => (
              <motion.div
                key={dev.name}
                {...fadeUp}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="rounded-xl border border-border bg-card p-6 text-center hover:shadow-md hover:border-primary/10 transition-all"
              >
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {dev.initials}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  {dev.name}
                </h3>
                <p className="text-xs text-accent font-medium mb-4">
                  {dev.role}
                </p>
                <div className="relative">
                  <Quote className="h-4 w-4 text-muted-foreground/30 absolute -top-1 -left-1" />
                  <p className="text-sm text-muted-foreground italic leading-relaxed pl-4">
                    "{dev.quote}"
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl border border-border bg-card p-10 sm:p-14 overflow-hidden"
        >
          <img
            src={academiqLogo}
            alt=""
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] object-contain opacity-[0.07] pointer-events-none select-none"
          />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-4">
              Ready to Join Academiq?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Start contributing to academic discussions, connect with peers,
              and leverage AI to enhance your research journey.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                Create Account <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img
              src={academiqLogo}
              alt="Academiq"
              className="h-8 w-8 object-contain"
            />
            <span>© 2026 Academiq. Built for learners. By learners</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
