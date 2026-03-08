import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  field: string;
  university: string;
  score: number;
}

type Category = "global" | "school" | "schools" | "country";

const categories: { key: Category; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "school", label: "Your School" },
  { key: "schools", label: "Top Schools" },
  { key: "country", label: "By Country" },
];

const globalLeaders: LeaderboardEntry[] = [
  { rank: 1, name: "Dr. Sarah Chen", field: "Machine Learning", university: "MIT", score: 4820 },
  { rank: 2, name: "Dr. Emily Zhang", field: "NLP", university: "Stanford", score: 4150 },
  { rank: 3, name: "Prof. James Rivera", field: "Bioethics", university: "Harvard", score: 3950 },
  { rank: 4, name: "Dr. Anika Patel", field: "Quantum Computing", university: "Caltech", score: 3640 },
  { rank: 5, name: "Prof. Michael Torres", field: "Biostatistics", university: "Johns Hopkins", score: 3210 },
  { rank: 6, name: "Prof. Yuki Tanaka", field: "Robotics", university: "U of Tokyo", score: 3080 },
  { rank: 7, name: "Lina Kovacs", field: "PL Theory", university: "ETH Zürich", score: 2870 },
  { rank: 8, name: "Dr. Ricardo Almeida", field: "Economics", university: "LSE", score: 2590 },
];

const schoolLeaders: LeaderboardEntry[] = [
  { rank: 1, name: "Alex Kim", field: "Computer Science", university: "Stanford", score: 2340 },
  { rank: 2, name: "Dr. Emily Zhang", field: "NLP", university: "Stanford", score: 4150 },
  { rank: 3, name: "Maria Lopez", field: "AI Ethics", university: "Stanford", score: 1980 },
  { rank: 4, name: "David Park", field: "Systems", university: "Stanford", score: 1720 },
];

const topSchools = [
  { rank: 1, name: "MIT", field: "Cambridge, MA", university: "", score: 48200 },
  { rank: 2, name: "Stanford University", field: "Stanford, CA", university: "", score: 42100 },
  { rank: 3, name: "Harvard University", field: "Cambridge, MA", university: "", score: 38500 },
  { rank: 4, name: "ETH Zürich", field: "Zürich, Switzerland", university: "", score: 35800 },
  { rank: 5, name: "Caltech", field: "Pasadena, CA", university: "", score: 32100 },
];

const countryLeaders = [
  { rank: 1, name: "United States", field: "1,245 contributors", university: "", score: 156800 },
  { rank: 2, name: "United Kingdom", field: "432 contributors", university: "", score: 67500 },
  { rank: 3, name: "Germany", field: "389 contributors", university: "", score: 54200 },
  { rank: 4, name: "Japan", field: "312 contributors", university: "", score: 48100 },
  { rank: 5, name: "Switzerland", field: "198 contributors", university: "", score: 42300 },
];

const dataMap: Record<Category, typeof globalLeaders> = {
  global: globalLeaders,
  school: schoolLeaders,
  schools: topSchools,
  country: countryLeaders,
};

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-accent" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (rank === 3) return <Award className="h-5 w-5 text-primary" />;
  return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{rank}</span>;
};

const Leaderboards = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("global");
  const leaders = dataMap[activeCategory];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-accent" />
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Leaderboards</h1>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Top contributors ranked by academic reputation and verified contributions.</p>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 sm:space-y-3">
        {leaders.map((leader, i) => (
          <motion.div
            key={`${activeCategory}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className={`flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 transition-all hover:shadow-md hover:border-primary/10 ${
              leader.rank <= 3 ? "border-accent/20" : ""
            }`}
          >
            <div className="flex items-center justify-center w-6 sm:w-8 shrink-0">
              <RankIcon rank={leader.rank} />
            </div>

            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-semibold text-primary">
                {leader.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-foreground text-sm truncate">{leader.name}</p>
              <p className="text-xs text-muted-foreground truncate">{leader.field}{leader.university ? ` · ${leader.university}` : ""}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="font-semibold text-foreground text-sm">{leader.score.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{activeCategory === "schools" || activeCategory === "country" ? "Total" : "Rep"}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboards;
