export default function Privacy() {
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">Privacy Policy</h1>
        <div className="header-content">
          <p className="header-text">
            At SharePlate, your privacy is our priority.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', backgroundColor: 'var(--color-white)' }}>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: 'var(--color-text-dark)', maxWidth: '800px' }}>
            We collect basic information such as your name, email, and location to connect food donors with charities effectively. Your data is never sold to third parties. We use industry-standard security measures to protect your information and ensure safe transactions on our platform.
          </p>
        </div>
      </section>
    </>
  );
}
