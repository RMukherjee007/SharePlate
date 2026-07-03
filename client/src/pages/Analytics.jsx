import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  if (loading) return <div className="analytics-loading">Loading Analytics Dashboard...</div>;
  if (error) return <div className="analytics-error">Error: {error}</div>;
  if (!data) return <div className="analytics-error">No data available.</div>;

  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">Platform Analytics & Forecasting</h1>
        <div className="header-content">
          <p className="header-text">
            Real-time insights into food redistribution efficiency, environmental impact, and regional demand.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
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
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-light-tan)' }}>Allocation Efficiency</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.metrics.currentAllocationEfficiency}</p>
          </div>
        </div>

        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', marginBottom: '40px', backgroundColor: 'var(--color-white)' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--color-dark-brown)', marginBottom: '30px' }}>Regional Supply vs Demand (Weight in kg)</h2>
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

        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', backgroundColor: 'var(--color-white)' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--color-dark-brown)', marginBottom: '30px' }}>AI Forecasting Recommendations</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-light-tan)' }}>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>City</th>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>Demand Ratio</th>
                  <th style={{ padding: '15px', color: 'var(--color-dark-brown)' }}>Status / Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {data.forecast.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}><strong>{item.city}</strong></td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ 
                        padding: '5px 12px', 
                        borderRadius: '20px', 
                        fontWeight: 'bold',
                        backgroundColor: item.demandRatio > 0.8 ? '#fcd6d6' : item.demandRatio < 0.4 ? '#fef0cd' : '#d1f4e0',
                        color: item.demandRatio > 0.8 ? '#e53e3e' : item.demandRatio < 0.4 ? '#d69e2e' : '#2f855a'
                      }}>
                        {item.demandRatio}
                      </span>
                    </td>
                    <td style={{ padding: '15px', color: 'var(--color-text-dark)' }}>{item.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

export default Analytics;
