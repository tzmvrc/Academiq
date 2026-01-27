import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/button";

export function ProfilePanel() {
  return (
    <Card>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Avatar */}
        <Avatar size="lg" />

        {/* User Info */}
        <div className="flex-1">
          <h3 className="font-black text-2xl">John Doe</h3>
          <p className="font-semibold">Software Engineer</p>
          <p className="mt-2 text-sm text-gray-600">
            Passionate about building web applications and AI tools.
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-3">
            <Button>Edit Profile</Button>
            <Button variant="secondary">Settings</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
