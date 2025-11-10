import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Swap from "./pages/Swap/Swap";
import Bridge from "./pages/Bridge";
import Activity from "./pages/Activity/Activity";
import Referrals from "./pages/Referrals";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Onramp from "./pages/Onramp/Onramp";
import Docs from "./pages/Docs/Docs";
import Start from "./pages/Start";
import Wallet from "./pages/Wallet";

// track route changes under Router
const RouteTracker = () => {
  const location = useLocation(); // safe here; inside Router
  useEffect(() => {
    const p = location.pathname;
    if (p === "/bridge" || p === "/swap") {
      try {
        localStorage.setItem("lastTab", p);
      } catch {}
    }
  }, [location.pathname]);
  return null;
};

const Landing = () => {
  const allowed = ["/bridge", "/swap"] as const;
  let target = "/bridge";
  let shouldShowStart = false;

  try {
    if (typeof window !== "undefined") {
      const hasSeenStart = localStorage.getItem("hasSeenStart");
      if (!hasSeenStart) {
        shouldShowStart = true;
      } else {
        const last = localStorage.getItem("lastTab");
        if (last && allowed.includes(last as (typeof allowed)[number])) {
          target = last;
        }
      }
    }
  } catch {
    // ignore storage errors
  }

  if (shouldShowStart) {
    return <Navigate to="/start" replace />;
  }

  return <Navigate to={target} replace />;
};

const AppRoutes = () => {
  return (
    <>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Start />} />
        <Route path="/onramp" element={<Onramp />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AppRoutes; 
