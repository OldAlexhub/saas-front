import React from 'react';
import NavBar from '../components/NavBar';

/**
 * Dashboard page shown after successful login. It acts as the landing page for
 * the admin interface and provides high‑level instructions.
 */
const Dashboard = () => {
  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Welcome to TaxiOps Admin Dashboard</h2>
        <p>
          Use the navigation bar above to manage drivers, vehicles, the active roster,
          bookings and fare settings. This dashboard is the command center for
          dispatchers and administrators of the taxi operation.
        </p>
      </div>
    </div>
  );
};

// Styles object unused since Bootstrap classes handle styling
const styles = {};

export default Dashboard;