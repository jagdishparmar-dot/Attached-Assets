import React, { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(phone.trim(), password);
      if (result === "ok") {
        setLocation("/dashboard");
        return;
      }
      if (result === "invalid") {
        setError("Invalid phone number or password.");
      } else if (result === "forbidden") {
        setError("This account is not authorized for admin access.");
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Brand atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#FFF8F5]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,60,0,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,60,0,0.08),_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <BrandLogo
          size="xl"
          stacked
          subtitle="Supply Chain · Distribution Management"
        />

        <Card className="border-border/70 shadow-lg shadow-orange-950/5">
          <CardHeader className="space-y-1.5 pb-4 text-center sm:text-left">
            <CardTitle className="text-xl tracking-tight">
              Sign in to Admin Console
            </CardTitle>
            <CardDescription>
              Use your supervisor phone number and password to manage deliveries,
              fleet, and workforce.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="username"
                  inputMode="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && (
                <p
                  className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Coldverse Supply Chain Pvt. Ltd.
          <span className="mx-1.5 text-border">·</span>
          Authorized supervisors only
        </p>
      </div>
    </div>
  );
}
