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

function App() {
  const { theme } = useTheme();

  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-bg-page text-text transition-colors duration-200">
          <Header />
          
          {/* Network Warning - shows when on wrong network */}
          <NetworkWarning />
          
          <main className="pb-16">
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
    </Provider>
  );
}

export default App;
