import { useState } from "react";
import { useAdmin } from "../context";
import type { Coupon } from "../lib/types";

// Coupons + the newsletter welcome offer — both live on the Cloudflare Worker
// (D1) and take effect immediately (no publish).
export function useCoupons() {
  const { workerCall, act } = useAdmin();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomePercent, setWelcomePercent] = useState(10);

  const mapCoupons = (rows: any[]): Coupon[] =>
    (rows || []).map((c) => ({
      code: c.code,
      percent: c.percent,
      maxUses: c.max_uses ?? null,
      usedCount: c.used_count ?? 0,
    }));

  const load = async () => {
    const [cz, wc] = await Promise.all([
      workerCall("/coupons").catch(() => ({ coupons: [] })),
      workerCall("/settings").catch(() => ({ welcomeEnabled: true, welcomePercent: 10 })),
    ]);
    setCoupons(mapCoupons(cz.coupons));
    setWelcomeEnabled(!!wc.welcomeEnabled);
    setWelcomePercent(wc.welcomePercent ?? 10);
  };

  const addCoupon = () => setCoupons((cs) => [...cs, { code: "", percent: 10, maxUses: null }]);

  const updateCoupon = (i: number, field: "code" | "percent" | "maxUses", v: string) =>
    setCoupons((cs) =>
      cs.map((c, j) =>
        j !== i
          ? c
          : field === "code"
            ? { ...c, code: v.toUpperCase() }
            : field === "percent"
              ? { ...c, percent: Math.min(Math.max(Math.round(Number(v) || 0), 1), 100) }
              : { ...c, maxUses: v === "" ? null : Math.max(1, Math.round(Number(v) || 1)) }
      )
    );

  // delete on the Worker too when the row was already saved (has a code)
  const deleteCoupon = (i: number) =>
    act(async () => {
      const c = coupons[i];
      if (c.code)
        await workerCall(`/coupons/${encodeURIComponent(c.code)}`, { method: "DELETE" });
      setCoupons((cs) => cs.filter((_, j) => j !== i));
    });

  // upsert every row with a code, then reload from the Worker (live immediately)
  const saveCoupons = () =>
    act(async () => {
      for (const c of coupons) {
        if (!c.code) continue;
        await workerCall("/coupons", {
          method: "POST",
          body: JSON.stringify({ code: c.code, percent: c.percent, maxUses: c.maxUses }),
        });
      }
      const cz = await workerCall("/coupons");
      setCoupons(mapCoupons(cz.coupons));
    }, "הקופונים נשמרו! פעילים מיד באתר");

  const saveWelcome = () =>
    act(async () => {
      await workerCall("/settings", {
        method: "POST",
        body: JSON.stringify({ welcomeEnabled, welcomePercent }),
      });
    }, "הצעת ההצטרפות נשמרה! פעילה מיד");

  return {
    coupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    saveCoupons,
    welcomeEnabled,
    setWelcomeEnabled,
    welcomePercent,
    setWelcomePercent,
    saveWelcome,
    load,
  };
}
