export default function HowToJoin() { 
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">How to Join</h1>
        <div className="header-content">
          <p className="header-text">
            Getting started with SharePlate is easy and takes just a few minutes.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <div className="feature-card" style={{ padding: '30px', display: 'flex', gap: '30px', alignItems: 'center', height: 'auto' }}>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--color-dark-brown)', opacity: 0.5, lineHeight: 1 }}>1</div>
            <div>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '10px' }}>Register Your Organization</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Use the Register form on the homepage to create an account. Choose whether you are a Food Donor or an NGO.</p>
            </div>
          </div>
          
          <div className="feature-card" style={{ padding: '30px', display: 'flex', gap: '30px', alignItems: 'center', height: 'auto' }}>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--color-dark-brown)', opacity: 0.5, lineHeight: 1 }}>2</div>
            <div>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '10px' }}>Log In</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Once registered, you can immediately log into your personalized dashboard using your email and password.</p>
            </div>
          </div>
          
          <div className="feature-card" style={{ padding: '30px', display: 'flex', gap: '30px', alignItems: 'center', height: 'auto' }}>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--color-dark-brown)', opacity: 0.5, lineHeight: 1 }}>3</div>
            <div>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '10px' }}>Start Rescuing Food</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Donors can begin listing surplus food, and NGOs can start claiming available batches instantly.</p>
            </div>
          </div>

        </div>
      </section>
    </>
  ); 
}
