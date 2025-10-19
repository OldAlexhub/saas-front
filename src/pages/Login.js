import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as loginAdmin } from '../services/adminService';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginAdmin(form);
      const { token } = res.data;
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('auth-token'));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-illustration">
        <div className="auth-illustration-content">
          <div className="logo-circle">TO</div>
          <div>
            <h2>TaxiOps Control</h2>
            <p>Monitor bookings, drivers and fares from a single intelligent cockpit.</p>
          </div>
          <div className="notice">
            <strong>Real-time insight</strong> into every shift. Dispatch faster, resolve issues sooner and keep your riders happy.
          </div>
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-card-inner">
          <h1>Welcome back</h1>
          <p className="lead">Sign in to orchestrate your taxi operations.</p>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            {error && <div className="feedback error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="form-help">
            Need a TaxiOps account? <Link to="/signup">Request access here</Link>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
