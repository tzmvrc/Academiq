import { Card } from "../ui/Card";
const topics = ["Machine Learning", "Climate Modeling", "Linear Algebra"];
export const InterestPanel = () => (
  <div className="flex flex-col gap-4">
    <h3 className="font-black text-2xl">Recommended for you</h3>
    {topics.map((t) => (
      <Card key={t}>
        <h4 className="font-bold">{t}</h4>
        <p className="text-sm font-medium mt-1">AI curated posts inside →</p>
      </Card>
    ))}
  </div>
);
