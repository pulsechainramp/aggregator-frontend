import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Swap from "./pages/Swap/Swap";
import About from "./pages/About";
import Bridge from "./pages/Bridge";
import Activity from "./pages/Activity/Activity";
import Referrals from "./pages/Referrals";

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
  try {
    const last = typeof window !== "undefined" ? localStorage.getItem("lastTab") : null;
    if (last && allowed.includes(last as (typeof allowed)[number])) {
      target = last;
    }
  } catch {}
  return <Navigate to={target} replace />;
};

const AppRoutes = () => {
  return (
    <>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/about" element={<About />} />
        <Route path="/referrals" element={<Referrals />} />
      </Routes>
    </>
  );
};

export default AppRoutes; 