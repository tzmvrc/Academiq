import { AuthCard } from "../components/auth/AuthCard";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/button";
import { GoogleButton } from "../components/auth/GoogleButton";
import { Link } from "react-router-dom";

export function SignUp() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <AuthCard title="Create Account">
        <form className="flex flex-col gap-4">
          <Input placeholder="Full Name" required />
          <Input type="email" placeholder="Email" required />
          <Input type="password" placeholder="Password" required />

          <label className="font-bold">Avatar</label>
          <input
            type="file"
            accept="image/*"
            className="border-3 border-ink p-2 shadow-brutal"
          />

          <Button type="submit">Sign Up</Button>
        </form>

        <div className="my-4 text-center font-bold">OR</div>

        <GoogleButton
          className="w-full"
          onClick={() => alert("Google OAuth – configure CLIENT_ID")}
        />

        <p className="text-sm font-semibold mt-4">
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Login
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
