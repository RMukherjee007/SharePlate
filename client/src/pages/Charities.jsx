export default function Charities() { 
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">For Charities & NGOs</h1>
        <div className="header-content">
          <p className="header-text">
            Tired of calling around to find food donations? Our platform brings the food to you.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', backgroundColor: 'var(--color-dark-brown)', color: 'white' }}>
          <h3 style={{ fontSize: '2rem', marginBottom: '30px' }}>How It Works for Receivers</h3>
          <ul style={{ lineHeight: '2', fontSize: '1.2rem', marginLeft: '20px' }}>
            <li style={{ marginBottom: '15px' }}><strong>City Search:</strong> See all available food batches in your delivery city instantly.</li>
            <li style={{ marginBottom: '15px' }}><strong>Instant Claims:</strong> Reserve food with a simple two-step request process.</li>
            <li style={{ marginBottom: '15px' }}><strong>Direct Pickup:</strong> Get the exact address and pickup instructions immediately upon approval.</li>
            <li style={{ marginBottom: '15px' }}><strong>Reliable Supply:</strong> Access high-quality meals from vetted local restaurants.</li>
          </ul>
        </div>
      </section>
    </>
  ); 
}
