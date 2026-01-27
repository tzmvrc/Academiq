import { Card } from "../ui/Card";
import { Button } from "../ui/button";

const posts = [
  { id: 1, title: "Neural networks basics", summary: "AI validated ✔", votes: 42 },
  { id: 2, title: "History of calculus", summary: "AI summary available", votes: 38 },
];

export function FeedPanel() {
  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <Card key={post.id}>
          <h4 className="font-bold text-xl">{post.title}</h4>
          <p className="font-medium my-2">{post.summary}</p>
          <div className="flex items-center justify-between">
            <span className="font-bold">↑ {post.votes}</span>
            <Button>View</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
