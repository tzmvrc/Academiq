import { SideNav } from "../components/ui/SideNav";
import { Logo } from "../components/branding/Logo";
import { Outlet } from "react-router-dom";
export const DashboardLayout = () => (
  <div className="min-h-screen bg-paper text-ink">
    <header className="border-b-4 border-ink bg-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Logo />
        <button className="font-bold">Logout</button>
      </div>
    </header>
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
      <SideNav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  </div>
);