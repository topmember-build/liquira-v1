import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { STABLES, CHAINS } from "@/lib/stables";
import { Trash2, Plus, Pencil, Check, X, Zap, Send, Clock, Loader2 } from "lucide-react";
import { simulateSwap, executeSwap } from "@/server/swaps.functions";
import { createSchedule } from "@/server/schedules.functions";
import type { Quote } from "@/lib/quote-engine";

type SavedRoute = {
  id: string;
  label: string;
  from_token: string;
  to_token: string;
  from_chain: string;
  to_chain: string;
  amount: number | null;
  slippage_bps: number;
  created_at: string;
};

export function SavedRoutesPage() {
  const { user } = useAuth();
  const wallet = useWallet();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<Record<string, boolean>>({});
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [scheduleFor, setScheduleFor] = useState<SavedRoute | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_routes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRoutes((data ?? []) as SavedRoute[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  // ... rest of the component code would go here
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Saved Routes</h1>
      {loading ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{route.label}</h3>
                  <p className="text-sm text-gray-600">
                    {route.from_token} → {route.to_token} on {route.from_chain}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Zap className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Send className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Clock className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}