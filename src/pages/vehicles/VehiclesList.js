import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { listVehicles } from '../../services/vehicleService';

/**
 * Lists all vehicles in a table with basic details. Provides a link to add a
 * new vehicle. Fetches data on mount.
 */
const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await listVehicles();
        setVehicles(res.data.vehicles || res.data.list || res.data || []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch vehicles';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Vehicles</h2>
        <Link to="/vehicles/new" className="btn btn-primary mb-3">Add Vehicle</Link>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : Array.isArray(vehicles) && vehicles.length ? (
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Cab #</th>
                <th>VIN</th>
                <th>Plate</th>
                <th>Make</th>
                <th>Model</th>
                <th>Year</th>
                <th>Color</th>
                <th>Regis Expiry</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((veh) => (
                <tr key={veh._id}>
                  <td>{veh.cabNumber}</td>
                  <td>{veh.vinNumber}</td>
                  <td>{veh.licPlates}</td>
                  <td>{veh.make}</td>
                  <td>{veh.model}</td>
                  <td>{veh.year}</td>
                  <td>{veh.color}</td>
                  <td>{veh.regisExpiry ? new Date(veh.regisExpiry).toLocaleDateString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No vehicles found.</p>
        )}
      </div>
    </div>
  );
};

// Styles object is unused since Bootstrap classes handle styling
const styles = {};

export default VehiclesList;