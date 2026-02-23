
import { toast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import axiosInstance from "@/integration/axiosInstance";


interface User {
  id: string;
  email: string;
  name: string;
  profile_url?: string;
  role: string;
  school?: any;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        setUser(res.data);
      } catch (err: any) {
        console.error("Failed to fetch user:", err);
        toast({ title: "Failed to get user session", variant: "destructive" });
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
};
