import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DonorDashboard() {
  const { user, token, logout } = useAuth();
  const [batches, setBatches] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [form, setForm] = useState({ description: '', batch_type: 'Dry_Goods', weight_kg: '', expiry_hours: '24', delivery_city: '', donor_name: user?.name || '', pickup_address: user?.address || '' });
  const [msg, setMsg] = useState('');

  const fetchBatches = useCallback(async () => {
    const res = await fetch('/api/batches/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return logout();
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches || []);
    }
  }, [token, logout]);

  const fetchPendingRequests = useCallback(async () => {
    const res = await fetch('/api/claims/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return logout();
    if (res.ok) setPendingRequests(await res.json());
  }, [token, logout]);

  useEffect(() => { 
    // Initial fetch
    fetchBatches(); 
    fetchPendingRequests();

    // Short Polling
    const interval = setInterval(() => {
      fetchBatches(); 
      fetchPendingRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchBatches, fetchPendingRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      // sending coordinates could be added here if DB was updated, for now just relying on user profile lat/lng
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setMsg('Batch posted successfully!');
      setForm(prev => ({ 
        ...prev, 
        description: '', 
        batch_type: 'Dry_Goods', 
        weight_kg: '', 
        expiry_hours: '24', 
        delivery_city: '' 
      }));
      fetchBatches();
    } else {
      setMsg('Failed to post batch.');
    }
  };

  const handleAcceptRequest = async (claimId) => {
    const res = await fetch('/api/claims/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ claim_id: claimId })
    });
    if (res.status === 401 || res.status === 403) return logout();
    if (res.ok) {
      alert('Request accepted successfully!');
      fetchPendingRequests();
      fetchBatches(); // to refresh status
    } else {
      alert('Failed to accept request.');
    }
  };

  return (
    <div className="page-padding" style={{ backgroundColor: 'var(--color-light-tan)', minHeight: '100vh' }}>
      <h2 className="features-header">Donor Dashboard</h2>
      <p style={{marginBottom: '20px'}}>Welcome back, {user?.name}</p>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Post Form */}
        <div className="quote-form-container" style={{ position: 'relative', right: '0', bottom: '0', flex: '1 1 300px', maxWidth: '100%', boxSizing: 'border-box' }}>
          <h3 className="form-title">Post Surplus Food</h3>
          <p style={{fontSize: '0.9rem', color: '#555', marginBottom: '20px'}}>
            Please confirm your pickup details below.
          </p>
          <form onSubmit={handleSubmit}>
            <input type="text" className="input-field" placeholder="Donor Name (e.g. Good Bistro)" value={form.donor_name} onChange={e => setForm({...form, donor_name: e.target.value})} required />
            <input type="text" className="input-field" placeholder="Exact Pickup Address" value={form.pickup_address} onChange={e => setForm({...form, pickup_address: e.target.value})} required />
            
            <input type="text" className="input-field" placeholder="Description (e.g. 50 sandwiches)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            <select className="input-field" value={form.batch_type} onChange={e => setForm({...form, batch_type: e.target.value})}>
              <option value="Dry_Goods">Dry Goods</option>
              <option value="Refrigerated">Refrigerated</option>
              <option value="Produce">Produce (Fruits/Vegetables)</option>
              <option value="Prepared_Meals">Prepared Meals</option>
              <option value="Baked_Goods">Baked Goods</option>
              <option value="Beverages">Beverages</option>
              <option value="Other">Other</option>
            </select>
            <input type="number" className="input-field" placeholder="Weight (kg)" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})} required />
            <select className="input-field" value={form.expiry_hours} onChange={e => setForm({...form, expiry_hours: e.target.value})}>
              <option value="12">Expires in 12 Hours</option>
              <option value="24">Expires in 24 Hours</option>
              <option value="48">Expires in 48 Hours</option>
            </select>
            <input type="text" className="input-field" placeholder="Delivery City (e.g. Chicago)" value={form.delivery_city} onChange={e => setForm({...form, delivery_city: e.target.value})} required />
            
            <button type="submit" className="btn-dark">Post Batch</button>
            {msg && <div className="status-message">{msg}</div>}
          </form>
        </div>

        {/* Pending Requests & Listings */}
        <div style={{ flex: '1 1 300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div style={{ backgroundColor: 'white', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <h3 className="form-title">Incoming Requests</h3>
            {pendingRequests.length === 0 ? <p>No pending requests.</p> : pendingRequests.map(r => (
              <div key={r.claim_id} style={{ padding: '15px', border: '1px solid #eab308', backgroundColor: '#fefce8', marginBottom: '10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <strong>{r.description}</strong> ({r.weight_kg} kg)<br/>
                    Requested by: <strong>{r.charity_name}</strong><br/>
                    Charity Address: {r.charity_address}
                  </div>
                  <button onClick={() => handleAcceptRequest(r.claim_id)} className="btn-dark" style={{ width: 'auto', padding: '8px 15px', backgroundColor: '#16a34a', border: 'none' }}>Accept</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: 'white', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <h3 className="form-title">My Active Listings</h3>
            {batches.length === 0 ? <p>No active listings.</p> : batches.map(b => (
              <div key={b.batch_id} style={{ padding: '15px', borderBottom: '1px solid #ccc', marginBottom: '10px' }}>
                <strong>{b.description}</strong> ({b.weight_kg} kg)<br/>
                Status: <span style={{ color: b.status === 'locked' ? '#eab308' : b.status === 'claimed' ? 'red' : 'green' }}>{b.status}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
