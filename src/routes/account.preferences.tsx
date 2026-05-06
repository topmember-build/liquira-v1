import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export const Route = createFileRoute("/account/preferences")({
  component: PreferencesPage,
});

type Profile = {
  id: string;
  display_name: string | null;
  default_slippage_bps: number;
  preferred_chain: string;
  theme: string;
  display_currency: string;
  notify_swap_confirmed: boolean;
  notify_swap_failed: boolean;
  notify_schedule_run: boolean;
  notify_prefs_changed: boolean;
  email_notifications: boolean;
};

function PreferencesPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { setTheme: applyTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) toast.error(error.message);
        if (!data) {
          // Backfill if signup pre-dated the trigger
          const { data: created } = await supabase
            .from("profiles")
            .insert({ id: user.id, display_name: user.email?.split("@")[0] ?? null })
            .select()
            .single();
          setProfile(created as Profile);
        } else {
          setProfile(data as Profile);
        }
        setLoading(false);
      });
  }, [user?.id]);

  const save = async () => {
    if (!profile || !user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        default_slippage_bps: profile.default_slippage_bps,
        preferred_chain: profile.preferred_chain,
        theme: profile.theme,
        display_currency: profile.display_currency,
        notify_swap_confirmed: profile.notify_swap_confirmed,
        notify_swap_failed: profile.notify_swap_failed,
        notify_schedule_run: profile.notify_schedule_run,
        notify_prefs_changed: profile.notify_prefs_changed,
        email_notifications: profile.email_notifications,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    // Fire a notification respecting the user's own preference toggle
    await supabase.rpc as never; // no-op type guard
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "prefs.updated",
      title: "Preferences updated",
      body: "Your account preferences were saved.",
      link: "/account/preferences",
    });
    toast.success("Preferences saved");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (loading || !profile) {
    return <div className="font-mono text-[12px] text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="rounded-md border border-border bg-surface-1 p-5 lg:col-span-2">
        <div className="text-mono-label mb-4" style={{ fontSize: 10 }}>
          PROFILE
        </div>
        <div className="space-y-4">
          <Field label="EMAIL">
            <div className="rounded border border-border bg-background px-3 py-2 font-mono text-[12px] text-muted-foreground">
              {user?.email}
            </div>
          </Field>
          <Field label="DISPLAY NAME">
            <input
              value={profile.display_name ?? ""}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div className="text-mono-label mb-4 mt-8" style={{ fontSize: 10 }}>
          SWAP DEFAULTS
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="DEFAULT SLIPPAGE %">
            <input
              type="number"
              step="0.01"
              min="0"
              max="50"
              value={profile.default_slippage_bps / 100}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  default_slippage_bps: Math.round(Number(e.target.value) * 100),
                })
              }
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
            />
          </Field>
          <Field label="PREFERRED NETWORK">
            <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2 font-mono text-[12px]">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
              <span className="text-foreground">Arc Testnet</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                more networks coming soon
              </span>
            </div>
          </Field>
        </div>


        <div className="text-mono-label mb-4 mt-8" style={{ fontSize: 10 }}>
          DISPLAY CURRENCY
        </div>
        <Field label="SHOW PRICES, KPIs, AND NOTIONALS IN">
          <div className="flex gap-2">
            {(["USD", "NGN", "EUR", "GBP"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setProfile({ ...profile, display_currency: c })}
                className={`flex-1 border px-3 py-2 font-mono text-[11px] uppercase tracking-widest ${
                  profile.display_currency === c
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "NGN" ? "₦ Naira" : c}
              </button>
            ))}
          </div>
        </Field>

        <div className="text-mono-label mb-4 mt-8" style={{ fontSize: 10 }}>
          APPEARANCE
        </div>
        <Field label="THEME">
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setProfile({ ...profile, theme: t });
                  applyTheme(t);
                }}
                className={`flex-1 border px-3 py-2 font-mono text-[11px] uppercase tracking-widest ${
                  profile.theme === t
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-8 flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={save}
            disabled={busy}
            className="bg-primary px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface-1 p-5">
        <div className="text-mono-label mb-4" style={{ fontSize: 10 }}>
          SESSION
        </div>
        <p className="font-mono text-[12px] text-muted-foreground">
          You're signed in. Sign out to end this session on this device.
        </p>
        <button
          onClick={handleSignOut}
          className="mt-4 w-full border border-destructive/50 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-mono-label" style={{ fontSize: 10 }}>
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
