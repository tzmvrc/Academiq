import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../components/ui/Icon.png";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGoogleAuth } from "@/components/auth/useGoogleAuth";
import { useSignup } from "@/components/auth/useSignup";

const Signup = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loading: googleLoading } = useGoogleAuth();
  const { sendOTP, verifyOTP, completeSignup } = useSignup();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [showNameConfirmModal, setShowNameConfirmModal] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password validation helper
  const isValidPassword = (pwd: string): boolean => {
    return pwd.length >= 8 && /\d/.test(pwd);
  };

  const getPasswordErrors = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/\d/.test(pwd)) errors.push("At least one number");
    return errors;
  };

  useEffect(() => {
    if (step === 2) otpRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    const blockedDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
    ];
    const domain = email.split("@")[1]?.toLowerCase();

    if (!domain) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (blockedDomains.includes(domain)) {
      toast({
        title: "Invalid email",
        description: "Please use your school email, not a personal email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(email);

      toast({
        title: result.title,
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

      if (!result.success) return;

      setResendTimer(60);
      setStep(2);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast({
          title: "Email already registered",
          description:
            "This email is already registered. Please log in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send OTP",
          description: "Something went wrong while sending the OTP.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    if (value.length > 1) {
      const digits = value
        .replace(/\D/g, "")
        .slice(0, 6 - index)
        .split("");
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);

      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const numbers = pastedData.replace(/\D/g, "").slice(0, 6);

    const newOtp = ["", "", "", "", "", ""];
    numbers.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });

    setOtp(newOtp);
    otpRefs.current[Math.min(numbers.length, 5)]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 6) {
      toast({
        title: "Incomplete OTP",
        description: "Please enter the full 6-digit code.",
        variant: "destructive",
      });

      otp.forEach((digit, index) => {
        if (!digit) {
          otpRefs.current[index]?.classList.add("border-red-500");
          setTimeout(() => {
            otpRefs.current[index]?.classList.remove("border-red-500");
          }, 1000);
        }
      });

      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(email, code);

      if (result.success) {
        toast({
          title: result.title,
          description: result.message,
          variant: "default",
        });
        setStep(3);
      } else {
        toast({
          title: result.title,
          description: result.message,
          variant: "destructive",
        });

        otpRefs.current.forEach((ref) => {
          ref?.classList.add("border-red-500");
          setTimeout(() => {
            ref?.classList.remove("border-red-500");
          }, 1000);
        });
      }
    } catch {
      toast({
        title: "OTP verification failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      const result = await sendOTP(email);

      toast({
        title: result?.title || "OTP resent",
        description:
          result?.message ||
          `A new verification code has been sent to ${email}.`,
        variant: result?.success === false ? "destructive" : "default",
      });

      if (result?.success === false) return;

      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60);
      otpRefs.current[0]?.focus();
    } catch {
      toast({
        title: "Failed to resend OTP",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    // First click: show confirmation modal
    if (!isNameConfirmed) {
      setShowNameConfirmModal(true);
      return;
    }

    if (!isValidPassword(password)) {
      const errors = getPasswordErrors(password);
      toast({
        title: "Weak password",
        description: `Password must have: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms not agreed",
        description: "Please agree to the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await completeSignup(email, fullName, password);

      toast({
        title: "Account created!",
        description: "Welcome to Academiq. Let's pick your interests.",
        variant: "default",
      });

      navigate("/onboarding");
    } catch {
      toast({
        title: "Signup failed",
        description: "Something went wrong while creating your account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = `${(step / 3) * 100}%`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 relative overflow-hidden">
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      step >= s
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                    {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {s === 1 ? "Email" : s === 2 ? "Verify" : "Details"}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: progressWidth }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-xl font-heading font-bold text-foreground text-center mb-1">
                  Create your account
                </h1>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Enter your school email to get started
                </p>

                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors mb-4 disabled:opacity-50">
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
                  {googleLoading ? "Loading..." : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <form onSubmit={handleStep1} className="space-y-4">
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
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {loading ? "Sending OTP..." : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-xl font-heading font-bold text-foreground text-center mb-1">
                  Verify your email
                </h1>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Enter the 6-digit code sent to{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>

                <form onSubmit={handleStep2} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onPaste={handleOtpPaste}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="h-12 w-11 rounded-lg border border-border bg-secondary/30 text-center text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-body"
                      />
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 px-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading || otp.join("").length !== 6}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {loading ? "Verifying..." : "Verify"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="w-full text-center text-sm text-primary hover:underline mt-4 disabled:text-muted-foreground disabled:no-underline">
                  {resendTimer > 0
                    ? `Resend code in ${resendTimer}s`
                    : "Resend code"}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-xl font-heading font-bold text-foreground text-center mb-1">
                  Complete your profile
                </h1>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Just a few more details
                </p>

                <form onSubmit={handleStep3} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        // Reset confirmation when user edits name
                        if (isNameConfirmed) {
                          setIsNameConfirmed(false);
                        }
                      }}
                      placeholder="Juan Dela Cruz"
                      className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 font-body"
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                      ⚠️ Your name cannot be changed after signup. Please make
                      sure it is entered correctly.
                    </p>
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
                        className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-body transition-colors ${
                          password
                            ? isValidPassword(password)
                              ? "border-green-500/50 bg-green-500/5 focus:border-green-500"
                              : "border-red-500/50 bg-red-500/5 focus:border-red-500"
                            : "border-border bg-secondary/30 focus:border-primary/30"
                        }`}
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
                    {password && (
                      <div className="mt-2 space-y-1">
                        {isValidPassword(password) ? (
                          <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                            ✓ Password is valid
                          </p>
                        ) : (
                          <div className="text-xs text-red-600 dark:text-red-500">
                            <p className="font-medium mb-1">
                              ⚠️ Password requirements:
                            </p>
                            <ul className="space-y-0.5 ml-2">
                              <li
                                className={
                                  password.length >= 8
                                    ? "line-through text-green-600 dark:text-green-500"
                                    : ""
                                }>
                                • At least 8 characters{" "}
                                {password.length >= 8 && "✓"}
                              </li>
                              <li
                                className={
                                  /\d/.test(password)
                                    ? "line-through text-green-600 dark:text-green-500"
                                    : ""
                                }>
                                • At least one number{" "}
                                {/\d/.test(password) && "✓"}
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-body transition-colors ${
                        confirmPassword
                          ? password === confirmPassword
                            ? "border-green-500/50 bg-green-500/5 focus:border-green-500"
                            : "border-red-500/50 bg-red-500/5 focus:border-red-500"
                          : "border-border bg-secondary/30 focus:border-primary/30"
                      }`}
                    />
                  </div>

                  {password &&
                    confirmPassword &&
                    password !== confirmPassword && (
                      <div className="text-red-600 dark:text-red-500 text-sm text-center border border-red-500/40 bg-red-500/10 p-2 rounded-lg">
                        Passwords don't match
                      </div>
                    )}

                  {password &&
                    confirmPassword &&
                    password === confirmPassword &&
                    isValidPassword(password) && (
                      <div className="text-green-600 dark:text-green-500 text-sm text-center border border-green-500/40 bg-green-500/10 p-2 rounded-lg">
                         Passwords match and are valid
                      </div>
                    )}

                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <a href="#" className="text-primary hover:underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(2);
                        setIsNameConfirmed(false);
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 px-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !isValidPassword(password) ||
                        password !== confirmPassword ||
                        !agreedToTerms
                      }
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                        isNameConfirmed
                          ? "bg-green-600 text-white hover:bg-green-700 disabled:hover:bg-green-600"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:hover:bg-primary"
                      }`}>
                      {loading
                        ? "Creating Account..."
                        : isNameConfirmed
                          ? "Create Account"
                          : "Create Account"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>

      {/* Name Confirmation Modal */}
      <AnimatePresence>
        {showNameConfirmModal && (
          <motion.div
            key="name-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-xl border border-border bg-card p-6 max-w-sm w-full">
              <h2 className="text-lg font-heading font-bold text-foreground mb-2">
                Confirm Your Name
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure your name is correct? You won't be able to change
                it later.
              </p>

              <div className="bg-secondary/50 rounded-lg p-3 mb-6">
                <p className="text-xs text-muted-foreground">Your name:</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {fullName}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNameConfirmModal(false)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNameConfirmed(true);
                    setShowNameConfirmModal(false);
                  }}
                  className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Signup;
