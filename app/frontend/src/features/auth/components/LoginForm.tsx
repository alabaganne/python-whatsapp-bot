"use client";

import { Button } from "@/shared/ui/components/button";
import { Input } from "@/shared/ui/components/input";
import { Label } from "@/shared/ui/components/label";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("Logged in successfully");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleLogin}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </div>
      </form>
      <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
