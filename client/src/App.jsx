import { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import About from './pages/About';
import Donors from './pages/Donors';
import Charities from './pages/Charities';
import HowToJoin from './pages/HowToJoin';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Accessibility from './pages/Accessibility';
import Analytics from './pages/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
const DonorDashboard = lazy(() => import('./pages/dashboards/DonorDashboard'));
const ReceiverDashboard = lazy(() => import('./pages/dashboards/ReceiverDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
// import { useAuth } from './context/AuthContext';
import './App.css';

function App() {

  return (
    <div className="app-container">
      {/* Shared Navbar */}
      <nav className="navbar">
        <Link to="/" className="nav-brand" style={{textDecoration: 'none', color: 'inherit'}}>SharePlate</Link>
        <div className="nav-links">
          <Link to="/about">About</Link>
          <Link to="/donors">Donors</Link>
          <Link to="/charities">Charities</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </nav>

      {/* Route Views */}
      <Suspense fallback={<div style={{ padding: '100px 40px', textAlign: 'center' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/charities" element={<Charities />} />
          <Route path="/how-to-join" element={<HowToJoin />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/analytics" element={<Analytics />} />
          
          {/* Protected Dashboards */}
          <Route path="/donor" element={<ProtectedRoute allowedRoles={['Restaurant']}><DonorDashboard /></ProtectedRoute>} />
          <Route path="/receiver" element={<ProtectedRoute allowedRoles={['NGO']}><ReceiverDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Suspense>

      {/* Shared Footer */}
      <footer className="footer-section">
        <div className="footer-col">
          <p>892 Unity Avenue<br/>Chicago, IL 60601</p>
          <p style={{marginTop: '20px'}}>
            <Link to="/privacy" style={{color: 'inherit'}}>Privacy Policy</Link><br/>
            <Link to="/accessibility" style={{color: 'inherit'}}>Accessibility Statement</Link>
          </p>
        </div>
        <div className="footer-col">
          <Link to="/about">About</Link>
          <Link to="/donors">Donors</Link>
          <Link to="/charities">Charities</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-col text-right">
          <p>123-456-7890<br/>info@shareplate.org</p>
          <div className="social-icons">
            <a href="https://linkedin.com/in/RMukherjee007" target="_blank" rel="noreferrer" style={{color: 'white', textDecoration: 'none', marginRight: '10px'}}>LinkedIn</a> 
            <a href="https://github.com/RMukherjee007" target="_blank" rel="noreferrer" style={{color: 'white', textDecoration: 'none'}}>GitHub</a>
          </div>
        </div>
      </footer>
      <div className="footer-bottom">
        2026 by SharePlate. Powered by Community.
      </div>
    </div>
  );
}

export default App;
