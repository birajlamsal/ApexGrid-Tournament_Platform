import { Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import TournamentsPage from "./pages/TournamentsPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import AdminPage from "./pages/AdminPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ContactPage from "./pages/ContactPage";
import MatchIdExtractPage from "./pages/MatchIdExtractPage";
import MatchDetailDownloadPage from "./pages/MatchDetailDownloadPage";
import LandPage from "./pages/LandPage";

const App = () => {
  return (
    <div className="app">
      <div className="app-shell">
        <div className="app-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/land" element={<LandPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/matchidextract" element={<MatchIdExtractPage />} />
              <Route path="/matchdetails" element={<MatchDetailDownloadPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </ErrorBoundary>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default App;
