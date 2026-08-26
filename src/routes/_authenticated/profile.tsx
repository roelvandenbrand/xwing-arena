import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import md5 from "blueimp-md5";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { Monitor, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — X-Wing League" }] }),
  component: ProfilePage,
});

function gravatarUrl(email: string, size = 160) {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const email = user?.email ?? "";

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pw !== pw2) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw("");
    setPw2("");
    toast.success("Password updated");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          {email && (
            <img
              src={gravatarUrl(email)}
              alt="Profile"
              className="h-20 w-20 rounded-full border"
            />
          )}
          <div className="space-y-1">
            <p className="font-medium">{email}</p>
            <p className="text-xs text-muted-foreground">
              Avatar from{" "}
              <a href="https://gravatar.com" target="_blank" rel="noreferrer" className="underline">
                Gravatar
              </a>
              . Change it there to update here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pw2">Confirm new password</Label>
              <Input
                id="pw2"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm">
        <Link to="/collection" className="text-muted-foreground hover:underline">
          ← Back to Collection
        </Link>
      </p>
    </div>
  );
}