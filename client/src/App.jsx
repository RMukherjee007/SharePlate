import { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
const importRegister = () => import('./pages/Register');
const importAbout = () => import('./pages/About');
const importDonors = () => import('./pages/Donors');
const importCharities = () => import('./pages/Charities');
const importHowToJoin = () => import('./pages/HowToJoin');
const importContact = () => import('./pages/Contact');
const importPrivacy = () => import('./pages/Privacy');
const importAccessibility = () => import('./pages/Accessibility');
const importAnalytics = () => import('./pages/Analytics');

const Register = lazy(importRegister);
const About = lazy(importAbout);
const Donors = lazy(importDonors);
const Charities = lazy(importCharities);
const HowToJoin = lazy(importHowToJoin);
const Contact = lazy(importContact);
const Privacy = lazy(importPrivacy);
const Accessibility = lazy(importAccessibility);
const Analytics = lazy(importAnalytics);
const DonorDashboard = lazy(() => import('./pages/dashboards/DonorDashboard'));
const ReceiverDashboard = lazy(() => import('./pages/dashboards/ReceiverDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
  const { user, logout } = useAuth();
  return (
    <div className="app-container">
      {/* Shared Navbar */}
      <nav className="navbar">
        <Link to="/" className="nav-brand" style={{textDecoration: 'none', color: 'inherit'}}>SharePlate</Link>
        <div className="nav-links">
          <Link to="/about" onMouseEnter={importAbout}>About</Link>
          <Link to="/donors" onMouseEnter={importDonors}>Donors</Link>
          <Link to="/charities" onMouseEnter={importCharities}>Charities</Link>
          <Link to="/analytics" onMouseEnter={importAnalytics}>Analytics</Link>
          <Link to="/contact" onMouseEnter={importContact}>Contact</Link>
          {user ? (
            <>
              <Link to={user.role === 'Restaurant' ? '/donor' : user.role === 'NGO' ? '/receiver' : '/admin'} style={{ fontWeight: 'bold', color: 'var(--color-dark-brown)' }}>Dashboard</Link>
              <button onClick={logout} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: '0' }}>Logout</button>
            </>
          ) : (
            <Link to="/register" onMouseEnter={importRegister} style={{ fontWeight: 'bold', color: 'var(--color-dark-brown)' }}>Register</Link>
          )}
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
