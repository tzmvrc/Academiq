import { AuthCard } from "../components/auth/AuthCard";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/button";
import { GoogleButton } from "../components/auth/GoogleButton";
import { Link } from "react-router-dom";

export function Login() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <AuthCard title="Welcome Back">
        <form className="flex flex-col gap-4">
          <Input type="email" placeholder="Email" required />
          <Input type="password" placeholder="Password" required />
          <Button type="submit">Login</Button>
        </form>

        <div className="my-4 text-center font-bold">OR</div>

        <GoogleButton
          className="w-full"
          onClick={() => alert("Google OAuth – configure CLIENT_ID")}
        />

        <p className="text-sm font-semibold mt-4">
          Need an account?{" "}
          <Link to="/signup" className="underline">
            Sign Up
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
