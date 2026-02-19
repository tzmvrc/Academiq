import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/components/ui/use-toast";

export const useGoogleAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",

    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);

        const code = tokenResponse.code;

        const response = await axiosInstance.post("/auth/google", { code });
        const { token, user } = response.data;

        // ✅ store session
        localStorage.setItem("userToken", token);
        localStorage.setItem("user", JSON.stringify(user));

        // ✅ redirect
        navigate("/dashboard", { replace: true });

        toast({
          title: "Login Successful",
          description: `Welcome ${user.name}!`,
          variant: "success",
        });
      } catch (err: any) {
        console.error("Google auth failed:", err);

        // 🔥 handle invalid school email
        if (err.response?.status === 400) {
          toast({
            title: "Invalid School Email",
            description: "You must use a valid school email to log in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Google Login Failed",
            description: "An error occurred. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
  });

  return {
    loginWithGoogle,
    loading,
  };
};
