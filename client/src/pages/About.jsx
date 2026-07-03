export default function About() { 
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">About SharePlate</h1>
        <div className="header-content">
          <p className="header-text">
            Bridging the gap between surplus food and food insecurity.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto' }}>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--color-text-dark)', marginBottom: '30px' }}>
            SharePlate was founded with a single mission: to bridge the gap between surplus food and food insecurity.
            Every single day, restaurants and university mess halls prepare more food than they can sell, while nearby
            charities struggle to keep their pantries full. By creating a direct, real-time connection between donors
            and receivers, we eliminate the logistical friction that causes food waste.
          </p>
          <h3 style={{ fontSize: '2rem', color: 'var(--color-dark-brown)', marginBottom: '20px' }}>Our Core Values</h3>
          <ul style={{ lineHeight: '1.8', marginLeft: '20px', fontSize: '1.1rem', color: 'var(--color-text-dark)' }}>
            <li style={{ marginBottom: '10px' }}><strong>Zero Waste:</strong> Food belongs in stomachs, not landfills.</li>
            <li style={{ marginBottom: '10px' }}><strong>Community First:</strong> Empowering local NGOs to serve their neighborhoods.</li>
            <li style={{ marginBottom: '10px' }}><strong>Real-Time Action:</strong> Speed is critical when dealing with perishable goods.</li>
          </ul>
        </div>
      </section>
    </>
  ); 
}
