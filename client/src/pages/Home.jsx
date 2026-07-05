import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comments: '' });
  const [reviewStatus, setReviewStatus] = useState('');

  // Fetch reviews on mount
  useEffect(() => {
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(err => console.error("Failed to load reviews", err));
  }, []);

  const handleReviewChange = (e) => {
    setReviewForm({ ...reviewForm, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const user = await login(email, password);
      if (user.role === 'Restaurant') navigate('/donor');
      else if (user.role === 'NGO') navigate('/receiver');
      else if (user.role === 'Admin') navigate('/admin');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewStatus('Submitting...');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });
      if (response.ok) {
        setReviewStatus('Review submitted successfully!');
        setReviewForm({ rating: 5, comments: '' });
        // Refresh reviews
        fetch('/api/reviews').then(res => res.json()).then(data => setReviews(data));
      } else {
        const data = await response.json();
        setReviewStatus(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error(err);
      setReviewStatus('Network error.');
    }
  };
  const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;
  const reviewCount = reviews.length;

  const loginBox = user ? (
    <div className="quote-form-container">
      <h3 className="form-title">Welcome Back, {user.name}!</h3>
      <p style={{ marginBottom: '20px', fontSize: '1rem', color: '#666' }}>
        You are currently logged in as a {user.role === 'NGO' ? 'Charity/NGO' : user.role}.
      </p>
      <button 
        onClick={() => navigate(user.role === 'Restaurant' ? '/donor' : user.role === 'NGO' ? '/receiver' : '/admin')} 
        className="btn-dark"
        style={{ width: '100%', padding: '15px' }}
      >
        Go to Dashboard
      </button>
    </div>
  ) : (
    <div className="quote-form-container">
      <h3 className="form-title">Partner Login</h3>
      <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
        Log in to your dashboard to manage donations and claims.
      </p>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          className="input-field" 
          placeholder="Email Address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ marginBottom: '10px' }}
        />
        <input 
          type="password" 
          className="input-field" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" className="btn-dark">Log In</button>
        {loginError && <div className="status-message status-error" style={{marginTop: '15px'}}>{loginError}</div>}
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--color-dark-brown)', fontWeight: 'bold' }}>Register here</Link>
        </p>
      </form>
    </div>
  );

  return (
    <>
      {/* Header Section */}
      <section className="header-section">
        <h1 className="header-title">Bridging the Gap Between<br/>Surplus and Starvation</h1>
        <div className="header-content">
          <p className="header-text">
            Every day, tons of perfectly good food from mess halls and restaurants goes to waste. Our platform connects these food donors directly to NGOs and charities, ensuring surplus meals reach people in need instead of the landfill.
          </p>
        </div>
      </section>

      {/* Hero Image & Form Section */}
      <section className="hero-section">
        <div className="hero-overlay">
          <h1 className="hero-large-text">SharePlate</h1>
          <h2 className="hero-sub-text">Connecting Donors with Local NGOs Instantly</h2>
          
          <div style={{ marginTop: '30px', background: 'var(--color-light-tan)', padding: '15px 20px', display: 'inline-block', borderRadius: '4px' }}>
            <div style={{ color: 'var(--color-dark-brown)', fontSize: '1.2rem', marginBottom: '5px' }}>
              {Array.from({ length: Math.max(0, Math.round(averageRating)) }).map(() => '★').join('')}
              {Array.from({ length: 5 - Math.max(0, Math.round(averageRating)) }).map(() => '☆').join('')}
              <span style={{fontSize: '0.9rem', marginLeft: '10px'}}>({averageRating})</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)' }}>Based on {reviewCount} Rescues</div>
          </div>

          {/* Mobile Login Box placed directly under Hero Review Box */}
          <div className="mobile-login" style={{ marginTop: '20px', width: '100%', maxWidth: '450px' }}>
            {loginBox}
          </div>
        </div>

        {/* Login Form embedded in Hero (Desktop Only) */}
        <div className="desktop-login">
          {loginBox}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="features-header">Why Choose Us</h2>
        
        <div className="feature-card">
          <div className="feature-content">
            <span className="feature-number">01</span>
            <div className="feature-text">
              <h3>Empowering Local NGOs</h3>
              <p>We provide a streamlined platform for charities and NGOs to instantly see what surplus food is available from nearby mess halls and restaurants, allowing for quick pickups.</p>
            </div>
          </div>
          <div className="feature-image" style={{ backgroundImage: "url('/ngo.png')" }}></div>
        </div>

        <div className="feature-card">
          <div className="feature-content">
            <span className="feature-number">02</span>
            <div className="feature-text">
              <h3>Zero-Waste for Restaurants</h3>
              <p>Restaurants and university mess halls can easily log their leftover batches at the end of the day. This simple step prevents thousands of pounds of food from entering the trash.</p>
            </div>
          </div>
          <div className="feature-image" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1488459716781-31db52582fe9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')" }}></div>
        </div>
      </section>

      {/* Dynamic Reviews Section */}
      <section className="reviews-section">
        <h2 className="features-header">What Our Clients Say</h2>
        
        <div className="reviews-list">
          {reviews.length === 0 ? (
            <p>No reviews yet. Be the first!</p>
          ) : (
            reviews.map((review) => (
              <div key={review.review_id} className="review-card">
                <div className="review-text">
                  <h3 style={{ fontSize: '1rem', fontStyle: 'italic', marginBottom: '10px' }}>"{review.comments}"</h3>
                  <div className="review-author" style={{ fontSize: '0.9rem', color: '#666' }}>{review.reviewer_name} (Rating: {review.rating}/5)</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Leave a Review Form */}
        <div className="leave-review-container">
          <h3 className="form-title">Leave a Review</h3>
          <form onSubmit={submitReview}>
            <div className="form-row">
              <input type="number" min="1" max="5" name="rating" placeholder="Rating (1-5)" className="input-field" value={reviewForm.rating} onChange={handleReviewChange} required style={{width: '100px'}} />
              <input type="text" name="comments" placeholder="Your review..." className="input-field" value={reviewForm.comments} onChange={handleReviewChange} required />
            </div>
            <button type="submit" className="btn-dark" style={{width: '200px'}}>Submit Review</button>
            {reviewStatus && <p style={{marginTop: '15px'}}>{reviewStatus}</p>}
          </form>
        </div>

      </section>
      
      {/* Logos Section */}
      <section className="logos-section">
        <h2 className="features-header text-center">Proud to be Covered Here</h2>
        <div className="logos-grid">
          <h2>FoodBank</h2>
          <h2>SharePlate</h2>
          <h2>EcoDaily</h2>
          <h2>ZeroWaste</h2>
        </div>
      </section>

    </>
  );
}

export default Home;
