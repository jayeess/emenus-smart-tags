import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import AnalyzePage from "./pages/AnalyzePage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
