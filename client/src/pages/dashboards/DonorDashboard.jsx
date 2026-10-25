import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const DIETARY_OPTIONS = ['Vegan', 'Gluten-Free', 'Halal', 'Dairy-Free', 'Nut-Free'];

/**
 * Resizes image to a compact JPEG data URL for fast transmission to the vision model
 * and extracts color/spatial statistics + connected-component regions.
 */
function processUploadedFoodImage(img) {
  // 1. Create compact 320px JPEG for server-side Food-101 & Google ViT inference
  const maxDim = 320;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 320, img.naturalHeight || 320));
  const outW = Math.max(64, Math.round((img.naturalWidth || 320) * scale));
  const outH = Math.max(64, Math.round((img.naturalHeight || 320) * scale));

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = outW;
  exportCanvas.height = outH;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.drawImage(img, 0, 0, outW, outH);
  const compressedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.85);

  // 2. Extract visual profile & connected-component regions on 96x96 grid
  const W = 96;
  const H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  const { data: pixels } = ctx.getImageData(0, 0, W, H);
  const totalPx = W * H;

  let greenCount = 0;
  let warmCount = 0;
  let goldenCount = 0;
  let whiteCount = 0;
  let redOrangeCount = 0;
  let darkBrownCount = 0;
  let sumBrightness = 0;
  let sumSaturation = 0;
  const fgMask = new Uint8Array(totalPx);

  let bgR = 0, bgG = 0, bgB = 0, borderCnt = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 4 || x >= W - 4 || y < 4 || y >= H - 4) {
        const idx = (y * W + x) * 4;
        bgR += pixels[idx];
        bgG += pixels[idx + 1];
        bgB += pixels[idx + 2];
        borderCnt++;
      }
    }
  }
  bgR /= borderCnt || 1;
  bgG /= borderCnt || 1;
  bgB /= borderCnt || 1;

  for (let p = 0; p < totalPx; p++) {
    const idx = p * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const delta = maxC - minC;
    const sat = maxC === 0 ? 0 : delta / maxC;
    const bright = (r + g + b) / (3 * 255);

    sumBrightness += bright * 255;
    sumSaturation += sat;

    if (g > r * 1.08 && g > b * 1.12 && sat > 0.15) greenCount++;
    if (r > b * 1.25 && g > b * 1.1 && r >= g * 0.85) warmCount++;
    if (r > 135 && g > 95 && b < 110 && r > g && g > b && sat > 0.22) goldenCount++;
    if (bright > 0.72 && sat < 0.22) whiteCount++;
    if (r > g * 1.22 && r > b * 1.35 && sat > 0.25) redOrangeCount++;
    if (bright < 0.35 && r > b && g >= b * 0.9) darkBrownCount++;

    const colorDist = Math.sqrt(
      Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
    );
    if (colorDist > 38 || sat > 0.28) {
      fgMask[p] = 1;
    }
  }

  const GW = 24;
  const GH = 24;
  const cellW = W / GW;
  const cellH = H / GH;
  const grid = new Uint8Array(GW * GH);

  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      let active = 0;
      for (let dy = 0; dy < cellH; dy++) {
        for (let dx = 0; dx < cellW; dx++) {
          const px = Math.floor(gx * cellW + dx);
          const py = Math.floor(gy * cellH + dy);
          if (fgMask[py * W + px]) active++;
        }
      }
      if (active >= (cellW * cellH) * 0.45) {
        grid[gy * GW + gx] = 1;
      }
    }
  }

  const visited = new Uint8Array(GW * GH);
  const boundingBoxes = [];

  for (let gy = 1; gy < GH - 1; gy++) {
    for (let gx = 1; gx < GW - 1; gx++) {
      const startIdx = gy * GW + gx;
      if (grid[startIdx] && !visited[startIdx]) {
        const queue = [startIdx];
        visited[startIdx] = 1;
        let minX = gx, maxX = gx, minY = gy, maxY = gy, cells = 0;

        while (queue.length > 0) {
          const curr = queue.shift();
          const cy = Math.floor(curr / GW);
          const cx = curr % GW;
          cells++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1]
          ];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < GW && ny >= 0 && ny < GH) {
              const nIdx = ny * GW + nx;
              if (grid[nIdx] && !visited[nIdx]) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }

        if (cells >= 3 && cells <= GW * GH * 0.75) {
          boundingBoxes.push({
            x: minX / GW,
            y: minY / GH,
            w: (maxX - minX + 1) / GW,
            h: (maxY - minY + 1) / GH
          });
        }
      }
    }
  }

  if (boundingBoxes.length === 0) {
    boundingBoxes.push({ x: 0.12, y: 0.12, w: 0.76, h: 0.76 });
  }

  const visualProfile = {
    greenRatio: Number((greenCount / totalPx).toFixed(3)),
    warmRatio: Number((warmCount / totalPx).toFixed(3)),
    goldenRatio: Number((goldenCount / totalPx).toFixed(3)),
    whiteRatio: Number((whiteCount / totalPx).toFixed(3)),
    redOrangeRatio: Number((redOrangeCount / totalPx).toFixed(3)),
    darkBrownRatio: Number((darkBrownCount / totalPx).toFixed(3)),
    brightness: Math.round(sumBrightness / totalPx),
    saturation: Number((sumSaturation / totalPx).toFixed(3)),
    objectCount: Math.max(1, Math.min(25, boundingBoxes.length))
  };

  return { compressedDataUrl, visualProfile, boundingBoxes };
}

