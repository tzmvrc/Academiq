import React from 'react';
import { Link } from 'react-router-dom';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { 
  GraduationCap, 
  Sparkles, 
  MessageCircle, 
  Trophy, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Users,
  Brain,
  Quote
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Validation',
    description: 'Every post and comment is analyzed by AI for accuracy and quality. Get instant feedback on your academic content.',
    color: 'yellow' as const,
  },
  {
    icon: MessageCircle,
    title: 'Smart Discussions',
    description: 'Engage in meaningful academic debates. AI summarizes long threads and highlights key insights.',
    color: 'teal' as const,
  },
  {
    icon: Trophy,
    title: 'Earn Recognition',
    description: 'Build your reputation through quality contributions. Climb the leaderboards and earn academic badges.',
    color: 'pink' as const,
  },
  {
    icon: CheckCircle,
    title: 'Verified Content',
    description: 'Trust the knowledge. AI verification badges show which content has been fact-checked and validated.',
    color: 'coral' as const,
  },
];

const developers = [
  {
    name: 'Marc Aspa',
    role: 'Lead Developer & AI Architect',
    quote: 'We built Academiq to democratize knowledge validation and make academic discourse accessible to everyone.',
    avatar: 'MA',
    color: 'yellow' as const,
  },
  {
    name: 'Samantha Paradero',
    role: 'Fullstack Developer',
    quote: 'Design should get out of the way of learning. Our goal is intuitive, delightful experiences.',
    avatar: 'SP',
    color: 'teal' as const,
  },
  {
    name: 'Lawrence De Guia',
    role: 'Backend AI Engineer',
    quote: 'Every line of code we write is in service of helping students learn better and faster.',
    avatar: 'LDG',
    color: 'pink' as const,
  },
];

