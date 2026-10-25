import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ReceiverDashboard() {
  const { user, token, logout } = useAuth();
  const [batches, setBatches] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  // Claim details state
  const [charityName, setCharityName] = useState(user?.name || '');
  const [charityAddress, setCharityAddress] = useState(user?.address || '');

  // Geospatial & Smart Dispatch Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchCity, setActiveSearchCity] = useState('');
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [receiverCenter, setReceiverCenter] = useState(null);
  const [radiusKm, setRadiusKm] = useState('');
  const [dietaryTag, setDietaryTag] = useState('');
  const [sortBy, setSortBy] = useState('match_score');
  const [gpsStatus, setGpsStatus] = useState('');

  // Multi-Stop Route Optimizer (CTSP-TW) state
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [maxCapacityKg, setMaxCapacityKg] = useState(120);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Urgent Rescue live alert state
  const [urgentAlert, setUrgentAlert] = useState(null);

  const fetchNearby = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeSearchCity) params.set('city', activeSearchCity);
    if (coords.lat && coords.lng) {
      params.set('lat', coords.lat);
      params.set('lng', coords.lng);
    }
    if (radiusKm) params.set('radius_km', radiusKm);
    if (dietaryTag) params.set('dietary_tag', dietaryTag);
    if (sortBy) params.set('sort_by', sortBy);

    const qs = params.toString();
    const url = qs ? `/api/batches/nearby?${qs}` : '/api/batches/nearby';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches || []);
      if (data.receiver_coords) {
        setReceiverCenter(data.receiver_coords);
      }
    }
  }, [activeSearchCity, coords.lat, coords.lng, radiusKm, dietaryTag, sortBy]);

  const fetchMyClaims = useCallback(async () => {
    const res = await fetch('/api/claims/my-claims', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return logout();
    if (res.ok) {
      const data = await res.json();
      setMyClaims(Array.isArray(data) ? data : []);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchNearby();
    fetchMyClaims();

    let eventSource;
    try {
      eventSource = new EventSource('/api/stream/inventory');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'URGENT_RESCUE_ALERT') {
            setUrgentAlert(payload);
          }
        } catch (_err) {
          // Ignore non-JSON SSE heartbeats
        }
        fetchNearby();
        fetchMyClaims();
      };
    } catch (_e) {
      // Fallback to polling if SSE fails
    }

    const interval = setInterval(() => {
      fetchNearby();
      fetchMyClaims();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [fetchNearby, fetchMyClaims]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by browser.');
      return;
    }
    setGpsStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setCoords({ lat, lng });
        setReceiverCenter({ latitude: Number(lat), longitude: Number(lng) });
        setGpsStatus(`GPS Active (${lat}, ${lng})`);
      },
      () => {
        setGpsStatus('GPS permission denied; using city center coordinates.');
      }
    );
  };

  const requestBatch = async (batchId) => {
    if (!charityName || !charityAddress) {
      setIsError(true);
      setMsg('Please fill out your Charity Name and Address before requesting a pickup.');
      return;
    }

    const res = await fetch('/api/claims/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ batch_id: batchId, charity_name: charityName, charity_address: charityAddress })
    });
    if (res.status === 401) return logout();

    if (res.ok) {
      setIsError(false);
      setMsg(`Request sent for Batch #${batchId}! Waiting for restaurant approval.`);
      setSelectedBatchIds(prev => prev.filter(id => id !== batchId));
      fetchNearby();
      fetchMyClaims();
    } else {
      const data = await res.json();
      setIsError(true);
      setMsg(data.error || 'Failed to request batch.');
    }
  };

  const toggleBatchSelection = (batchId) => {
    setSelectedBatchIds(prev =>
      prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
    );
  };

  const handleOptimizeRoute = async (useAllVisible = false) => {
    setRouteLoading(true);
    try {
      const idsToOptimize = useAllVisible
        ? batches.slice(0, 10).map(b => b.batch_id)
        : selectedBatchIds;

      const res = await fetch('/api/batches/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          batch_ids: idsToOptimize.length > 0 ? idsToOptimize : undefined,
          lat: coords.lat || receiverCenter?.latitude,
          lng: coords.lng || receiverCenter?.longitude,
          city: activeSearchCity || batches[0]?.delivery_city || 'New York',
          max_capacity_kg: maxCapacityKg
        })
      });
      if (res.status === 401) return logout();
      if (res.ok) {
        const data = await res.json();
        setOptimizedRoute(data);
      }
    } catch (err) {
      console.error('Route optimization failed:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleClaimEntireRoute = async () => {
    if (!optimizedRoute || !optimizedRoute.stops || optimizedRoute.stops.length === 0) return;
    if (!charityName || !charityAddress) {
      setIsError(true);
      setMsg('Please fill out your Charity Name and Address before claiming the route.');
      return;
    }

    let claimedCount = 0;
    for (const stop of optimizedRoute.stops) {
      const res = await fetch('/api/claims/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ batch_id: stop.batch_id, charity_name: charityName, charity_address: charityAddress })
      });
      if (res.ok) claimedCount++;
    }

    setIsError(false);
    setMsg(`Requested ${claimedCount} stops from your optimized pickup route!`);
    setOptimizedRoute(null);
    setSelectedBatchIds([]);
    fetchNearby();
    fetchMyClaims();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearchCity(searchInput);
  };

  // Compute interactive SVG map projection bounds
  const mapCenter = optimizedRoute?.origin || receiverCenter || (batches[0] ? { latitude: batches[0].latitude || 40.7128, longitude: batches[0].longitude || -74.006 } : { latitude: 40.7128, longitude: -74.006 });
  const projectPoint = (lat, lng) => {
    const dLat = (lat - mapCenter.latitude) * 111; // km north/south
    const dLng = (lng - mapCenter.longitude) * 111 * Math.cos((mapCenter.latitude * Math.PI) / 180); // km east/west
    const scale = 22; // pixels per km
    const x = Math.max(24, Math.min(576, 300 + dLng * scale));
    const y = Math.max(24, Math.min(256, 140 - dLat * scale));
    return { x, y };
  };

  return (
    <div className="page-padding">
      <h2 className="features-header">Receiver & Smart Dispatch Dashboard</h2>
      <p style={{ marginBottom: '20px' }}>Welcome back, {user?.name}.</p>

      {user?.is_verified === false && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Account Pending Verification</strong>
          <p style={{ margin: 0 }}>You cannot claim food batches until an admin approves your organization.</p>
        </div>
      )}

      {urgentAlert && urgentAlert.count > 0 && (
        <div style={{ backgroundColor: '#fffbeb', borderLeft: '5px solid #d97706', padding: '14px 18px', borderRadius: '6px', marginBottom: '20px', color: '#92400e' }}>
          <strong>Urgent Pickup Alert:</strong> {urgentAlert.count} nearby food batch(es) are expiring soon and need immediate pickup!
        </div>
      )}

      {/* Geospatial & Smart Dispatch Filter Bar */}
      <div style={{ backgroundColor: 'var(--color-light-tan)', padding: '20px', borderRadius: '8px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="input-field"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: '200px', marginBottom: 0 }}
              placeholder="City (e.g. New York)"
            />
            <button type="submit" className="btn-dark" style={{ padding: '8px 16px', width: 'auto' }}>Filter City</button>
          </form>

          <button
            type="button"
            onClick={handleUseMyLocation}
            style={{
              padding: '8px 14px',
              borderRadius: '4px',
              border: '1px solid var(--color-dark-brown)',
              backgroundColor: 'white',
              color: 'var(--color-dark-brown)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
          >
            Use My GPS Location
          </button>

          <select
            className="input-field"
            value={radiusKm}
            onChange={e => setRadiusKm(e.target.value)}
            style={{ width: '150px', marginBottom: 0 }}
          >
            <option value="">All Distances</option>
            <option value="5">Within 5 km</option>
            <option value="15">Within 15 km</option>
            <option value="30">Within 30 km</option>
            <option value="50">Within 50 km</option>
          </select>

          <select
            className="input-field"
            value={dietaryTag}
            onChange={e => setDietaryTag(e.target.value)}
            style={{ width: '160px', marginBottom: 0 }}
          >
            <option value="">All Dietary Types</option>
            <option value="Vegan">Vegan</option>
            <option value="Gluten-Free">Gluten-Free</option>
            <option value="Halal">Halal</option>
            <option value="Dairy-Free">Dairy-Free</option>
            <option value="Nut-Free">Nut-Free</option>
          </select>

          <select
            className="input-field"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ width: '210px', marginBottom: 0 }}
          >
            <option value="match_score">Sort: Best Match</option>
            <option value="distance">Sort: Closest Distance</option>
            <option value="expiry">Sort: Expiring Soonest</option>
            <option value="spoilage_risk">Sort: Highest Priority</option>
          </select>
        </div>
        {gpsStatus && <div style={{ fontSize: '0.82rem', color: '#555' }}>{gpsStatus}</div>}
      </div>

      {msg && <div className={`status-message${isError ? ' status-error' : ''}`} style={{ marginBottom: '20px' }}>{msg}</div>}

      {/* Interactive Geospatial Radar & Multi-Stop Route Optimizer Panel */}
      <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', marginBottom: '35px' }}>
        {/* Live SVG Geospatial Map */}
        <div style={{ flex: '1 1 360px', backgroundColor: '#1e293b', color: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: '#f5eedc' }}>Live Pickup Map</h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Center: ({mapCenter.latitude?.toFixed(3)}, {mapCenter.longitude?.toFixed(3)})
            </span>
          </div>
          <svg viewBox="0 0 600 280" style={{ width: '100%', height: '240px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
            {/* Radar concentric distance rings */}
            <circle cx="300" cy="140" r="44" fill="none" stroke="#1e293b" strokeDasharray="4 4" />
            <circle cx="300" cy="140" r="88" fill="none" stroke="#1e293b" strokeDasharray="4 4" />
            <circle cx="300" cy="140" r="132" fill="none" stroke="#1e293b" strokeDasharray="4 4" />
            <text x="305" y="94" fill="#475569" fontSize="9">~2 km</text>
            <text x="305" y="50" fill="#475569" fontSize="9">~4 km</text>

            {/* Draw optimized route polyline if calculated */}
            {optimizedRoute && optimizedRoute.stops && optimizedRoute.stops.length > 0 && (() => {
              const pts = [
                { x: 300, y: 140 },
                ...optimizedRoute.stops.map(s => projectPoint(s.latitude, s.longitude))
              ];
              const polyStr = pts.map(p => `${p.x},${p.y}`).join(' ');
              return (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6 3"
                  points={polyStr}
                />
              );
            })()}

            {/* Batch pins */}
            {batches.map(b => {
              if (b.latitude == null || b.longitude == null) return null;
              const pt = projectPoint(b.latitude, b.longitude);
              const routeStop = optimizedRoute?.stops?.find(s => s.batch_id === b.batch_id);
              const isSelected = selectedBatchIds.includes(b.batch_id);
              const pinColor = b.risk_tier === 'Critical' ? '#ef4444' : isSelected ? '#38bdf8' : '#22c55e';
              return (
                <g key={b.batch_id} style={{ cursor: 'pointer' }} onClick={() => toggleBatchSelection(b.batch_id)}>
                  <circle cx={pt.x} cy={pt.y} r={routeStop ? 10 : 7} fill={pinColor} stroke="#fff" strokeWidth="1.5" />
                  {routeStop && (
                    <text x={pt.x} y={pt.y + 3} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">
                      {routeStop.stop_number}
                    </text>
                  )}
                  <title>{`${b.donor_name}: ${b.description} (${b.weight_kg} kg) — Match: ${b.match_score}%`}</title>
                </g>
              );
            })}

            {/* NGO Origin Marker */}
            <circle cx="300" cy="140" r="8" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
            <text x="300" y="160" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">YOU (NGO)</text>
          </svg>
          <div style={{ display: 'flex', gap: '15px', fontSize: '0.75rem', marginTop: '8px', color: '#cbd5e1', flexWrap: 'wrap' }}>
            <span><strong style={{ color: '#f59e0b' }}>[NGO]</strong> Your Location</span>
            <span><strong style={{ color: '#22c55e' }}>[Available]</strong> Active Batch</span>
            <span><strong style={{ color: '#ef4444' }}>[Urgent]</strong> Expiring Soon</span>
            <span><strong style={{ color: '#38bdf8' }}>[Route]</strong> Selected Stop</span>
          </div>
        </div>

        {/* Multi-Stop Route Planner Controls & Manifest */}
        <div style={{ flex: '1 1 360px', backgroundColor: 'white', borderRadius: '10px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
          <h4 style={{ fontSize: '1.2rem', color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
            Multi-Stop Pickup Route Planner
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '12px' }}>
            Finds the shortest pickup sequence across multiple donors while respecting each batch&apos;s expiry time and your vehicle capacity.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 'bold' }}>
              Vehicle Max Capacity (kg):
              <input
                type="number"
                min="10"
                max="2000"
                value={maxCapacityKg}
                onChange={e => setMaxCapacityKg(Number(e.target.value) || 120)}
                style={{ width: '80px', marginLeft: '8px', padding: '4px 6px' }}
              />
            </label>
            <button
              type="button"
              onClick={() => handleOptimizeRoute(false)}
              disabled={routeLoading}
              className="btn-dark"
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.82rem' }}
            >
              {routeLoading ? 'Planning Route...' : selectedBatchIds.length > 0 ? `Plan Route (${selectedBatchIds.length} Stops)` : 'Auto-Plan Best Route'}
            </button>
          </div>

          {optimizedRoute && optimizedRoute.stops && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.83rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                <div><strong>Stops:</strong> {optimizedRoute.metrics.total_stops}</div>
                <div><strong>Distance:</strong> {optimizedRoute.metrics.total_distance_km} km {optimizedRoute.metrics.optimization_improvement_pct > 0 && <span style={{ color: '#16a34a' }}>(-{optimizedRoute.metrics.optimization_improvement_pct}%)</span>}</div>
                <div><strong>Est. Time:</strong> {optimizedRoute.metrics.total_duration_minutes} min</div>
                <div><strong>Payload:</strong> {optimizedRoute.metrics.total_weight_kg} kg ({optimizedRoute.metrics.equivalent_meals} meals)</div>
                <div><strong>Net CO₂ Saved:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{optimizedRoute.metrics.net_co2_saved_kg} kg</span></div>
              </div>
              {optimizedRoute.stops.length === 0 ? (
                <div style={{ color: '#b91c1c' }}>No feasible stops fit within vehicle capacity and expiry windows.</div>
              ) : (
                <>
                  <div style={{ maxHeight: '130px', overflowY: 'auto', marginBottom: '10px' }}>
                    {optimizedRoute.stops.map(s => (
                      <div key={s.batch_id} style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <strong>Stop #{s.stop_number}: {s.donor_name}</strong> — {s.description} ({s.weight_kg} kg)<br />
                        <span style={{ color: '#475569', fontSize: '0.78rem' }}>
                          Leg: {s.leg_distance_km} km | Arrive: +{s.arrival_eta_minutes} min | Expiry Slack: {s.remaining_slack_minutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleClaimEntireRoute}
                    disabled={user?.is_verified === false}
                    className="btn-dark"
                    style={{ backgroundColor: '#16a34a', border: 'none', padding: '8px 14px', fontSize: '0.83rem' }}
                  >
                    Claim All {optimizedRoute.stops.length} Stops in Route
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Available Food */}
        <div style={{ flex: '1 1 420px', maxWidth: '100%' }}>
          <div style={{ backgroundColor: 'var(--color-light-tan)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Confirm Your Pickup Details</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" className="input-field" placeholder="Charity Name" value={charityName} onChange={e => setCharityName(e.target.value)} style={{ marginBottom: 0, flex: '1 1 180px' }} />
              <input type="text" className="input-field" placeholder="Your Address" value={charityAddress} onChange={e => setCharityAddress(e.target.value)} style={{ marginBottom: 0, flex: '1 1 220px' }} />
            </div>
          </div>

          <h3 className="form-title">{activeSearchCity ? `Available Food in ${activeSearchCity}` : 'Available Food Nearby'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
            {batches.length === 0 ? <p>No food available {activeSearchCity ? `in ${activeSearchCity}` : ''} matching your filters.</p> : batches.map(b => {
              const isSelected = selectedBatchIds.includes(b.batch_id);
              return (
                <div key={b.batch_id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: `5px solid ${b.risk_tier === 'Critical' ? '#ef4444' : b.match_score >= 75 ? '#16a34a' : '#eab308'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{b.description}</h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {b.match_score != null && (
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 9px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                          {b.match_score}% Match
                        </span>
                      )}
                      {b.risk_tier && (
                        <span style={{
                          backgroundColor: b.risk_tier === 'Critical' ? '#fef2f2' : b.risk_tier === 'Moderate' ? '#fefce8' : '#f1f5f9',
                          color: b.risk_tier === 'Critical' ? '#dc2626' : b.risk_tier === 'Moderate' ? '#a16207' : '#475569',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold'
                        }}>
                          Priority: {b.risk_tier === 'Critical' ? 'Urgent' : b.risk_tier}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ color: '#555', marginBottom: '12px', fontSize: '0.92rem', lineHeight: '1.5' }}>
                    <strong>Type:</strong> {b.batch_type} | <strong>Weight:</strong> {b.weight_kg} kg (~{Math.floor((parseFloat(b.weight_kg) || 0) / 0.5)} meals)<br />
                    <strong>Donor:</strong> {b.donor_name} | <strong>City:</strong> {b.delivery_city}<br />
                    <strong>Address:</strong> {b.address}<br />
                    {b.distance_km != null && (
                      <span><strong>Distance:</strong> {b.distance_km} km | <strong>Est. Travel:</strong> ~{b.eta_minutes} min | </span>
                    )}
                    {b.remaining_hours != null && (
                      <span><strong>Shelf Life Left:</strong> {b.remaining_hours}h</span>
                    )}
                  </p>

                  {Array.isArray(b.dietary_tags) && b.dietary_tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {b.dietary_tags.map(tag => (
                        <span key={tag} style={{ backgroundColor: '#f5eedc', color: 'var(--color-dark-brown)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => requestBatch(b.batch_id)}
                      className="btn-dark"
                      style={{ width: 'auto', padding: '9px 18px', opacity: user?.is_verified === false ? 0.5 : 1, cursor: user?.is_verified === false ? 'not-allowed' : 'pointer' }}
                      disabled={user?.is_verified === false}
                    >
                      Request Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBatchSelection(b.batch_id)}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-dark-brown)',
                        backgroundColor: isSelected ? 'var(--color-dark-brown)' : 'transparent',
                        color: isSelected ? 'white' : 'var(--color-dark-brown)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {isSelected ? '[In Route Cart]' : '+ Add to Multi-Stop Route'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Claims / Tickets */}
        <div style={{ flex: '1 1 300px', maxWidth: '100%' }}>
          <div style={{ backgroundColor: 'var(--color-light-tan)', padding: '30px', borderRadius: '8px' }}>
            <h3 className="form-title">My Tickets</h3>
            <p style={{ marginBottom: '20px', color: '#555' }}>Check the status of your requests here.</p>
            {myClaims.length === 0 ? <p>You have not made any requests yet.</p> : myClaims.map(c => (
              <div key={c.claim_id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '10px', borderLeft: `5px solid ${c.pickup_status === 'completed' ? '#16a34a' : '#eab308'}` }}>
                <strong>{c.description}</strong> ({c.weight_kg} kg)<br />
                Donor: {c.donor_name} <br />
                Address: {c.donor_address} <br />
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
