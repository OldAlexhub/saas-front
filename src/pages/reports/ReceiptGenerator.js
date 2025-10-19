import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import AppLayout from '../../components/AppLayout';
import { listBookings } from '../../services/bookingService';
import { getCompanyProfile } from '../../services/companyService';

const defaultFilters = {
  driver: '',
  pickup: '',
  dropoff: '',
  from: '',
  to: '',
};

const ReceiptGenerator = () => {
  const [company, setCompany] = useState({
    name: 'TaxiOps Transportation LLC',
    address: '',
    phone: '',
    email: '',
  });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    let ignore = false;

    const unwrap = (response, preferredKeys = []) => {
      const payload = response?.data ?? response ?? {};
      if (Array.isArray(payload)) return payload;
      for (const key of preferredKeys) {
        const value = payload?.[key];
        if (Array.isArray(value)) return value;
      }
      if (Array.isArray(payload?.data)) return payload.data;
      const firstArray = Object.values(payload).find((value) => Array.isArray(value));
      return Array.isArray(firstArray) ? firstArray : [];
    };

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [companyRes, bookingsRes] = await Promise.all([
          getCompanyProfile(),
          listBookings({ status: 'Completed' }),
        ]);

        if (!ignore) {
          const fetchedCompany = companyRes.data?.company;
          if (fetchedCompany) {
            setCompany({
              name: fetchedCompany.name || 'TaxiOps Transportation LLC',
              address: fetchedCompany.address || '',
              phone: fetchedCompany.phone || '',
              email: fetchedCompany.email || '',
            });
          }

          const fetchedTrips = unwrap(bookingsRes, ['bookings', 'results'])
            .filter((booking) => booking.status === 'Completed')
            .map((booking) => ({
              id: booking.bookingId || booking._id,
              customer: booking.customerName || '-',
              pickup: booking.pickupTime || null,
              dropoff: booking.droppedOffAt || booking.completedAt || null,
              origin: booking.pickupAddress || '-',
              destination: booking.dropoffAddress || '-',
              driver: booking.driverName || booking.driver?.name || booking.driverId || 'Unassigned',
              driverId: booking.driverId || booking.driver?._id || '',
              cabNumber: booking.cabNumber || booking.assignedCab || '',
              fare: Number(booking.finalFare ?? booking.estimatedFare ?? 0),
            }));

          setTrips(fetchedTrips);
        }
      } catch (err) {
        if (!ignore) {
          const message = err.response?.data?.message || 'Unable to load receipt data.';
          setError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredTrips = useMemo(() => {
    const driverQuery = filters.driver.trim().toLowerCase();
    const pickupQuery = filters.pickup.trim().toLowerCase();
    const dropoffQuery = filters.dropoff.trim().toLowerCase();
    const fromMs = filters.from ? Date.parse(filters.from) : null;
    const toMs = filters.to ? Date.parse(filters.to) : null;

    return trips.filter((trip) => {
      if (driverQuery) {
        const driverText = `${trip.driver || ''} ${trip.driverId || ''}`.toLowerCase();
        if (!driverText.includes(driverQuery)) return false;
      }

      if (pickupQuery) {
        const pickupText = String(trip.origin || '').toLowerCase();
        if (!pickupText.includes(pickupQuery)) return false;
      }

      if (dropoffQuery) {
        const dropoffText = String(trip.destination || '').toLowerCase();
        if (!dropoffText.includes(dropoffQuery)) return false;
      }

      const pickupMs = trip.pickup ? Date.parse(trip.pickup) : Number.NaN;
      if (fromMs && (Number.isNaN(pickupMs) || pickupMs < fromMs)) return false;
      if (toMs && (Number.isNaN(pickupMs) || pickupMs > toMs)) return false;

      return true;
    });
  }, [trips, filters]);

  const filtersActive = useMemo(
    () => Object.values(filters).some((value) => value && value.length),
    [filters],
  );

  const totalFare = useMemo(
    () => filteredTrips.reduce((sum, trip) => sum + Number(trip.fare || 0), 0),
    [filteredTrips],
  );

  const companyDescriptor = useMemo(() => {
    const segments = [];
    if (company.name) segments.push(company.name);
    if (company.address) segments.push(company.address);
    const contactLine = [company.phone, company.email].filter(Boolean).join(' / ');
    if (contactLine) segments.push(contactLine);
    return segments.join(' | ');
  }, [company]);

  const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

  const buildReceiptPdf = (trip) => {
    const doc = new jsPDF({ unit: 'pt' });
    const lineHeight = 18;
    let cursor = 72;

    doc.setFontSize(18);
    doc.text(company.name || 'TaxiOps Transportation LLC', 72, cursor);
    doc.setFontSize(11);
    cursor += lineHeight;
    if (company.address) {
      doc.text(company.address, 72, cursor);
      cursor += lineHeight;
    }
    const contactLine = [company.phone, company.email].filter(Boolean).join(' / ');
    if (contactLine) {
      doc.text(contactLine, 72, cursor);
      cursor += lineHeight;
    }

    cursor += lineHeight;
    doc.setFontSize(14);
    doc.text(`Receipt for trip ${trip.id}`, 72, cursor);
    cursor += lineHeight;
    doc.setFontSize(11);
    doc.text(`Customer: ${trip.customer}`, 72, cursor);
    cursor += lineHeight;
    doc.text(`Pickup: ${formatDateTime(trip.pickup)}`, 72, cursor);
    cursor += lineHeight;
    doc.text(`Drop-off: ${formatDateTime(trip.dropoff)}`, 72, cursor);
    cursor += lineHeight;
    doc.text(`Origin: ${trip.origin}`, 72, cursor);
    cursor += lineHeight;
    doc.text(`Destination: ${trip.destination}`, 72, cursor);
    cursor += lineHeight;

    cursor += lineHeight;
    doc.setFontSize(13);
    doc.text(`Total fare: $${Number(trip.fare || 0).toFixed(2)}`, 72, cursor);
    cursor += lineHeight * 2;
    doc.setFontSize(11);
    doc.text('Thank you for choosing TaxiOps.', 72, cursor);

    doc.save(`${trip.id || 'receipt'}.pdf`);
  };

  const downloadReceipts = (targetTrips) => {
    if (!Array.isArray(targetTrips) || !targetTrips.length) return;
    targetTrips.forEach((trip) => buildReceiptPdf(trip));
  };

  const exportFilteredToCsv = () => {
    if (!filteredTrips.length) return;
    const headers = [
      'Trip ID',
      'Driver',
      'Cab',
      'Customer',
      'Pickup',
      'Drop-off',
      'Origin',
      'Destination',
      'Fare',
    ];
    const rows = filteredTrips.map((trip) => [
      trip.id ?? '',
      trip.driver ?? '',
      trip.cabNumber ? `Cab ${trip.cabNumber}` : '',
      trip.customer ?? '',
      formatDateTime(trip.pickup),
      formatDateTime(trip.dropoff),
      trip.origin ?? '',
      trip.destination ?? '',
      Number(trip.fare || 0).toFixed(2),
    ]);
    const csvLines = [headers, ...rows].map((line) =>
      line
        .map((value) => {
          const safe = value === undefined || value === null ? '' : String(value);
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'receipts.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => setFilters({ ...defaultFilters });

  return (
    <AppLayout
      title="Generate receipt"
      subtitle="Review completed trips and export a printable receipt for riders or corporate accounts."
    >
      <div className="panel" style={{ maxWidth: '1040px', margin: '0 auto' }}>
        <div
          className="panel-header"
          style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}
        >
          <div>
            <h3>Receipt library</h3>
            <p className="panel-subtitle">
              {companyDescriptor || 'TaxiOps Transportation LLC'}
            </p>
          </div>
          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-subtle"
              onClick={exportFilteredToCsv}
              disabled={loading || !!error || filteredTrips.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => downloadReceipts(filteredTrips)}
              disabled={loading || !!error || filteredTrips.length === 0}
            >
              Download receipts (PDF)
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ gap: '18px' }}>
          <div className="form-grid">
            <div>
              <label htmlFor="filterDriver">Driver</label>
              <input
                id="filterDriver"
                name="driver"
                type="text"
                value={filters.driver}
                onChange={handleFilterChange}
                placeholder="Name or ID"
              />
            </div>
            <div>
              <label htmlFor="filterPickup">Pickup address</label>
              <input
                id="filterPickup"
                name="pickup"
                type="text"
                value={filters.pickup}
                onChange={handleFilterChange}
                placeholder="Search pickup"
              />
            </div>
            <div>
              <label htmlFor="filterDropoff">Drop-off address</label>
              <input
                id="filterDropoff"
                name="dropoff"
                type="text"
                value={filters.dropoff}
                onChange={handleFilterChange}
                placeholder="Search drop-off"
              />
            </div>
            <div>
              <label htmlFor="filterFrom">From</label>
              <input
                id="filterFrom"
                name="from"
                type="datetime-local"
                value={filters.from}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label htmlFor="filterTo">To</label>
              <input
                id="filterTo"
                name="to"
                type="datetime-local"
                value={filters.to}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <div
            className="pill-group"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>
              Showing {filteredTrips.length} of {trips.length} trip
              {trips.length === 1 ? '' : 's'}.
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetFilters}
              disabled={!filtersActive}
            >
              Clear filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '240px', borderRadius: '16px' }} />
        ) : error ? (
          <div className="feedback error">{error}</div>
        ) : filteredTrips.length === 0 ? (
          <div className="fleet-alert-empty">No trips match the current filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Driver</th>
                  <th>Customer</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th style={{ textAlign: 'right' }}>Fare ($)</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.id}</td>
                    <td>
                      <div className="table-stack">
                        <span className="primary">{trip.driver}</span>
                        <span className="secondary">
                          {[trip.driverId, trip.cabNumber && `Cab ${trip.cabNumber}`]
                            .filter(Boolean)
                            .join(' | ') || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td>{trip.customer}</td>
                    <td>{formatDateTime(trip.pickup)}</td>
                    <td>{formatDateTime(trip.dropoff)}</td>
                    <td>{trip.origin}</td>
                    <td>{trip.destination}</td>
                    <td style={{ textAlign: 'right' }}>
                      {Number(trip.fare || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => buildReceiptPdf(trip)}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          className="panel-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>Total collected:</strong> ${totalFare.toFixed(2)}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Prepared on {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReceiptGenerator;
