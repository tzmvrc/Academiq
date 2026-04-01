import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [name, setName] = useState("Alex Kim");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [aiSummaries, setAiSummaries] = useState(true);

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-8">Settings</h1>

        {/* Profile Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Profile</h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 font-body"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">University</label>
              <input
                type="text"
                defaultValue="Stanford University"
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 font-body"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Notifications</h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {[
              { label: "Email notifications", value: emailNotifs, setter: setEmailNotifs },
              { label: "Push notifications", value: pushNotifs, setter: setPushNotifs },
              { label: "AI summary alerts", value: aiSummaries, setter: setAiSummaries },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{item.label}</span>
                <button
                  onClick={() => item.setter(!item.value)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${item.value ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${item.value ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Privacy</h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Public profile</p>
                <p className="text-xs text-muted-foreground">Allow others to see your profile and contributions</p>
              </div>
              <button className="relative h-6 w-11 rounded-full bg-primary transition-colors">
                <span className="absolute top-0.5 left-[22px] h-5 w-5 rounded-full bg-card shadow transition-transform" />
              </button>
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
      </motion.div>
    </div>
  );
};

export default Settings;
