import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCircle2, AlertTriangle, Clock, Settings, ArrowUpRight, ArrowDownLeft, ShieldCheck } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useAuth } from "@/contexts/AuthContext";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "swap.confirmed": CheckCircle2,
  "swap.failed": AlertTriangle,
  "schedule.run": Clock,
  "prefs.updated": Settings,
  "payment.pending": Clock,
  "payment.success": ArrowUpRight,
  "payment.failed": AlertTriangle,
  "payment.received": ArrowDownLeft,
  "wallet.linked": ShieldCheck,
};

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:bg-surface-1 hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell size={14} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[18rem] w-full max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border border-border bg-surface-1 shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-mono-label" style={{ fontSize: 10 }}>
              NOTIFICATIONS
            </div>
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-3 py-8 text-center font-mono text-[11px] text-muted-foreground">
                No notifications yet.
              </div>
            )}
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const unreadDot = !n.read_at;
              return (
                <Link
                  key={n.id}
                  to={(n.link as never) ?? "/account"}
                  onClick={() => {
                    setOpen(false);
                    if (unreadDot) void markRead(n.id);
                  }}
                  className={`block border-b border-border px-3 py-2.5 last:border-0 hover:bg-surface-2 ${
                    unreadDot ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={14} className={`mt-0.5 ${unreadDot ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-mono text-[12px] text-foreground">{n.title}</div>
                        {unreadDot && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      {n.body && (
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground line-clamp-2">{n.body}</div>
                      )}
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border px-3 py-2">
            <Link
              to="/account/preferences"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <Check size={11} /> Manage preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
