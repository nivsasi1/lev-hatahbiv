import { HomeContent } from "../components/HomeContent";

// The real homepage is just the shared HomeContent on the global theme.
export const HomePage = () => (
  <main className="page-main">
    <HomeContent />
  </main>
);
