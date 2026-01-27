import { Hero } from "../components/branding/Hero";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const features = [
  { title: "Forum Discussions", desc: "Threaded conversations with semantic voting." },
  { title: "AI Content Validation", desc: "Instantly check accuracy and sources." },
  { title: "Comment Verification", desc: "Highlight trustworthy contributions." },
  { title: "Post Summarization", desc: "AI-generated concise briefs." },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header */}
      <header className="border-b-4 border-ink bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-black text-2xl">Academiq</h1>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="secondary">Login</Button>
            </Link>
            <Link to="/signup">
              <Button>Create Account</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Hero />

        {/* About Section */}
        <section className="mt-20">
          <h3 className="text-3xl font-black mb-6">What is Academiq?</h3>
          <p className="text-lg font-semibold max-w-3xl">
            Academiq is a collaborative space where students and educators discuss coursework,
            share resources, and leverage AI to keep content accurate and concise.
          </p>
        </section>

        {/* Features Section */}
        <section className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title}>
              <h4 className="font-bold text-xl mb-2">{feature.title}</h4>
              <p className="font-medium">{feature.desc}</p>
            </Card>
          ))}
        </section>

        {/* CTA Section */}
        <section className="mt-20 flex flex-col md:flex-row gap-6 items-center">
          <Card className="flex-1">
            <h4 className="font-bold text-2xl mb-2">Ready to dive in?</h4>
            <p className="font-medium mb-4">Join thousands of learners on Academiq today.</p>
            <Link to="/signup">
              <Button>Create Account</Button>
            </Link>
          </Card>
          <div className="flex-1 w-full h-48 bg-accent border-4 border-ink shadow-brutalMd grid place-items-center font-black text-3xl">
            Think. Share. Validate.
          </div>
        </section>
      </main>
    </div>
  );
}
