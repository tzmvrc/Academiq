import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGoogleAuth } from "@/components/auth/useGoogleAuth";
import { useLogin } from "@/components/auth/useLogin";
import Icon from "../components/ui/Icon.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { manualLogin, useloading } = useLogin();
  const { loginWithGoogle, loading } = useGoogleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password.",
        variant: "destructive",
      });
      return;
    }

    const result = await manualLogin(email, password);

    if (!result.success) {
      toast({
        title: result.title || "Login Failed",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src={Icon}
          alt=""
          className="h-screen w-screen opacity-5 object-contain"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src={Icon} alt="Academiq Logo" className="h-15 w-15" />
          <span className="text-2xl font-heading font-bold text-foreground">
            Academiq
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-xl font-heading font-bold text-foreground text-center mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Sign in to your academic community
          </p>

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors mb-4 disabled:opacity-60 disabled:cursor-not-allowed">
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
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 font-body"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 font-body"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                {/* <input type="checkbox" className="rounded border-border" />
                Remember me */}
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={useloading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {useloading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
