import jsPDF from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
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
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    let cursor = margin;

    // drawBody renders the receipt body using current `cursor` and shared vars
    const drawBody = () => {
      // Receipt title and metadata
      doc.setFontSize(13);
      doc.text(`Receipt — Trip ${trip.id}`, margin, cursor);
      doc.setFontSize(9);
      const metaRight = pageWidth - margin;
      doc.text(`Date: ${formatDateTime(trip.pickup)}`, metaRight, cursor, { align: 'right' });
      cursor += 16;

      doc.setLineWidth(0.5);
      doc.line(margin, cursor, pageWidth - margin, cursor);
      cursor += 12;

      // Trip details
      doc.setFontSize(10);
      const leftCol = margin;
      const rightCol = pageWidth - margin;
      doc.text(`Customer: ${trip.customer}`, leftCol, cursor);
      doc.text(`Trip ID: ${trip.id}`, rightCol, cursor, { align: 'right' });
      cursor += 14;
      doc.text(`Driver: ${trip.driver}`, leftCol, cursor);
      doc.text(`Cab: ${trip.cabNumber || '—'}`, rightCol, cursor, { align: 'right' });
      cursor += 14;
      doc.text(`Origin: ${trip.origin}`, leftCol, cursor);
      cursor += 12;
      doc.text(`Destination: ${trip.destination}`, leftCol, cursor);
      cursor += 16;

      // Itemized fare area
      doc.setFontSize(11);
      doc.text('Fare breakdown', leftCol, cursor);
      cursor += 12;

      // Example items: base fare and total. If more detail exists in trip, it can be extended.
      const items = [
        { label: 'Fare', amount: Number(trip.fare || 0) },
      ];

      const labelX = leftCol;
      const amountX = rightCol;
      for (const it of items) {
        doc.text(it.label, labelX, cursor);
        doc.text(`$${it.amount.toFixed(2)}`, amountX, cursor, { align: 'right' });
        cursor += 14;
      }

      doc.setLineWidth(0.5);
      doc.line(labelX, cursor, amountX, cursor);
      cursor += 8;
      doc.setFontSize(12);
      doc.text('Total', labelX, cursor);
      doc.text(`$${Number(trip.fare || 0).toFixed(2)}`, amountX, cursor, { align: 'right' });
      cursor += 24;

      doc.setFontSize(10);
      doc.text('Thank you for riding with us.', leftCol, cursor);
    };

    // Header: optional logo and company name
    if (company.logoUrl) {
      try {
        // addImage requires dataURL; the browser will fetch and convert when using img element approach is not available.
        // As a safe fallback, draw name only if image cannot be loaded synchronously.
        // We'll attempt to load image via an Image and canvas to get data URL.
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = company.logoUrl;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            const imgWidth = 80;
            const imgHeight = (img.height / img.width) * imgWidth;
            doc.addImage(dataUrl, 'PNG', margin, cursor, imgWidth, imgHeight);
            doc.setFontSize(16);
            doc.text(company.name || 'TaxiOps Transportation LLC', margin + imgWidth + 12, cursor + imgHeight / 2 + 6);
            cursor += Math.max(imgHeight, 28) + 8;
            drawBody();
            doc.save(`${trip.id || 'receipt'}.pdf`);
          } catch (e) {
            // fallback to text header
            doc.setFontSize(16);
            doc.text(company.name || 'TaxiOps Transportation LLC', margin, cursor);
            cursor += 28;
            drawBody();
            doc.save(`${trip.id || 'receipt'}.pdf`);
          }
        };
        img.onerror = () => {
          doc.setFontSize(16);
          doc.text(company.name || 'TaxiOps Transportation LLC', margin, cursor);
          cursor += 28;
          drawBody();
          doc.save(`${trip.id || 'receipt'}.pdf`);
        };
        // return here — saving will happen in callbacks
        return;
      } catch (e) {
        // ignore and draw text header below
      }
    }

    doc.setFontSize(16);
    doc.text(company.name || 'TaxiOps Transportation LLC', margin, cursor);
    cursor += 20;
    doc.setFontSize(10);
    if (company.address) {
      doc.text(company.address, margin, cursor);
      cursor += 14;
    }
    const contactLine = [company.phone, company.email].filter(Boolean).join(' | ');
    if (contactLine) {
      doc.text(contactLine, margin, cursor);
      cursor += 14;
    }

    cursor += 8;

    // render body and save
    drawBody();
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
