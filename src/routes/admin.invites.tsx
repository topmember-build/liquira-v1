import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "liquira_beta_admin_token";

type BetaCode = {
  id: string;
  code: string;
  active: boolean;
  unlimited_uses: boolean;
  uses_remaining: number | null;
  usage_count: number;
  created_at: string;
  expires_at: string | null;
  created_by: string | null;
  notes: string | null;
};

type BetaUser = {
  id: string;
  email: string;
  wallet_address: string | null;
  invite_code: string | null;
  access_granted: boolean;
  created_at: string;
  updated_at: string | null;
};

function buildAdminHeaders(token: string) {
  return { "Content-Type": "application/json", "x-admin-secret": token };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function AdminInvitesPage() {
  const navigate = useNavigate();
  const [adminToken, setAdminToken] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<BetaCode[]>([]);
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [formState, setFormState] = useState({
    seedCode: "",
    quantity: 1,
    usesRemaining: 1,
    unlimitedUses: false,
    expiresAt: "",
    notes: "",
  });

  const storedToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(AUTH_STORAGE_KEY) || null;
  }, []);

  const authHeaders = useMemo(() => {
    return adminToken ? buildAdminHeaders(adminToken) : undefined;
  }, [adminToken]);

  const unauthorize = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setAdminToken("");
    setAuthorized(false);
    setCodes([]);
    setUsers([]);
  };

  const fetchCodes = async (token: string) => {
    const response = await fetch("/api/beta/admin/codes", {
      headers: buildAdminHeaders(token),
    });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setCodes(payload.codes);
      return true;
    }
    return false;
  };

  const fetchUsers = async (token: string) => {
    const response = await fetch("/api/beta/admin/users", {
      headers: buildAdminHeaders(token),
    });
    const payload = await response.json();
    if (response.ok && payload.success) {
      setUsers(payload.users);
      return true;
    }
    return false;
  };

  const validateAdminToken = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/beta/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: token }),
      });
      const payload = await response.json();

      if (response.ok && payload.success) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(AUTH_STORAGE_KEY, token);
        }
        setAdminToken(token);
        setAuthorized(true);
        await Promise.all([fetchCodes(token), fetchUsers(token)]);
        return;
      }

      unauthorize();
      setError(payload.error || "Invalid admin token");
    } catch (cause) {
      unauthorize();
      setError(cause instanceof Error ? cause.message : "Unable to authenticate admin token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storedToken) {
      setLoading(false);
      return;
    }

    validateAdminToken(storedToken);
  }, [storedToken]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await validateAdminToken(adminToken);
  };

  const handleCreateCodes = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authHeaders) {
      setError("Admin token missing");
      return;
    }

    setLoading(true);
    setError(null);

    const body = {
      quantity: formState.quantity,
      code: formState.seedCode.trim() || undefined,
      usesRemaining: formState.unlimitedUses ? null : formState.usesRemaining,
      unlimitedUses: formState.unlimitedUses,
      expiresAt: formState.expiresAt || undefined,
      notes: formState.notes || undefined,
    } as const;

    try {
      const response = await fetch("/api/beta/admin/codes", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (response.ok && payload.success) {
        setCodes(payload.codes);
        setFormState((prev) => ({
          ...prev,
          seedCode: "",
          quantity: 1,
          notes: "",
          expiresAt: "",
        }));
        return;
      }
      setError(payload.error || "Unable to create codes");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create invite codes");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCode = async (codeId: string, active: boolean) => {
    if (!authHeaders) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/beta/admin/codes", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ id: codeId, active }),
      });
      const payload = await response.json();
      if (response.ok && payload.success) {
        await fetchCodes(adminToken);
        return;
      }
      setError(payload.error || "Unable to update code status");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update invite code");
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-muted/80 p-10 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="mb-6 space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-primary">Beta admin</p>
            <h1 className="text-3xl font-semibold text-foreground">Admin invite management</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Enter your admin passphrase to view and manage private beta invite codes.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-foreground">
              Admin passphrase
              <input
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={adminToken}
                onChange={(event) => setAdminToken(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Authenticate"}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                Homepage
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="rounded-3xl border border-border/80 bg-muted/80 p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-primary">Invite management</p>
              <h1 className="text-3xl font-semibold text-foreground">Private beta invites</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate invite codes, track availability, and manage the people who can join the beta.
              </p>
            </div>
            <button
              type="button"
              onClick={unauthorize}
              className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-border/80 bg-muted/80 p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-foreground">Create invite codes</h2>
          <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleCreateCodes}>
            <label className="space-y-2 text-sm font-medium text-foreground">
              Seed code (optional)
              <input
                value={formState.seedCode}
                onChange={(event) => setFormState((prev) => ({ ...prev, seedCode: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="CUSTOMCODE"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Quantity
              <input
                type="number"
                min={1}
                max={50}
                value={formState.quantity}
                onChange={(event) => setFormState((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Uses remaining
              <input
                type="number"
                min={0}
                value={formState.usesRemaining}
                onChange={(event) => setFormState((prev) => ({ ...prev, usesRemaining: Number(event.target.value) }))}
                disabled={formState.unlimitedUses}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={formState.unlimitedUses}
                onChange={(event) => setFormState((prev) => ({ ...prev, unlimitedUses: event.target.checked }))}
                className="h-5 w-5 rounded border-border bg-background text-primary"
              />
              Unlimited uses
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Expiration date
              <input
                type="date"
                value={formState.expiresAt}
                onChange={(event) => setFormState((prev) => ({ ...prev, expiresAt: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="md:col-span-2 space-y-2 text-sm font-medium text-foreground">
              Notes (internal)
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
              disabled={loading}
            >
              {loading ? "Creating codes…" : "Create invite codes"}
            </button>
          </form>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-border/80 bg-muted/80 p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Invite code inventory</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track active codes, remaining uses, and expiration dates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchCodes(adminToken)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-foreground">
                <thead className="border-b border-border/70 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Code</th>
                    <th className="py-3 pr-4">Uses</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Expires</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No invite codes yet. Create one to start.
                      </td>
                    </tr>
                  ) : (
                    codes.map((code) => (
                      <tr key={code.id} className="border-b border-border/70">
                        <td className="py-3 pr-4 font-mono text-sm text-foreground">{code.code}</td>
                        <td className="py-3 pr-4 text-sm text-foreground">
                          {code.unlimited_uses ? "Unlimited" : code.uses_remaining ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-sm text-foreground">
                          {code.active ? "Active" : "Disabled"}
                        </td>
                        <td className="py-3 pr-4 text-sm text-foreground">{formatDate(code.expires_at)}</td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => handleToggleCode(code.id, !code.active)}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
                          >
                            {code.active ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-border/80 bg-muted/80 p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">Beta users</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Review users who were granted access through the invite system.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-foreground">
                <thead className="border-b border-border/70 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Invite code</th>
                    <th className="py-3 pr-4">Wallet</th>
                    <th className="py-3 pr-4">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No beta users yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-border/70">
                        <td className="py-3 pr-4 text-sm text-foreground">{user.email}</td>
                        <td className="py-3 pr-4 text-sm text-foreground">{user.invite_code || "—"}</td>
                        <td className="py-3 pr-4 text-sm text-foreground">{user.wallet_address || "—"}</td>
                        <td className="py-3 pr-4 text-sm text-foreground">
                          {user.access_granted ? "Granted" : "Pending"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/invites")({
  component: AdminInvitesPage,
});
