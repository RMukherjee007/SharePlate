import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './Analytics.css';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/forecast');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="analytics-loading">Loading Platform Analytics...</div>;
  if (error) return <div className="analytics-error">Error: {error}</div>;
  if (!data) return <div className="analytics-error">No data available.</div>;

  const ts = data.timeSeries;

  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">Platform Analytics &amp; Demand Forecast</h1>
        <div className="header-content">
          <p className="header-text">
            Track rescued food impact, upcoming 7-day community supply and demand projections, and regional distribution needs.
          </p>
        </div>
      </section>

      <section className="features-section">
        {/* Top KPI Cards */}
        <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto', backgroundColor: 'var(--color-dark-brown)', color: 'white' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-light-tan)' }}>Total Food Rescued</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.metrics.totalWeightRescued}</p>
          </div>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto', backgroundColor: 'var(--color-dark-brown)', color: 'white' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-light-tan)' }}>CO2 Prevented</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#68d391' }}>{data.metrics.co2Prevented}</p>
          </div>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto', backgroundColor: 'var(--color-dark-brown)', color: 'white' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-light-tan)' }}>Meals Provided</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f6ad55' }}>{data.metrics.equivalentMeals}</p>
          </div>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto', backgroundColor: 'var(--color-dark-brown)', color: 'white' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-light-tan)' }}>Rescue Rate</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.metrics.currentAllocationEfficiency}</p>
          </div>
        </div>

        {/* 7-Day Supply & Demand Forecast Chart */}
        {ts && ts.timeline && (
          <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', marginBottom: '40px', backgroundColor: 'var(--color-white)', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-dark-brown)', marginBottom: '6px' }}>
                7-Day Food Supply &amp; Demand Projection
              </h2>
              <p style={{ color: '#555', fontSize: '0.92rem' }}>
                Historical daily food donations and claims alongside projected community demand for the next 7 days.
              </p>
            </div>

            <div style={{ width: '100%', height: 380 }}>
              <ResponsiveContainer>
                <ComposedChart data={ts.timeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="var(--color-text-dark)" />
                  <YAxis stroke="var(--color-text-dark)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-white)', border: '1px solid var(--color-dark-brown)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--color-text-dark)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '15px' }} />
                  <Area type="monotone" dataKey="ciUpper" name="Peak Expected Demand (kg)" fill="#fef08a" stroke="none" fillOpacity={0.45} />
                  <Line type="monotone" dataKey="actualSupply" name="Donated Supply (kg)" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="actualDemand" name="Claimed Food (kg)" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="predictedDemand" name="Projected Demand (kg)" stroke="#d97706" strokeWidth={2.5} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Regional Supply vs Demand Bar Chart */}
        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', marginBottom: '40px', backgroundColor: 'var(--color-white)' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--color-dark-brown)', marginBottom: '30px' }}>Regional Supply vs. Demand (kg)</h2>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <BarChart
                data={data.forecast}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="city" stroke="var(--color-text-dark)" />
                <YAxis stroke="var(--color-text-dark)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-white)', border: '1px solid var(--color-dark-brown)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text-dark)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="supply" name="Total Supply (kg)" fill="var(--color-dark-brown)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="demand" name="Total Claimed (kg)" fill="#68d391" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Overview & Recommendations Table */}
        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', backgroundColor: 'var(--color-white)' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--color-dark-brown)', marginBottom: '30px' }}>
            City Overview &amp; Distribution Recommendations
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-light-tan)' }}>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>City</th>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>Area Status</th>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>Claim Rate</th>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>Unclaimed Expired</th>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {data.forecast.map((item, index) => {
                  const ratioNum = parseFloat(item.demandRatio) || 0;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px' }}>
                        <strong>{item.city}</strong>
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--color-dark-brown)' }}>
                        {item.zoneType || 'Balanced Area'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          backgroundColor: ratioNum > 0.8 ? '#fcd6d6' : ratioNum < 0.4 ? '#fef0cd' : '#d1f4e0',
                          color: ratioNum > 0.8 ? '#e53e3e' : ratioNum < 0.4 ? '#d69e2e' : '#2f855a'
                        }}>
                          {item.demandRatio}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        {item.spoilageRatePct != null ? `${item.spoilageRatePct}%` : '0%'}
                      </td>
                      <td style={{ padding: '15px', color: 'var(--color-text-dark)' }}>{item.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

export default Analytics;
