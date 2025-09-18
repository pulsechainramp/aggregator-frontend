import { Routes, Route } from "react-router-dom";
import Swap from "./pages/Swap/Swap";
import About from "./pages/About";
import Bridge from "./pages/Bridge";
import Activity from "./pages/Activity/Activity";
import Referrals from "./pages/Referrals";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Swap />} />
      <Route path="/swap" element={<Swap />} />
      <Route path="/bridge" element={<Bridge />} />
      <Route path="/activity" element={<Activity />} />
      <Route path="/about" element={<About />} />
      <Route path="/referrals" element={<Referrals />} />
    </Routes>
  );
};

export default AppRoutes; 