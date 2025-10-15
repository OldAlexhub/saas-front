import React, { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { addFare, getFare, updateFare } from '../services/fareService';

const Fares = () => {
  const [form, setForm] = useState({
    farePerMile: '',
    extraPass: '',
    waitTimePerMinute: '',
  });
  const [isExisting, setIsExisting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFare = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getFare();
      if (res.data && res.data.fare) {
        const { farePerMile, extraPass, waitTimePerMinute } = res.data.fare;
        setForm({
          farePerMile: farePerMile ?? '',
          extraPass: extraPass ?? '',
          waitTimePerMinute: waitTimePerMinute ?? '',
        });
        setIsExisting(true);
      } else {
        setIsExisting(false);
        setForm({ farePerMile: '', extraPass: '', waitTimePerMinute: '' });
      }
    } catch (err) {
      setIsExisting(false);
      setForm({ farePerMile: '', extraPass: '', waitTimePerMinute: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFare();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const numericData = {
        farePerMile: Number(form.farePerMile),
        extraPass: form.extraPass ? Number(form.extraPass) : undefined,
        waitTimePerMinute: Number(form.waitTimePerMinute),
      };
      if (isExisting) {
        await updateFare(numericData);
        setMessage('Fare updated successfully.');
      } else {
        await addFare(numericData);
        setMessage('Fare created successfully.');
        setIsExisting(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed';
      setError(msg);
    }
  };

  const actions = (
    <button type="button" className="btn btn-ghost" onClick={fetchFare} disabled={loading}>
      {loading ? 'Refreshing…' : 'Reload settings'}
    </button>
  );

  return (
    <AppLayout
      title="Fare engine"
      subtitle="Fine tune the rates applied to every trip across your network."
      actions={actions}
    >
      <div className="surface" style={{ maxWidth: '680px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div>
              <h3>Base rates</h3>
              <p>Adjust per-mile and waiting charges to align with policy.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="farePerMile">Fare per mile</label>
                <input
                  id="farePerMile"
                  type="number"
                  step="0.01"
                  name="farePerMile"
                  value={form.farePerMile}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="waitTimePerMinute">Wait time per minute</label>
                <input
                  id="waitTimePerMinute"
                  type="number"
                  step="0.01"
                  name="waitTimePerMinute"
                  value={form.waitTimePerMinute}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="extraPass">Extra passenger</label>
                <input
                  id="extraPass"
                  type="number"
                  step="0.01"
                  name="extraPass"
                  value={form.extraPass}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <div>
              {error && <div className="feedback error">{error}</div>}
              {message && <div className="feedback success">{message}</div>}
            </div>
            <button type="submit" className="btn btn-primary">
              {isExisting ? 'Update fares' : 'Create fares'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default Fares;