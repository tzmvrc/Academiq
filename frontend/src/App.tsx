import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import axiosInstance from "@/integration/axiosInstance";

import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Signup } from "./pages/SignUp";
import { Dashboard } from "./pages/Dashboard";
import { PostDetail } from "./pages/PostDetail";
import { UserProfile } from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./components/protectRoute/protectedRoute";
import PublicRoute from "./components/protectRoute/publicRoute";

const queryClient = new QueryClient();

// ========================================
// Session restore wrapper
// ========================================
const AppRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      try {
        const res = await axiosInstance.get("/auth/me");
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch {
        // token expired → force logout
        localStorage.removeItem("userToken");
        localStorage.removeItem("user");
        navigate("/");
      }
    };

    restoreSession();
  }, [navigate]);

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/post/:postId"
        element={
          <ProtectedRoute>
            <PostDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/:userId"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// ========================================
// Main App
// ========================================
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
