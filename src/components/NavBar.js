import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * A simple navigation bar component for authenticated pages.
 * It provides links to each section of the TaxiOps admin dashboard.
 */
const NavBar = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">TaxiOps Admin</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item"><Link to="/" className="nav-link">Dashboard</Link></li>
            <li className="nav-item"><Link to="/drivers" className="nav-link">Drivers</Link></li>
            <li className="nav-item"><Link to="/drivers/new" className="nav-link">Add Driver</Link></li>
            <li className="nav-item"><Link to="/vehicles" className="nav-link">Vehicles</Link></li>
            <li className="nav-item"><Link to="/vehicles/new" className="nav-link">Add Vehicle</Link></li>
            <li className="nav-item"><Link to="/actives" className="nav-link">Actives</Link></li>
            <li className="nav-item"><Link to="/bookings" className="nav-link">Bookings</Link></li>
            <li className="nav-item"><Link to="/bookings/new" className="nav-link">Add Booking</Link></li>
            <li className="nav-item"><Link to="/fares" className="nav-link">Fares</Link></li>
            <li className="nav-item">
              <button onClick={logout} className="btn btn-link nav-link" style={{ padding: 0 }}>Logout</button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

// Inline styles are no longer needed due to Bootstrap classes
const styles = {};

export default NavBar;