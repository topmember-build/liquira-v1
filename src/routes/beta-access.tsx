import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useBetaAccess } from "@/contexts/BetaAccessContext";

function BetaAccessPage() {
  const navigate = useNavigate();
  const { validateInviteCode, checkingSession, hasAccess } = useBetaAccess();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await validateInviteCode(email.trim(), code.trim());
    setLoading(false);

    if (result.success) {
      navigate({ to: "/" });
      return;
    }

    setError(result.error || "Unable to validate invite code");
  };

  if (checkingSession && !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="rounded-3xl border border-border/80 bg-muted/80 p-10 text-center shadow-xl shadow-black/5 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Checking your beta access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-muted/80 p-10 shadow-xl shadow-black/5 backdrop-blur-xl">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-primary">Private beta</p>
          <h1 className="text-3xl font-semibold text-foreground">Secure your beta access</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Enter the invite code and the email address used for your invitation to unlock the product.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium text-foreground">
            Email address
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-foreground">
            Invite code
            <input
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="ENTER-YOUR-CODE"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Validating…" : "Unlock beta access"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have a code? Contact your Liquira beta host for an invite or return to the{' '}
            <Link to="/" className="font-semibold text-primary hover:underline">
              homepage
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/beta-access")({
  component: BetaAccessPage,
});
