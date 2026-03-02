import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/integration/axiosInstance";
import { Title } from "@radix-ui/react-toast";

export const useSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 1️⃣ Send OTP
  const sendOTP = async (email: string) => {
    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/send-otp", { email });
      setMessage(res.data.message);

      return { success: true, title: res.data.title, message: res.data.message };
      
    } catch (err: any) {
      return { success: false, title: err.response?.data?.title, message: err.response?.data?.message };
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ Verify OTP
  const verifyOTP = async (email: string, otp: string) => {
    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/verify-otp", { email, otp });
      setMessage(res.data.message);

      return { success: true, message: res.data.message, title: res.data.title };
    } catch (err: any) {

      return { success: false, message: err.response?.data?.message, title: err.response?.data?.title };
    } finally {
      setLoading(false);
    }
  };

  // 3️⃣ Complete Signup
  const completeSignup = async (email: string, name: string, password: string) => {
    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/complete", { email, name, password });
      setMessage(res.data.message);

      // ✅ store token and user
      if (res.data.token && res.data.user) {
        localStorage.setItem("userToken", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/onboarding", { replace: true });
      }

      return { success: true, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.error || "Signup failed";
      setMessage(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    message,
    sendOTP,
    verifyOTP,
    completeSignup,
  };
};
