import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import AppRoutes from "./routes";
import Header from "./pages/Header";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NetworkWarning from "./components/NetworkWarning";
import AppFooter from "./components/AppFooter";
import { useTheme } from "./theme/ThemeProvider";
import ScrollToTop from "./components/ScrollToTop";
import AlphaNoticeBanner from "./components/AlphaNoticeBanner";
import SiwePreviewProvider from "./components/SiwePreviewProvider";

function App() {
  const { theme } = useTheme();

  return (
    <Provider store={store}>
      <SiwePreviewProvider>
        <Router>
        <ScrollToTop />
        <div className="flex min-h-screen flex-col bg-bg-page text-text transition-colors duration-200">
          <AlphaNoticeBanner />
          <Header />

          {/* Network Warning - shows when on wrong network */}
          <NetworkWarning />

          <main className="flex-1 pb-10">
            <AppRoutes />
          </main>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={theme === "dark" ? "dark" : "light"}
          />
          {/* Footer at the bottom */}
          <AppFooter />
        </div>
        </Router>
      </SiwePreviewProvider>
    </Provider>
  );
}

export default App;
