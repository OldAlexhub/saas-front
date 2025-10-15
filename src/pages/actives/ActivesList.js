import React, { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import {
  listActives,
  updateStatus,
  updateAvailability,
} from '../../services/activeService';

/**
 * Shows the active roster of drivers. Allows toggling of status and availability
 * directly from the table. Fetches actives on mount and updates local state
 * when toggling.
 */
const ActivesList = () => {
  const [actives, setActives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActives = async () => {
    try {
      const res = await listActives();
      setActives(res.data.actives || res.data.actives || res.data); // adjust for API shape
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch actives';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActives();
  }, []);

  const handleToggleStatus = async (id, current) => {
    const newStatus = current === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateStatus(id, newStatus);
      setActives((prev) => prev.map((a) => (a._id === id ? { ...a, status: newStatus } : a)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleToggleAvailability = async (id, current) => {
    const newAvailability = current === 'Online' ? 'Offline' : 'Online';
    try {
      await updateAvailability(id, newAvailability);
      setActives((prev) => prev.map((a) => (a._id === id ? { ...a, availability: newAvailability } : a)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update availability');
    }
  };

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Active Roster</h2>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : actives && actives.length ? (
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Cab #</th>
                <th>Name</th>
                <th>Status</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {actives.map((active) => (
                <tr key={active._id}>
                  <td>{active.driverId}</td>
                  <td>{active.cabNumber}</td>
                  <td>{active.firstName} {active.lastName}</td>
                  <td>{active.status}</td>
                  <td>{active.availability}</td>
                  <td>
                    <button onClick={() => handleToggleStatus(active._id, active.status)} className="btn btn-sm btn-secondary me-2">
                      Toggle Status
                    </button>
                    <button onClick={() => handleToggleAvailability(active._id, active.availability)} className="btn btn-sm btn-secondary">
                      Toggle Availability
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No actives found.</p>
        )}
      </div>
    </div>
  );
};

// Styles object is unused since Bootstrap classes handle styling
const styles = {};

export default ActivesList;