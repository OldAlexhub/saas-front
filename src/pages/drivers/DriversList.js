import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { listDrivers } from '../../services/driverService';

/**
 * Displays a table of drivers with basic details. Provides a link to
 * add a new driver. On mount it fetches drivers from the backend.
 */
const DriversList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await listDrivers();
        setDrivers(res.data.drivers || []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch drivers';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Drivers</h2>
        <Link to="/drivers/new" className="btn btn-primary mb-3">Add Driver</Link>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : drivers.length ? (
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>License #</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver._id}>
                  <td>{driver.firstName} {driver.lastName}</td>
                  <td>{driver.email}</td>
                  <td>{driver.phoneNumber}</td>
                  <td>{driver.dlNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No drivers found.</p>
        )}
      </div>
    </div>
  );
};

// Styles object not used because Bootstrap classes handle styling
const styles = {};

export default DriversList;