export default function DonorDashboard() {
  const { user, token, logout } = useAuth();
  const [batches, setBatches] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [form, setForm] = useState({
    description: '',
    batch_type: 'Dry_Goods',
    weight_kg: '',
    expiry_hours: '24',
    delivery_city: '',
    donor_name: user?.name || '',
    pickup_address: user?.address || '',
    latitude: '',
    longitude: '',
    dietary_tags: []
  });
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  // Smart Food Auto-Tagger & Shelf-Life Estimator state
  const [aiNotes, setAiNotes] = useState('');
  const [aiFileName, setAiFileName] = useState('');
  const [aiImageDataUrl, setAiImageDataUrl] = useState(null);
  const [aiVisualProfile, setAiVisualProfile] = useState(null);
  const [aiBoundingBoxes, setAiBoundingBoxes] = useState([]);
  const [aiPreviewUrl, setAiPreviewUrl] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');

  const previewCanvasRef = useRef(null);
  const weightInputRef = useRef(null);

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
    if (res.ok) {
      const data = await res.json();
      setPendingRequests(Array.isArray(data) ? data : []);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchBatches();
    fetchPendingRequests();

    let eventSource;
    try {
      eventSource = new EventSource('/api/stream/inventory');
      eventSource.onmessage = () => {
        fetchBatches();
        fetchPendingRequests();
      };
    } catch (_e) {
      // Fallback to polling if SSE fails
    }

    const interval = setInterval(() => {
      fetchBatches();
      fetchPendingRequests();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [fetchBatches, fetchPendingRequests]);

  // Draw preview image + detected item boxes
  useEffect(() => {
    if (!aiPreviewUrl || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const cw = 260;
      const ch = 150;
      canvas.width = cw;
      canvas.height = ch;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);

      aiBoundingBoxes.forEach((box, idx) => {
        const bx = box.x * cw;
        const by = box.y * ch;
        const bw = box.w * cw;
        const bh = box.h * ch;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = 'rgba(22, 101, 52, 0.85)';
        ctx.fillRect(bx, Math.max(0, by - 16), 54, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`Item #${idx + 1}`, bx + 4, Math.max(11, by - 4));
      });
    };
    img.src = aiPreviewUrl;
  }, [aiPreviewUrl, aiBoundingBoxes]);

  const runFoodAnalysis = useCallback(async ({
    notesOverride,
    fileNameOverride,
    imageDataUrlOverride,
    visualProfileOverride
  }) => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/batches/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: notesOverride !== undefined ? notesOverride : (aiNotes || form.description),
          fileName: fileNameOverride !== undefined ? fileNameOverride : aiFileName,
          imageDataUrl: imageDataUrlOverride !== undefined ? imageDataUrlOverride : aiImageDataUrl,
          visualProfile: visualProfileOverride !== undefined ? visualProfileOverride : aiVisualProfile
        })
      });

      if (res.status === 401 || res.status === 403) {
        setAiError('Your session expired. Please log in again.');
        return logout();
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setAiError(errData.error || 'Could not analyze food item.');
        return;
      }

      const analysis = await res.json();
      setAiResult(analysis);

      if (Array.isArray(analysis.bounding_boxes) && analysis.bounding_boxes.length > 0) {
        setAiBoundingBoxes(analysis.bounding_boxes);
      }

      setForm(prev => ({
        ...prev,
        description: analysis.description || prev.description,
        batch_type: analysis.batch_type || prev.batch_type,
        // Only fill weight_kg if explicit kg/g/lb was provided; otherwise leave blank for user to input
        weight_kg: analysis.weight_detected && analysis.weight_kg !== '' ? String(analysis.weight_kg) : '',
        expiry_hours: String(analysis.expiry_hours || prev.expiry_hours),
        dietary_tags: Array.isArray(analysis.dietary_tags) ? analysis.dietary_tags : prev.dietary_tags
      }));

      if (!analysis.weight_detected && weightInputRef.current) {
        weightInputRef.current.focus();
      }
    } catch (err) {
      console.error('Food analysis error:', err);
      setAiError('Network error while analyzing food item.');
    } finally {
      setAiLoading(false);
    }
  }, [token, aiNotes, form.description, aiFileName, aiImageDataUrl, aiVisualProfile, logout]);

  const handleImageSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAiFileName(file.name);
    setAiError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAiPreviewUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        try {
          const { compressedDataUrl, visualProfile, boundingBoxes } = processUploadedFoodImage(img);
          setAiImageDataUrl(compressedDataUrl);
          setAiVisualProfile(visualProfile);
          setAiBoundingBoxes(boundingBoxes);
          runFoodAnalysis({
            notesOverride: aiNotes,
            fileNameOverride: file.name,
            imageDataUrlOverride: compressedDataUrl,
            visualProfileOverride: visualProfile
          });
        } catch (_err) {
          setAiVisualProfile(null);
          setAiBoundingBoxes([]);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAiAnalyze = () => {
    runFoodAnalysis({});
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.');
      return;
    }
    setGpsStatus('Detecting GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setGpsStatus(`Locked GPS: (${lat}, ${lng})`);
      },
      () => {
        setGpsStatus('Could not access GPS. City location will be used automatically.');
      }
    );
  };

  const toggleDietaryTag = (tag) => {
    setForm(prev => {
      const exists = prev.dietary_tags.includes(tag);
      return {
        ...prev,
        dietary_tags: exists
          ? prev.dietary_tags.filter(t => t !== tag)
          : [...prev.dietary_tags, tag]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setIsError(false);
      setMsg('Food batch posted successfully!');
      setForm(prev => ({
        ...prev,
        description: '',
        batch_type: 'Dry_Goods',
        weight_kg: '',
        expiry_hours: '24',
        delivery_city: '',
        dietary_tags: []
      }));
      setAiResult(null);
      setAiNotes('');
      setAiFileName('');
      setAiImageDataUrl(null);
      setAiVisualProfile(null);
      setAiBoundingBoxes([]);
      setAiPreviewUrl('');
      fetchBatches();
    } else {
      const errData = await res.json().catch(() => ({}));
      setIsError(true);
      setMsg(errData.error || 'Failed to post batch.');
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
      fetchBatches();
    } else {
      alert('Failed to accept request.');
    }
  };

  return (
    <div className="page-padding" style={{ backgroundColor: 'var(--color-light-tan)', minHeight: '100vh' }}>
      <h2 className="features-header">Donor Dashboard</h2>
      <p style={{ marginBottom: '20px' }}>Welcome back, {user?.name}</p>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Post Form */}
        <div className="quote-form-container" style={{ position: 'relative', right: '0', bottom: '0', flex: '1 1 380px', maxWidth: '100%', boxSizing: 'border-box' }}>
          <h3 className="form-title">Post Surplus Food</h3>

          {/* Smart Food Auto-Tagger & Shelf-Life Estimator */}
          <div style={{ backgroundColor: '#f8f4eb', border: '1px dashed var(--color-dark-brown)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <strong style={{ color: 'var(--color-dark-brown)', fontSize: '0.95rem' }}>
                Smart Food Auto-Tagger &amp; Shelf-Life Estimator
              </strong>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '10px' }}>
              Upload a photo of your food or describe the items in plain text to auto-fill the food type, count the quantity, and set safe expiry hours.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ fontSize: '0.8rem', marginBottom: '10px', width: '100%' }}
            />
            {aiPreviewUrl && (
              <div style={{ marginBottom: '10px' }}>
                <canvas
                  ref={previewCanvasRef}
                  style={{ width: '260px', height: '150px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'block' }}
                />
              </div>
            )}
            <input
              type="text"
              className="input-field"
              placeholder="Or describe items (e.g. '40 vegan salad bowls' or '12 loaves bread 6 kg')"
              value={aiNotes}
              onChange={e => setAiNotes(e.target.value)}
              style={{ marginBottom: '10px', fontSize: '0.85rem' }}
            />
            <button
              type="button"
              onClick={handleAiAnalyze}
              disabled={aiLoading}
              className="btn-dark"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              {aiLoading ? 'Detecting Food...' : 'Auto-Fill Details'}
            </button>

            {aiError && (
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#991b1b', backgroundColor: '#fef2f2', padding: '8px 10px', borderRadius: '4px', border: '1px solid #f87171' }}>
                {aiError}
              </div>
            )}

            {aiResult && (
              <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#332015', backgroundColor: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', lineHeight: '1.55' }}>
                <div>
                  <strong>Detected Food:</strong> {aiResult.detected_food_item} ({aiResult.batch_type.replace('_', ' ')})
                </div>
                <div>
                  <strong>Quantity:</strong> {aiResult.detected_item_count} {aiResult.detected_item_unit || 'items'}
                </div>
                <div>
                  <strong>Weight (kg):</strong>{' '}
                  {aiResult.weight_detected ? (
                    <span style={{ color: '#166534', fontWeight: 'bold' }}>{aiResult.weight_kg} kg (~{aiResult.estimated_meals} meals)</span>
                  ) : (
                    <span style={{ color: '#b45309', fontWeight: 'bold' }}>
                      Please enter the weight in kg below
                    </span>
                  )}
                </div>
                <div>
                  <strong>Recommended Shelf Life:</strong> {aiResult.expiry_hours} Hours
                </div>
                <div>
                  <strong>Storage Note:</strong> {aiResult.safety_note}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <input type="text" className="input-field" placeholder="Donor Name (e.g. Good Bistro)" value={form.donor_name} onChange={e => setForm({ ...form, donor_name: e.target.value })} required />
            <input type="text" className="input-field" placeholder="Exact Pickup Address" value={form.pickup_address} onChange={e => setForm({ ...form, pickup_address: e.target.value })} required />

            <input type="text" className="input-field" placeholder="Description (e.g. 50 sandwiches)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            <select className="input-field" value={form.batch_type} onChange={e => setForm({ ...form, batch_type: e.target.value })}>
              <option value="Dry_Goods">Dry Goods</option>
              <option value="Refrigerated">Refrigerated</option>
              <option value="Produce">Produce (Fruits/Vegetables)</option>
              <option value="Prepared_Meals">Prepared Meals</option>
              <option value="Baked_Goods">Baked Goods</option>
              <option value="Dairy">Dairy</option>
              <option value="Beverages">Beverages</option>
              <option value="Other">Other</option>
            </select>
            <input
              ref={weightInputRef}
              type="number"
              min="0.1"
              step="any"
              className="input-field"
              placeholder={aiResult && !aiResult.weight_detected ? 'Enter Weight in kg (Required)' : 'Weight (kg)'}
              value={form.weight_kg}
              onChange={e => setForm({ ...form, weight_kg: e.target.value })}
              style={aiResult && !aiResult.weight_detected && !form.weight_kg ? { border: '2px solid #d97706', backgroundColor: '#fffbeb' } : undefined}
              required
            />
            <select className="input-field" value={form.expiry_hours} onChange={e => setForm({ ...form, expiry_hours: e.target.value })}>
              <option value="12">Expires in 12 Hours</option>
              <option value="24">Expires in 24 Hours</option>
              <option value="48">Expires in 48 Hours</option>
            </select>
            <input type="text" className="input-field" placeholder="Delivery City (e.g. Chicago)" value={form.delivery_city} onChange={e => setForm({ ...form, delivery_city: e.target.value })} required />

            {/* Dietary Tags */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-dark-brown)' }}>
                Dietary &amp; Allergen Tags:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {DIETARY_OPTIONS.map(tag => {
                  const active = form.dietary_tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDietaryTag(tag)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '0.8rem',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        border: '1px solid var(--color-dark-brown)',
                        backgroundColor: active ? 'var(--color-dark-brown)' : 'transparent',
                        color: active ? 'white' : 'var(--color-dark-brown)'
                      }}
                    >
                      {active ? `[Selected] ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Geolocation Pinning */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleUseGps}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-dark-brown)',
                  backgroundColor: '#f5eedc',
                  color: 'var(--color-dark-brown)',
                  cursor: 'pointer'
                }}
              >
                Use Current GPS Location
              </button>
              {gpsStatus && <span style={{ fontSize: '0.8rem', color: '#555' }}>{gpsStatus}</span>}
            </div>

            <button type="submit" className="btn-dark">Post Batch</button>
            {msg && <div className={`status-message${isError ? ' status-error' : ''}`}>{msg}</div>}
          </form>
        </div>

        {/* Pending Requests & Listings */}
        <div style={{ flex: '1 1 380px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <h3 className="form-title">Incoming Requests</h3>
            {pendingRequests.length === 0 ? <p>No pending requests.</p> : pendingRequests.map(r => (
              <div key={r.claim_id} style={{ padding: '15px', border: '1px solid #eab308', backgroundColor: '#fefce8', marginBottom: '10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <strong>{r.description}</strong> ({r.weight_kg} kg)<br />
                    Requested by: <strong>{r.charity_name}</strong><br />
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
              <div key={b.batch_id} style={{ padding: '15px', borderBottom: '1px solid #ccc', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>{b.description}</strong> ({b.weight_kg} kg) — <span style={{ fontSize: '0.85rem', color: '#666' }}>{b.batch_type.replace('_', ' ')}</span><br />
                  Status: <span style={{ fontWeight: 'bold', color: b.status === 'locked' ? '#eab308' : b.status === 'claimed' ? '#2563eb' : b.status === 'expired' ? '#dc2626' : '#16a34a' }}>{b.status}</span>
                </div>
                {b.status === 'available' && b.risk_tier && (
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    backgroundColor: b.risk_tier === 'Critical' ? '#fef2f2' : b.risk_tier === 'Moderate' ? '#fefce8' : '#f0fdf4',
                    color: b.risk_tier === 'Critical' ? '#dc2626' : b.risk_tier === 'Moderate' ? '#a16207' : '#166534',
                    border: `1px solid ${b.risk_tier === 'Critical' ? '#f87171' : b.risk_tier === 'Moderate' ? '#fde047' : '#86efac'}`
                  }}>
                    Pickup Priority: {b.risk_tier === 'Critical' ? 'Urgent' : b.risk_tier}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
