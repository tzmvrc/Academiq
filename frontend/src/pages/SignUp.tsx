import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalInput } from "@/components/ui/BrutalInput";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Rocket,
} from "lucide-react";
import { useGoogleAuth } from "@/components/auth/useGoogleAuth";
import { useSignup } from "@/components/auth/useSignup";
import { toast } from "@/components/ui/use-toast";

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loading: googleLoading } = useGoogleAuth();
  const { sendOTP, verifyOTP, completeSignup, message } = useSignup();

  // Step state: 1 = Email, 2 = OTP, 3 = Profile
  const [currentStep, setCurrentStep] = useState(1);

  // Form fields
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Loading and timer states
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formComplete, setFormComplete] = useState(false);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  // Refs for OTP inputs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first OTP input
  useEffect(() => {
    if (currentStep === 2 && otpRefs.current[0]) {
      otpRefs.current[0]?.focus();
    }
  }, [currentStep]);

  // Check if form is complete
  useEffect(() => {
    const isFormValid =
      name.trim() !== "" &&
      password !== "" &&
      confirmPassword !== "" &&
      password === confirmPassword &&
      agreedToTerms;
    setFormComplete(isFormValid);
  }, [name, password, confirmPassword, agreedToTerms]);

  // Show password validation when both fields have content
  useEffect(() => {
    if (password && confirmPassword) {
      setShowPasswordValidation(true);
    } else {
      setShowPasswordValidation(false);
    }
  }, [password, confirmPassword]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const numbers = pastedData.replace(/\D/g, "").slice(0, 6);

    const newOtp = [...otp];
    numbers.split("").forEach((char, index) => {
      if (index < 6) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    // Focus the next empty input or the last one
    const nextIndex = Math.min(numbers.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Handle OTP key down (for backspace navigation)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Mock sendOTP function

const handleEmailSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) return;
  setLoading(true);

  // ----------------------------
  // FRONTEND DOMAIN CHECK (optional, UX only)
  // ----------------------------
  const blockedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) {
    toast({
      title: "Invalid Email",
      description: "Please enter a valid email address.",
      variant: "destructive",
    });
    setLoading(false);
    return;
  }

  if (blockedDomains.includes(domain)) {
    toast({
      title: "Invalid Email",
      description: "Please use your school email (not personal email).",
      variant: "destructive",
    });
    setLoading(false);
    return;
  }

  try {
    // ----------------------------
    // SEND OTP (backend will do full validation)
    // ----------------------------
    const result = await sendOTP(email);

    toast({
      title: result.title,
      description: result.message,
      variant: result.success ? "success" : "destructive",
    });

    if (!result.success) return;

    // start resend timer & move to next step
    setResendTimer(60);
    setCurrentStep(2);
  } catch (err: any) {
    // handle specific 409 Conflict (email exists)
    if (err.response?.status === 409) {
      toast({
        title: "Email Already Registered",
        description: "This email is already registered. Please log in.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Failed to Send OTP",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    }
  } finally {
    setLoading(false);
  }
};


  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      console.log("Invalid OTP", "Please enter a 6-digit verification code.");
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      // Highlight empty boxes
      otp.forEach((digit, index) => {
        if (!digit) {
          otpRefs.current[index]?.classList.add(
            "animate-pulse",
            "border-red-500",
          );
          setTimeout(() => {
            otpRefs.current[index]?.classList.remove(
              "animate-pulse",
              "border-red-500",
            );
          }, 1000);
        }
      });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(email, otpString);
      if (result.success) {
       toast({
          title: result.title,
          description: result.message,
          variant: "success",
        });
        setCurrentStep(3);
      } else {
        
        toast({
          title: result.title,
          description: result.message,
          variant: "destructive",
        });
        // Shake animation for all boxes
        otpRefs.current.forEach((ref) => {
          ref?.classList.add("animate-shake", "border-red-500");
          setTimeout(() => {
            ref?.classList.remove("animate-shake", "border-red-500");
          }, 1000);
        });
      }
    } catch (error) {
      console.log("Error", "Failed to verify OTP. Please try again.");
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      await sendOTP(email);
      console.log(
        "OTP Resent!",
        `A new verification code has been sent to ${email}`,
      );
      toast({
        title: "OTP Resent",
        description: `A new verification code has been sent to ${email}`,
      });
      setResendTimer(60);
      // Clear OTP fields
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (error) {
      console.log("Error", "Failed to resend OTP. Please try again.");
    }
    setLoading(false);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      console.log(
        "Passwords don't match",
        "Please make sure your passwords match.",
      );
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (!agreedToTerms) {
      console.log(
        "Terms Required",
        "Please agree to the Terms of Service and Privacy Policy.",
      );
      toast({
        title: "Terms Not Agreed",
        description: "Please agree to the Terms of Service and Privacy Policy.",
      });
      return;
    }

    setLoading(true);
    completeSignup(email, name, password);
    await new Promise((resolve) => setTimeout(resolve, 1000));
 
    toast({
      title: "Account Created!",
      description:
        "Welcome to Academiq! Your account has been created successfully.",
      variant: "success",
    });
    navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-10 right-20 w-36 h-36 bg-coral rounded-full border-[3px] border-foreground opacity-30" />
      <div className="absolute bottom-10 left-20 w-28 h-28 bg-mint rounded-full border-[3px] border-foreground opacity-30" />
      <div className="absolute top-1/3 left-10 w-24 h-24 bg-primary rounded-full border-[3px] border-foreground opacity-30" />

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-foreground font-semibold mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <BrutalCard className="p-8 overflow-hidden">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-primary rounded-xl border-[3px] border-foreground shadow-brutal flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold">Academiq</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Join Academiq</h1>
          <p className="text-muted-foreground text-center mb-4">
            {currentStep === 1 &&
              "Create your account and start learning today"}
            {currentStep === 2 &&
              "Enter the verification code sent to your email"}
            {currentStep === 3 && "Complete your profile setup"}
          </p>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full border-[2px] border-foreground transition-all duration-300 ${
                  currentStep >= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step Content - Adjusted height for Step 3 */}
          <div
            className={`relative ${
              currentStep === 3
                ? showPasswordValidation
                  ? "min-h-[435px]"
                  : "min-h-[380px]"
                : "min-h-[280px]"
            }`}
          >
            {/* Step 1: Email */}
            {currentStep === 1 && (
              <div className="absolute inset-0">
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <BrutalInput
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>

                  <BrutalButton
                    type="submit"
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Continue"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </BrutalButton>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-[2px] bg-foreground/20" />
                  <span className="text-sm font-medium text-muted-foreground">
                    or
                  </span>
                  <div className="flex-1 h-[2px] bg-foreground/20" />
                </div>

                {/* Google OAuth */}
                <BrutalButton
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={loginWithGoogle}
                  disabled={googleLoading}
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
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
                  <span className="leading-none">Continue with Google</span>
                </BrutalButton>

                {/* Login Link */}
                <p className="text-center mt-6 text-sm">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === 2 && (
              <div className="absolute inset-0">
                <form onSubmit={handleOTPVerify} className="space-y-5">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="font-semibold break-all">{email}</p>
                  </div>

                  <div className="flex justify-center">
                    <div
                      className="flex gap-2"
                      onClick={() => otpRefs.current[0]?.focus()}
                    >
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) =>
                            handleOtpChange(index, e.target.value)
                          }
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          className="w-12 h-12 border-[3px] border-foreground rounded-lg shadow-brutal-sm text-lg font-bold text-center focus:border-primary focus:outline-none transition-colors"
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground mb-2">
                    Type or paste your 6-digit code
                  </div>

                  <BrutalButton
                    type="submit"
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                    disabled={loading || otp.join("").length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </BrutalButton>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || loading}
                      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                        resendTimer > 0
                          ? "text-muted-foreground cursor-not-allowed"
                          : "text-primary hover:underline"
                      }`}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                      />
                      {resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : "Resend Code"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to email
                  </button>
                </form>
              </div>
            )}

            {/* Step 3: Profile Details - Taller section */}
            {currentStep === 3 && (
              <div className="absolute inset-0">
                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <BrutalInput
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <BrutalInput
                      type="password"
                      placeholder="Password (min. 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <BrutalInput
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>

                  {password &&
                    confirmPassword &&
                    password !== confirmPassword && (
                      <div className="text-red-500 text-sm text-center animate-pulse border-2 border-red-500 bg-red-50 p-2 rounded-lg">
                        ✗ Passwords don't match
                      </div>
                    )}

                  {password &&
                    confirmPassword &&
                    password === confirmPassword &&
                    password.length >= 8 && (
                      <div className="text-green-600 text-sm text-center flex items-center justify-center gap-2 border-2 border-green-500 bg-green-50 p-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" /> Passwords match
                      </div>
                    )}

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-1 border-2 border-foreground rounded cursor-pointer hover:border-primary transition-colors"
                      required
                    />
                    <span className="text-sm text-muted-foreground mt-0.5">
                      I agree to the{" "}
                      <a
                        href="#"
                        className="font-semibold text-primary hover:underline"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className="font-semibold text-primary hover:underline"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </div>

                  {/* Spacer to push button down */}
                  <div className="h-1"></div>

                  {/* Neubrutalism Submit Button - Centered and visible */}
                  <div className="mt-0">
                    <button
                      type="submit"
                      disabled={loading || !formComplete}
                      className={`
                        w-full h-16
                        border-[3px] border-foreground
                        rounded-xl
                        font-bold text-lg
                        flex items-center justify-center gap-3
                        transition-all duration-200
                        active:translate-y-2 active:shadow-none
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0
                        ${
                          formComplete
                            ? "bg-primary text-primary-foreground shadow-brutal hover:shadow-brutal-lg hover:scale-[1.02]"
                            : "bg-muted text-muted-foreground shadow-brutal-sm"
                        }
                      `}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-6 h-6" />
                          LAUNCH MY ACADEMIQ ACCOUNT
                        </>
                      )}
                    </button>

                    <div className="text-center mt-2 text-xs text-muted-foreground">
                      {formComplete
                        ? "Ready to launch! 🚀"
                        : "Complete all fields to continue"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 mt-3"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to verification
                  </button>
                </form>
              </div>
            )}
          </div>
        </BrutalCard>
      </div>
    </div>
  );
};
