import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

type Ctx = {
  notifications: Notification[];
  unread: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !supabase?.from) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications((data ?? []) as Notification[]);
    } catch (err) {
      console.warn("[NotificationsContext] Failed to fetch notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime (only if Supabase is configured)
  useEffect(() => {
    if (!user || !supabase?.channel) {
      return;
    }
    
    try {
      const ch = supabase
        .channel(`notif:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as Notification;
            setNotifications((prev) => [n, ...prev].slice(0, 50));
            toast(n.title, { description: n.body ?? undefined });
          },
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(ch);
      };
    } catch (err) {
      console.warn("[NotificationsContext] Failed to setup realtime notifications:", err);
    }
  }, [user?.id]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    if (supabase?.from) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).catch((err) => {
        console.warn("[NotificationsContext] Failed to mark as read:", err);
      });
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user || !supabase?.from) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null).catch((err) => {
      console.warn("[NotificationsContext] Failed to mark all as read:", err);
    });
  }, [user?.id]);

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unread, loading, markRead, markAllRead, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
