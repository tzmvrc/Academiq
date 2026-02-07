import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import axiosInstance from "@/integration/axiosInstance";

export const useGoogleAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",

    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);

        const code = tokenResponse.code;

        const response = await axiosInstance.post("/auth/google", {
          code,
        });

        const { token, user } = response.data;

        // ✅ store session
        localStorage.setItem("userToken", token);
        localStorage.setItem("user", JSON.stringify(user));

        // ✅ redirect
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Google auth failed:", err);
        alert("Google login failed");
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
