import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — X-Wing League" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="max-w-sm mx-auto py-12 space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          We've sent a password reset link to <strong>{email}</strong>. Click the
          link in that email to choose a new password.
        </p>
        <p className="text-sm text-muted-foreground">
          Back to{" "}
          <Link to="/login" className="underline">
            sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-12 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Forgot password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        Remembered it?{" "}
        <Link to="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
