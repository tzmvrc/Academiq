import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/integration/axiosInstance";

export const useLogin = () => {
  const navigate = useNavigate();
  const [useloading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const manualLogin = async (email: string, password: string) => {
    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      setMessage(res.data.message);

      // ✅ Store token and user
      if (res.data.token && res.data.user) {
        localStorage.setItem("userToken", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        navigate("/dashboard", { replace: true });
      }

      return {
        success: true,
        message: res.data.message,
      };
    } catch (err: any) {
      const title = err.response?.data?.title;
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed";

      setMessage(msg);

      return {
        success: false,
        title,
        message: msg,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    useloading,
    message,
    manualLogin,
  };
};
