import { useStats } from "../hooks/useStats";
import { ils } from "../lib/helpers";

export function StatsView() {
  const stats = useStats();
  return (
    <div className="stats-wrap">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-num display">{stats.newOrders}</span>
          <span className="stat-label">הזמנות חדשות</span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">{stats.totalOrders}</span>
          <span className="stat-label">סה״כ הזמנות</span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">₪{ils(stats.revenue)}</span>
          <span className="stat-label">הכנסות סה״כ</span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">{stats.recentCount}</span>
          <span className="stat-label">
            הזמנות ב-30 הימים האחרונים · ₪{ils(stats.recentRevenue)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">{stats.subscribers}</span>
          <span className="stat-label">נרשמים לרשימת התפוצה</span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">{stats.onSale}</span>
          <span className="stat-label">מוצרים במבצע</span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">{stats.outOfStock}</span>
          <span className="stat-label">אזלו מהמלאי</span>
        </div>
        <div className="stat-card">
          <span className="stat-num display">{stats.hidden}</span>
          <span className="stat-label">מוסתרים</span>
        </div>
      </div>

      <div className="stats-top">
        <h3 className="display">הנמכרים ביותר</h3>
        {stats.top.length === 0 ? (
          <p className="empty-note">עוד אין הזמנות — כאן יופיעו המוצרים הנמכרים ביותר</p>
        ) : (
          <ol className="top-sellers">
            {stats.top.map(([name, qty]) => (
              <li key={name}>
                <span className="ts-name">{name}</span>
                <span className="ts-qty">{qty} יח׳</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <a className="btn small ga-link" href="https://analytics.google.com" target="_blank" rel="noreferrer">
        📈 Google Analytics — נתוני גלישה מלאים
      </a>
    </div>
  );
}
