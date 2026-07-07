import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Restaurant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Automatically log in after registration
      const user = await login(email, password);
      
      if (user.role === 'Restaurant') navigate('/donor');
      else if (user.role === 'NGO') navigate('/receiver');
      else if (user.role === 'Admin') navigate('/admin');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="header-section" style={{ padding: '60px 40px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="quote-form-container" style={{ position: 'static', width: '100%', maxWidth: '500px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <h3 className="form-title" style={{ marginBottom: '10px' }}>Create an Account</h3>
          <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
            Join SharePlate to fight food waste.
          </p>
          <form onSubmit={handleRegister}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Organization / Full Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              style={{ marginBottom: '10px' }}
            />
            <input 
              type="email" 
              className="input-field" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ marginBottom: '10px' }}
            />
            <input 
              type="password" 
              className="input-field" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ marginBottom: '10px' }}
            />
            <select
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              style={{ marginBottom: '20px' }}
            >
              <option value="Restaurant">Restaurant / Food Donor</option>
              <option value="NGO">NGO / Charity</option>
            </select>

            <button type="submit" className="btn-green" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Registering...' : 'Register'}
            </button>
            
            {error && <div className="status-message status-error" style={{marginTop: '15px'}}>{error}</div>}
            
            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
              Already have an account? <Link to="/" style={{ color: 'var(--color-dark-brown)', fontWeight: 'bold' }}>Log In</Link>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}

export default Register;
