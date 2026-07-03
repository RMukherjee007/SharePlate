export default function Donors() { 
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">For Food Donors</h1>
        <div className="header-content">
          <p className="header-text">
            Are you a restaurant, university mess hall, or catering service? Turn your daily surplus into community impact.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '15px' }}>Tax Deductions</h3>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Eligible donations can be written off, improving your bottom line while doing good.</p>
          </div>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '15px' }}>Zero-Waste Goals</h3>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Hit your sustainability targets effortlessly. Just post your batch and let charities come to you.</p>
          </div>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '15px' }}>Easy Tracking</h3>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Our dashboard lets you track exactly how many pounds of food you have diverted from landfills.</p>
          </div>
          <div className="feature-card" style={{ padding: '30px', display: 'block', height: 'auto' }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--color-dark-brown)', marginBottom: '15px' }}>Brand Loyalty</h3>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', lineHeight: '1.6' }}>Customers love businesses that care. Display your SharePlate badge proudly.</p>
          </div>
        </div>
      </section>
    </>
  ); 
}
