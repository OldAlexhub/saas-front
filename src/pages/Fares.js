import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import { getFare, addFare, updateFare } from '../services/fareService';

/**
 * Page for viewing and editing the fare configuration. If no fare exists,
 * allows the user to create one. Otherwise the form updates the existing
 * record. Displays feedback messages on success or failure.
 */
const Fares = () => {
  const [form, setForm] = useState({
    farePerMile: '',
    extraPass: '',
    waitTimePerMinute: '',
  });
  const [isExisting, setIsExisting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchFare = async () => {
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
      }
    } catch (err) {
      // If 404, no fare exists; ignore
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

  return (
    <div>
      <NavBar />
      <div className="container mt-4" style={{ maxWidth: '600px' }}>
        <h2 className="mb-3">{isExisting ? 'Edit' : 'Create'} Fare Configuration</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Fare per Mile</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              name="farePerMile"
              value={form.farePerMile}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Extra Passenger (optional)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              name="extraPass"
              value={form.extraPass}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Wait Time per Minute</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              name="waitTimePerMinute"
              value={form.waitTimePerMinute}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div className="text-danger mb-2">{error}</div>}
          {message && <div className="text-success mb-2">{message}</div>}
          <button type="submit" className="btn btn-primary">
            {isExisting ? 'Update' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Styles object unused since Bootstrap classes handle styling
const styles = {};

export default Fares;