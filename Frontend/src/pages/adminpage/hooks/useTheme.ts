import { useEffect, useState } from "react";

// Dashboard skin: "atelier" (original, artsy) | "clean" (readable, pro).
// Persisted to localStorage; a body class lets the clean theme own the page bg.
export function useTheme() {
  const [adminTheme, setAdminTheme] = useState<"atelier" | "clean">(() =>
    localStorage.getItem("lh-admin-theme") === "clean" ? "clean" : "atelier"
  );

  useEffect(() => {
    localStorage.setItem("lh-admin-theme", adminTheme);
    document.body.classList.toggle("lh-admin-clean", adminTheme === "clean");
    return () => document.body.classList.remove("lh-admin-clean");
  }, [adminTheme]);

  const rootClass = `page-main shell admin-page${adminTheme === "clean" ? " adm-clean" : ""}`;
  return { adminTheme, setAdminTheme, rootClass };
}