const topics = [
  'Computer Science', 'Physics', 'Mathematics', 'Biology', 'Chemistry',
  'Philosophy', 'Economics', 'Psychology', 'Engineering', 'Medicine',
  'Data Science', 'Machine Learning', 'Algorithm', 'Environmental Science',
  'Graphic Design', 'Genetics', 'Sociology', 'Literature', 'History', 'Art',
];

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-[4px] border-foreground bg-card sticky top-0 z-50">
        <div className="container mx-auto px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Academiq</span>
          </div>
          <div className="hidden md:flex items-center gap-20">
            <a href="#features" className="font-medium hover:text-primary transition-colors">Features</a>
            <a href="#showcase" className="font-medium hover:text-primary transition-colors">How It Works</a>
            <a href="#team" className="font-medium hover:text-primary transition-colors">Team</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <BrutalButton variant="outline">Login</BrutalButton>
            </Link>
            <Link to="/signup">
              <BrutalButton variant="primary">
                Get Started
               
              </BrutalButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-30 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow rounded-full border-[3px] border-foreground opacity-50 animate-float" />
        <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-teal rounded-full border-[3px] border-foreground opacity-50 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-60 left-20 w-16 h-16 bg-pink rounded-full border-[3px] border-foreground opacity-50 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-20 left-360 w-24 h-24 bg-pink rounded-full border-[3px] border-foreground opacity-50 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-80 left-380 w-32 h-32 bg-yellow rounded-full border-[3px] border-foreground opacity-50 animate-float" />
        <div className="absolute bottom-40 left-350 w-24 h-24 bg-teal rounded-full border-[3px] border-foreground opacity-50 animate-float" style={{ animationDelay: '1s' }} />


        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 items-center">
            {/* Left side - Text content */}
            <div className="text-left ml-15">
              <BrutalCard color="violet" className="inline-flex items-center gap-2 px-4 py-2 mb-8">
                <Zap className="w-4 h-4" />
                <span className="font-bold">AI-Powered Academic Forum</span>
              </BrutalCard>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Where{' '}
                <span className="inline-block bg-violet text-primary-foreground px-3 py-1 border-[4px] border-foreground shadow-brutal rotate-[-2deg]">
                  knowledge
                </span>
                <br />
                gets{' '}
                <span className="inline-block bg-yellow px-3 py-1 border-[4px] border-foreground shadow-brutal rotate-[2deg] mt-2">
                  smarter
                </span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl mb-8">
                Join the academic community where AI validates content, summarizes discussions, 
                and helps you earn recognition for quality contributions.
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <Link to="/signup">
                  <BrutalButton variant="primary" size="lg">
                    Get Started
                    
                  </BrutalButton>
                </Link>
                <Link to="/login">
                  <BrutalButton variant="outline" size="lg">
                    Login
                  </BrutalButton>
                </Link>
              </div>
            </div>

            {/* Right side - Forum Detail Preview */}
            <div className="relative hidden md:flex items-center justify-center">
              <BrutalCard className="w-full max-w-lg p-5 bg-card rotate-2 shadow-brutal-lg">
                {/* Post Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-violet rounded-full border-[2px] border-foreground flex items-center justify-center text-primary-foreground font-bold">
                    JD
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">John Doe</span>
                      <BrutalCard color="teal" className="px-2 py-0.5 text-xs font-bold" hoverEffect={false}>Physics</BrutalCard>
                      <BrutalCard color="mint" className="px-2 py-0.5 text-xs font-bold flex items-center gap-1" hoverEffect={false}>
                        <Sparkles className="w-3 h-3" />
                        AI Verified
                      </BrutalCard>
                    </div>
                    <span className="text-sm text-muted-foreground">2 hours ago</span>
                  </div>
                </div>

                {/* Post Title */}
                <h3 className="text-lg font-bold mb-2">Understanding Quantum Entanglement</h3>
                <p className="text-sm text-muted-foreground mb-4">Can someone explain how quantum entanglement works in simple terms? I'm struggling with the concept...</p>

                {/* AI Summary */}
                <BrutalCard color="yellow" className="p-3 mb-4" hoverEffect={false}>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4" />
                    <span className="font-bold text-sm">AI Summary</span>
                  </div>
                  <p className="text-xs">Quantum entanglement is a phenomenon where particles become connected and share states instantly...</p>
                </BrutalCard>

                {/* Comments Preview */}
                <div className="space-y-3 border-t-[2px] border-foreground pt-4">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-pink rounded-full border-[2px] border-foreground flex items-center justify-center text-sm font-bold">
                      SC
                    </div>
                    <div className="flex-1 bg-muted rounded-lg border-[2px] border-foreground p-2">
                      <span className="font-bold text-sm">Sarah Chen</span>
                      <p className="text-xs text-muted-foreground">Great question! Think of it like two coins that always land on opposite sides...</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 ml-6">
                    <div className="w-7 h-7 bg-teal rounded-full border-[2px] border-foreground flex items-center justify-center text-xs font-bold">
                      MW
                    </div>
                    <div className="flex-1 bg-muted rounded-lg border-[2px] border-foreground p-2">
                      <span className="font-bold text-sm">Mike Wilson</span>
                      <p className="text-xs text-muted-foreground">This analogy really helped me understand!</p>
                    </div>
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t-[2px] border-foreground">
                  <div className="flex items-center gap-1 text-sm">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-bold">24</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Trophy className="w-4 h-4 text-yellow" />
                    <span className="font-bold">156</span>
                  </div>
                </div>
              </BrutalCard>
            </div>
          </div>

          {/* Stats - moved below hero */}
          <div className="flex items-center justify-center gap-8 mt-16 flex-wrap">
            <BrutalCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <div className="text-2xl font-bold">50K+</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
              </div>
            </BrutalCard>
            <BrutalCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-teal" />
                <div className="text-left">
                  <div className="text-2xl font-bold">1M+</div>
                  <div className="text-sm text-muted-foreground">Discussions</div>
                </div>
              </div>
            </BrutalCard>
            <BrutalCard className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-pink" />
                <div className="text-left">
                  <div className="text-2xl font-bold">99%</div>
                  <div className="text-sm text-muted-foreground">AI Accuracy</div>
                </div>
              </div>
            </BrutalCard>
          </div>
        </div>
      </section>

      {/* Topic Marquee - 2 Layers with Cards */}
      <section className="py-8 bg-muted border-y-[2px] border-foreground overflow-hidden space-y-4">
        {/* First row - scrolling left */}
        <div className="animate-marquee flex whitespace-nowrap">
          {[...topics.slice(0, 10), ...topics.slice(0, 10)].map((topic, index) => (
            <BrutalCard 
              key={`row1-${index}`} 
              color={(['yellow', 'teal', 'pink', 'coral', 'violet', 'mint'] as const)[index % 6]}
              className="mx-3 px-4 py-2 flex-shrink-0"
              hoverEffect={true}
            >
              <span className="font-bold text-sm whitespace-nowrap">{topic}</span>
            </BrutalCard>
          ))}
        </div>
        
        {/* Second row - scrolling right */}
        <div className="animate-marquee-reverse flex whitespace-nowrap">
          {[...topics.slice(10), ...topics.slice(10)].map((topic, index) => (
            <BrutalCard 
              key={`row2-${index}`} 
              color={(['coral', 'mint', 'violet', 'pink', 'teal', 'yellow'] as const)[index % 6]}
              className="mx-3 px-4 py-2 flex-shrink-0"
              hoverEffect={true}
            >
              <span className="font-bold text-sm whitespace-nowrap">{topic}</span>
            </BrutalCard>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted border-b-[4px] border-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Academiq?</h2>
            <p className="text-xl text-muted-foreground">
              Built for students and educators who demand quality
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <BrutalCard 
                  key={feature.title} 
                  color={feature.color}
                  className="p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-background rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center flex-shrink-0">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-foreground/80">{feature.description}</p>
                    </div>
                  </div>
                </BrutalCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <section id="showcase" className="py-20 px-50 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <BrutalCard color="teal" className="inline-flex items-center gap-2 px-3 py-1 mb-4">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold text-sm">Platform Preview</span>
              </BrutalCard>
              <h2 className="text-4xl font-bold mb-6">
                Connect with peers
                <br />
                <span className="text-primary">easily and efficiently</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our intuitive dashboard gives you everything you need: real-time discussions, 
                AI-verified content, leaderboards, and personalized feeds all in one place.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow rounded-lg border-[2px] border-foreground flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">Realtime Conversations</h4>
                    <p className="text-sm text-muted-foreground">Engage in discussions with students worldwide instantly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-pink rounded-lg border-[2px] border-foreground flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">AI-Powered Insights</h4>
                    <p className="text-sm text-muted-foreground">Get smart summaries and content validation automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal rounded-lg border-[2px] border-foreground flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">Track Your Progress</h4>
                    <p className="text-sm text-muted-foreground">See your ranking and earn badges for contributions</p>
                  </div>
                </div>
              </div>

              <Link to="/signup" className="inline-block mt-8">
                <BrutalButton variant="primary">
                  Explore Dashboard
                  
                </BrutalButton>
              </Link>
            </div>

            {/* Dashboard Preview Mock */}
            <div className="relative">
              <BrutalCard className="p-4 bg-background">
                <div className="bg-muted rounded-lg border-[2px] border-foreground p-4">
                  {/* Mock Dashboard Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-[2px] border-foreground/20">
                    <div className="w-8 h-8 bg-primary rounded-lg border-[2px] border-foreground flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold">Academiq Dashboard</span>
                  </div>
                  
                  {/* Mock Content */}
                  <div className="space-y-3">
                    <div className="bg-yellow rounded-lg border-[2px] border-foreground p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-background rounded-full border-[2px] border-foreground"></div>
                        <span className="font-bold text-sm">New Discussion</span>
                        <span className="ml-auto text-xs bg-background px-2 py-0.5 rounded border border-foreground">AI Verified</span>
                      </div>
                      <div className="h-2 bg-foreground/20 rounded w-3/4"></div>
                    </div>
                    <div className="bg-teal rounded-lg border-[2px] border-foreground p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-background rounded-full border-[2px] border-foreground"></div>
                        <span className="font-bold text-sm">Trending Topic</span>
                      </div>
                      <div className="h-2 bg-foreground/20 rounded w-1/2"></div>
                    </div>
                    <div className="bg-pink rounded-lg border-[2px] border-foreground p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4" />
                        <span className="font-bold text-sm">You earned 50 points!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </BrutalCard>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-coral rounded-xl border-[3px] border-foreground shadow-brutal rotate-12 flex items-center justify-center">
                <Zap className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-violet rounded-lg border-[3px] border-foreground shadow-brutal -rotate-6 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Marquee */}
      <section className="py-6 bg-yellow border-y-[4px] border-foreground overflow-hidden">
        <div className="animate-marquee-reverse flex whitespace-nowrap">
          {[
            "Absolutely fantastic platform!",
            "It's intuitive and very easy to use!",
            "Great platform for learning online",
            "This product is absolutely fantastic",
            "Revolutionary for academic discourse",
            "Best study companion ever!",
            "Changed how I learn forever",
          ].map((text, index) => (
            <span key={index} className="mx-6 font-medium flex items-center gap-2">
              <span className="w-6 h-6 bg-background rounded-full border-[2px] border-foreground flex items-center justify-center text-xs">⭐</span>
              {text}
            </span>
          ))}
          {[
            "Absolutely fantastic platform!",
            "It's intuitive and very easy to use!",
            "Great platform for learning online",
            "This product is absolutely fantastic",
            "Revolutionary for academic discourse",
            "Best study companion ever!",
            "Changed how I learn forever",
          ].map((text, index) => (
            <span key={`dup-${index}`} className="mx-6 font-medium flex items-center gap-2">
              <span className="w-6 h-6 bg-background rounded-full border-[2px] border-foreground flex items-center justify-center text-xs">⭐</span>
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* Developer Team Section */}
      <section id="team" className="py-20 bg-muted border-b-[4px] border-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <BrutalCard color="coral" className="inline-flex items-center gap-2 px-3 py-1 mb-4">
              <Users className="w-4 h-4" />
              <span className="font-bold text-sm">Meet The Team</span>
            </BrutalCard>
            <h2 className="text-4xl font-bold mb-4">Built by Passionate Developers</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our team combines expertise in AI, education, and design to create 
              the best academic platform possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {developers.map((dev) => (
              <BrutalCard key={dev.name} color={dev.color} className="p-6 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 opacity-30" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-background rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center text-xl font-bold">
                    {dev.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{dev.name}</h3>
                    <p className="text-sm opacity-80">{dev.role}</p>
                  </div>
                </div>
                <p className="text-foreground/90 italic">"{dev.quote}"</p>
              </BrutalCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <BrutalCard color="violet" className="p-12 text-center max-w-3xl mx-auto">
            <Sparkles className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready to Level Up?</h2>
            <p className="text-xl opacity-90 mb-8">
              Join thousands of students and educators already using Academiq 
              to enhance their academic journey.
            </p>
            <Link to="/signup">
              <BrutalButton variant="secondary" size="lg">
                Create Free Account
                
              </BrutalButton>
            </Link>
          </BrutalCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-[4px] border-foreground bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg border-[2px] border-foreground shadow-brutal-sm flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Academiq</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Academiq. Built for learners, by learners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
