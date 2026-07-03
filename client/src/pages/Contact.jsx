export default function Contact() { 
  return (
    <>
      <section className="header-section" style={{ padding: '80px 40px', minHeight: '30vh' }}>
        <h1 className="header-title">Get In Touch</h1>
        <div className="header-content">
          <p className="header-text">
            Have questions about the platform? Need help registering your organization? Send us a message and our support team will get back to you within 1 business day.
          </p>
        </div>
      </section>

      <section className="features-section" style={{ display: 'flex', gap: '60px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--color-dark-brown)', marginBottom: '30px' }}>Contact Information</h2>
          <div style={{ fontSize: '1.2rem', color: 'var(--color-text-dark)', lineHeight: '2' }}>
            <p><strong>Email:</strong> support@shareplate.org</p>
            <p><strong>Phone:</strong> 1-800-555-0199</p>
            <p><strong>Headquarters:</strong> 500 Surplus St. San Francisco, CA 94158</p>
          </div>
        </div>
        
        <div style={{ flex: 1, backgroundColor: 'var(--color-light-tan)', padding: '40px', minWidth: '300px', borderRadius: '8px' }}>
          <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your message has been sent successfully."); }}>
            <input type="text" placeholder="Your Name" className="input-field" style={{ marginBottom: '20px' }} required />
            <input type="email" placeholder="Your Email" className="input-field" style={{ marginBottom: '20px' }} required />
            <textarea placeholder="How can we help?" className="input-field" style={{ minHeight: '150px', marginBottom: '20px', resize: 'vertical' }} required></textarea>
            <button type="submit" className="btn-dark" style={{ width: '100%' }}>Send Message</button>
          </form>
        </div>
      </section>
    </>
  ); 
}
