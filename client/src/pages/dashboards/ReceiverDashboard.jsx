import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ReceiverDashboard() {
  const { user, token } = useAuth();
  const [batches, setBatches] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [msg, setMsg] = useState('');
  
  // Claim details state
  const [charityName, setCharityName] = useState(user?.name || '');
  const [charityAddress, setCharityAddress] = useState(user?.address || '');

  // City search state
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchCity, setActiveSearchCity] = useState(''); // Empty means all

  const fetchNearby = useCallback(async (city) => {
    // If city is empty, the backend will return all batches
    const url = city ? `/api/batches/nearby?city=${encodeURIComponent(city)}` : `/api/batches/nearby`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches || []);
    }
  }, []);

  const fetchMyClaims = useCallback(async () => {
    const res = await fetch('/api/claims/my-claims', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setMyClaims(await res.json());
    }
  }, [token]);

  useEffect(() => { 
    // Initial fetch
    fetchNearby(activeSearchCity); 
    fetchMyClaims();

    // Short Polling: Fetch every 5 seconds
    const interval = setInterval(() => {
      fetchNearby(activeSearchCity);
      fetchMyClaims();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSearchCity, fetchNearby, fetchMyClaims]);

  const requestBatch = async (batchId) => {
    if (!charityName || !charityAddress) {
      setMsg('Please fill out your Charity Name and Address before requesting a pickup.');
      return;
    }

    const res = await fetch('/api/claims/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ batch_id: batchId, charity_name: charityName, charity_address: charityAddress })
    });
    if (res.ok) {
      setMsg(`Request sent for Batch #${batchId}! Waiting for restaurant approval.`);
      fetchNearby(activeSearchCity);
      fetchMyClaims();
    } else {
      const data = await res.json();
      setMsg(data.error || 'Failed to request batch.');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearchCity(searchInput);
  };

  return (
    <div className="page-padding">
      <h2 className="features-header">Receiver Dashboard</h2>
      <p style={{marginBottom: '20px'}}>Welcome back, {user?.name}.</p>
      
      {user?.is_verified === false && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>⚠️ Account Pending Verification</strong>
          <p style={{ margin: 0 }}>You cannot claim food batches until an admin approves your organization.</p>
        </div>
      )}

      {/* City Search Bar */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Find food in your city:</span>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            className="input-field" 
            value={searchInput} 
            onChange={e => setSearchInput(e.target.value)} 
            style={{ width: '100%', maxWidth: '250px', marginBottom: 0 }} 
            placeholder="Enter City (Optional)" 
          />
          <button type="submit" className="btn-primary" style={{ padding: '10px 20px', width: 'auto' }}>Search</button>
        </form>
      </div>

      {msg && <div className="status-message" style={{marginBottom: '20px'}}>{msg}</div>}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Available Food */}
        <div style={{ flex: '1 1 300px', maxWidth: '100%' }}>
          <div style={{ backgroundColor: 'var(--color-light-tan)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Confirm Your Pickup Details</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" className="input-field" placeholder="Charity Name" value={charityName} onChange={e => setCharityName(e.target.value)} style={{ marginBottom: 0 }} />
              <input type="text" className="input-field" placeholder="Your Address" value={charityAddress} onChange={e => setCharityAddress(e.target.value)} style={{ marginBottom: 0 }} />
            </div>
          </div>

          <h3 className="form-title">{activeSearchCity ? `Available Food in ${activeSearchCity}` : 'All Available Food'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
            {batches.length === 0 ? <p>No food available {activeSearchCity ? `in ${activeSearchCity}` : ''} at the moment. We are auto-refreshing every 5 seconds...</p> : batches.map(b => (
              <div key={b.batch_id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{b.description}</h3>
                <p style={{ color: '#555', marginBottom: '20px' }}>
                  <strong>Type:</strong> {b.batch_type} | <strong>Weight:</strong> {b.weight_kg} kg <br/>
                  <strong>Donor:</strong> {b.donor_name} <br/>
                  <strong>Address:</strong> {b.address}
                </p>
                <button 
                  onClick={() => requestBatch(b.batch_id)} 
                  className="btn-dark" 
                  style={{ width: 'auto', padding: '10px 20px', opacity: user?.is_verified === false ? 0.5 : 1, cursor: user?.is_verified === false ? 'not-allowed' : 'pointer' }}
                  disabled={user?.is_verified === false}
                >
                  Request Pickup
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* My Claims / Tickets */}
        <div style={{ flex: '1 1 300px', maxWidth: '100%' }}>
          <div style={{ backgroundColor: 'var(--color-light-tan)', padding: '30px', borderRadius: '8px' }}>
            <h3 className="form-title">My Tickets</h3>
            <p style={{marginBottom: '20px', color: '#555'}}>Check the status of your requests here.</p>
            {myClaims.length === 0 ? <p>You have not made any requests yet.</p> : myClaims.map(c => (
              <div key={c.claim_id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '10px', borderLeft: `5px solid ${c.pickup_status === 'completed' ? '#16a34a' : '#eab308'}` }}>
                <strong>{c.description}</strong> ({c.weight_kg} kg)<br/>
                Donor: {c.donor_name} <br/>
                Address: {c.donor_address} <br/>
                <span style={{ display: 'inline-block', marginTop: '10px', padding: '5px 10px', backgroundColor: c.pickup_status === 'completed' ? '#dcfce7' : '#fefce8', color: c.pickup_status === 'completed' ? '#166534' : '#a16207', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  Status: {c.pickup_status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
