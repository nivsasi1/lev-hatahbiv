import type { useCoupons } from "../../hooks/useCoupons";

type CouponsApi = ReturnType<typeof useCoupons>;

// Section E — manager coupons + the newsletter welcome offer. Both live on the
// Worker (D1) and take effect immediately (no publish).
export function OffersEditor({ coupons }: { coupons: CouponsApi }) {
  return (
    <section className="home-block">
      <h3 className="display">קופונים</h3>
      <p className="import-help">
        הוסיפו קודי קופון ואת אחוז ההנחה של כל אחד. הקונה מקליד את הקוד בעמוד
        התשלום ומקבל את ההנחה. שינויים נכנסים לתוקף מיד (בלי פרסום). "מספר
        שימושים" ריק = ללא הגבלה.
      </p>
      <div className="coupon-admin-list">
        {coupons.coupons.length === 0 && <p className="import-help dim">אין קופונים עדיין.</p>}
        {coupons.coupons.map((c, i) => (
          <div className="coupon-admin-row" key={i}>
            <input
              type="text"
              className="coupon-admin-code"
              placeholder="קוד (לדוגמה SUMMER)"
              value={c.code}
              onInput={(e: any) => coupons.updateCoupon(i, "code", e.target.value)}
            />
            <div className="coupon-admin-pct">
              <input
                type="number"
                min={1}
                max={100}
                value={c.percent}
                onInput={(e: any) => coupons.updateCoupon(i, "percent", e.target.value)}
              />
              <span>%</span>
            </div>
            <div className="coupon-admin-pct">
              <input
                type="number"
                min={1}
                placeholder="∞"
                value={c.maxUses ?? ""}
                onInput={(e: any) => coupons.updateCoupon(i, "maxUses", e.target.value)}
              />
              <span>שימושים</span>
            </div>
            {c.usedCount ? <span className="import-help dim">נוצל {c.usedCount}</span> : null}
            <button type="button" className="btn small ghost" onClick={() => coupons.deleteCoupon(i)}>
              🗑 מחיקה
            </button>
          </div>
        ))}
      </div>
      <div className="home-block-foot">
        <button type="button" className="btn small ghost" onClick={coupons.addCoupon}>
          ➕ קופון חדש
        </button>
        <button className="btn" onClick={coupons.saveCoupons}>
          שמירת הקופונים
        </button>
      </div>

      <hr
        style={{
          margin: "1.4rem 0 1rem",
          border: "none",
          borderTop: "1px dashed rgba(43,36,64,0.25)",
        }}
      />
      <h3 className="display">מתנת הצטרפות (ניוזלטר)</h3>
      <p className="import-help">
        מצטרפים חדשים מקבלים בפופאפ ההרשמה קוד אישי לשימוש חד-פעמי. כאן קובעים אם
        ההצעה פעילה ומה אחוז ההנחה. תקף מיד, בלי פרסום.
      </p>
      <label
        className="welcome-coupon-field"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <input
          type="checkbox"
          checked={coupons.welcomeEnabled}
          onChange={(e: any) => coupons.setWelcomeEnabled(e.target.checked)}
        />
        <span>הצעת הצטרפות פעילה</span>
      </label>
      <div className="coupon-admin-pct" style={{ marginTop: "0.6rem" }}>
        <input
          type="number"
          min={1}
          max={100}
          value={coupons.welcomePercent}
          disabled={!coupons.welcomeEnabled}
          onInput={(e: any) =>
            coupons.setWelcomePercent(
              Math.min(Math.max(Math.round(Number(e.target.value) || 0), 1), 100)
            )
          }
        />
        <span>% הנחה למצטרפים</span>
      </div>
      <div className="home-block-foot">
        <button className="btn" onClick={coupons.saveWelcome}>
          שמירת ההצעה
        </button>
      </div>
    </section>
  );
}
