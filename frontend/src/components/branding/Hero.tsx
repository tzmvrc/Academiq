import { Button } from "../ui/button";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="min-h-[50vh] flex flex-col gap-6 justify-center items-start">
      <h2 className="text-5xl md:text-7xl font-black leading-tight">
        The AI-powered <br /> academic forum.
      </h2>
      <p className="text-lg md:text-xl font-semibold max-w-xl">
        Collaborate, discuss, and validate your academic content with peers and AI assistance.
      </p>
      <div className="flex gap-4">
        <Link to="/signup">
          <Button>Sign Up</Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary">Login</Button>
        </Link>
      </div>
    </section>
  );
}
