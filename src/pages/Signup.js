import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup as signupAdmin } from '../services/adminService';

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signupAdmin(form);
      setSuccess('Account created successfully! Please wait for approval.');
      setForm({
        company: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
      });
      setTimeout(() => {
        navigate('/login');
      }, 1600);
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed';
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
            <h2>Grow your fleet</h2>
            <p>Onboard dispatchers, manage compliance and launch new service zones effortlessly.</p>
          </div>
          <div className="notice">
            TaxiOps brings <strong>end-to-end visibility</strong> to bookings, drivers and fares. Apply for an account to unlock premium tooling.
          </div>
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-card-inner">
          <h1>Create an admin account</h1>
          <p className="lead">We review every request to keep the network secure.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label htmlFor="company">Company name</label>
                <input
                  id="company"
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
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
                <label htmlFor="phoneNumber">Phone number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="Optional"
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
              <div>
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            {error && <div className="feedback error">{error}</div>}
            {success && <div className="feedback success">{success}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting…' : 'Request access'}
            </button>
          </form>
          <p className="form-help">
            Already have credentials? <Link to="/login">Sign in</Link>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Signup;