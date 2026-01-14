import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingPage/landingPage";
import NotFoundPage from "./pages/Notfound/notfound";

function App() {
  return (
    <Router>
      <Routes>
        {/* Home */}
        <Route path="/" element={<LandingPage />} />

        {/* Catch-all 404 route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
