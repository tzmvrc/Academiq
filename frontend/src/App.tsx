import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import Navbar from "@/components/Navbar";
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

const Layout = () => {
  const location = useLocation();
  const noNavbarRoutes = [
    "/",
    "/login",
    "/signup",
    "/onboarding",
    "/secret-chat",
  ];
  const showNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/feed" element={<Index />} />
        <Route path="/peers" element={<Peers />} />
        <Route path="/leaderboards" element={<Leaderboards />} />
        <Route path="/interests" element={<Interests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/post/:id" element={<PostDetails />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/secret-chat" element={<SecretChat />} />
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
            <Layout />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;