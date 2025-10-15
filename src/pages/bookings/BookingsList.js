import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { listBookings } from '../../services/bookingService';

/**
 * Displays a list of bookings with minimal details. Users can navigate to add
 * new bookings. Fetches bookings on mount.
 */
const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await listBookings();
        // API returns an object { bookings: [...], count: n } so handle accordingly
        if (Array.isArray(res.data.bookings)) {
          setBookings(res.data.bookings);
        } else if (Array.isArray(res.data)) {
          setBookings(res.data);
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to fetch bookings';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-3">Bookings</h2>
        <Link to="/bookings/new" className="btn btn-primary mb-3">Add Booking</Link>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : bookings && bookings.length ? (
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Pickup Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.bookingId || b._id}</td>
                  <td>{b.customerName}</td>
                  <td>{b.phoneNumber}</td>
                  <td>{b.pickupTime ? new Date(b.pickupTime).toLocaleString() : ''}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No bookings found.</p>
        )}
      </div>
    </div>
  );
};

// Styles object unused due to Bootstrap classes
const styles = {};

export default BookingsList;