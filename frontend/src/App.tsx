import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SocketProvider from "@/components/SocketContext"; // already imported
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import axiosInstance from "@/integration/axiosInstance";

import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/protectRoute/protectedRoute";
import PublicRoute from "@/components/protectRoute/publicRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Index from "./pages/Index";
import Peers from "./pages/Peers";
import Leaderboards from "./pages/Leaderboards";
import Interests from "./pages/Interest";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PostDetails from "./pages/PostDetails";
import Notifications from "./pages/Notifications";
import SecretChat from "./pages/SecretChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const noNavbarRoutes = [
    "/",
    "/login",
    "/signup",
    "/onboarding",
    "/acad-chat",
  ];

  const showNavbar = !noNavbarRoutes.includes(location.pathname);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      try {
        const res = await axiosInstance.get("/auth/me");
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch (error) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("user");
        navigate("/");
      }
    };

    restoreSession();
  }, [navigate]);

  return (
    <>
      {showNavbar && <Navbar />}

      <Routes>
        {/* Public Routes */}
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

        {/* Protected Routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />

        <Route
          path="/peers"
          element={
            <ProtectedRoute>
              <Peers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboards"
          element={
            <ProtectedRoute>
              <Leaderboards />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interests"
          element={
            <ProtectedRoute>
              <Interests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/post/:id"
          element={
            <ProtectedRoute>
              <PostDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/open-forum"
          element={
            <ProtectedRoute>
              <SecretChat />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const App = () => {
  if (!googleClientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID in .env");
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* Wrap AppRoutes with SocketProvider */}
            <SocketProvider>
              <AppRoutes />
            </SocketProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
