import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState({ metrics: {}, users: [] });

  const fetchData = useCallback(() => {
    fetch('/api/admin/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(json => setData(json))
    .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const verifyNGO = async (userId) => {
    try {
      const res = await fetch(`/api/admin/verify-ngo/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData(); // Refresh the list
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to verify NGO');
      }
    } catch (error) {
      console.error(error);
      alert('Error verifying NGO');
    }
  };

  const unverifiedNGOs = data.users.filter(u => u.role === 'NGO' && !u.is_verified);

  return (
    <div className="page-padding">
      <h2 className="features-header" style={{ color: 'var(--color-dark-brown)' }}>Admin Control Panel</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '60px' }}>
        <div style={{ flex: 1, padding: '30px', backgroundColor: 'var(--color-dark-brown)', color: 'var(--color-text-light)' }}>
          <h3>Total Users</h3>
          <p style={{ fontSize: '3rem' }}>{data.metrics.totalUsers || 0}</p>
        </div>
        <div style={{ flex: 1, padding: '30px', backgroundColor: 'var(--color-dark-brown)', color: 'var(--color-text-light)' }}>
          <h3>Total Food Batches</h3>
          <p style={{ fontSize: '3rem' }}>{data.metrics.totalBatches || 0}</p>
        </div>
        <div style={{ flex: 1, padding: '30px', backgroundColor: 'var(--color-dark-brown)', color: 'var(--color-text-light)' }}>
          <h3>Successful Claims</h3>
          <p style={{ fontSize: '3rem' }}>{data.metrics.totalClaims || 0}</p>
        </div>
      </div>

      {unverifiedNGOs.length > 0 && (
        <div style={{ marginBottom: '40px', backgroundColor: '#fefce8', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #eab308' }}>
          <h3 className="form-title" style={{ color: '#a16207' }}>Pending NGO Verifications</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eab308', textAlign: 'left', color: '#854d0e' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Address</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {unverifiedNGOs.map(u => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #fef08a' }}>
                  <td style={{ padding: '10px', color: '#713f12' }}>{u.user_id}</td>
                  <td style={{ padding: '10px', color: '#713f12' }}><strong>{u.name}</strong></td>
                  <td style={{ padding: '10px', color: '#713f12' }}>{u.address}</td>
                  <td style={{ padding: '10px' }}>
                    <button 
                      onClick={() => verifyNGO(u.user_id)}
                      style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Verify NGO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="form-title">All Registered Users</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-dark-brown)', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Role</th>
            <th style={{ padding: '10px' }}>Name</th>
            <th style={{ padding: '10px' }}>Address</th>
            <th style={{ padding: '10px' }}>Verified?</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map(u => (
            <tr key={u.user_id} style={{ borderBottom: '1px solid #ccc' }}>
              <td style={{ padding: '10px' }}>{u.user_id}</td>
              <td style={{ padding: '10px' }}><strong>{u.role}</strong></td>
              <td style={{ padding: '10px' }}>{u.name}</td>
              <td style={{ padding: '10px' }}>{u.address}</td>
              <td style={{ padding: '10px' }}>
                {u.role === 'NGO' ? (u.is_verified ? '✅ Yes' : '❌ Pending') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
