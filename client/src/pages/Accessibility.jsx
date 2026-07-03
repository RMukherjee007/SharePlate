export default function Accessibility() {
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">Accessibility Statement</h1>
        <div className="header-content">
          <p className="header-text">
            Committed to inclusive digital experiences.
          </p>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-card" style={{ padding: '40px', display: 'block', height: 'auto', backgroundColor: 'var(--color-white)' }}>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: 'var(--color-text-dark)', maxWidth: '800px' }}>
            SharePlate is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards. If you have any feedback or difficulty using our website, please contact our support team.
          </p>
        </div>
      </section>
    </>
  );
}
