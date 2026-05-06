import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listAgencies, listTrips, importTrips } from '../../services/nemtService';

const REQUIRED_HEADERS = [
  { field: 'Passenger Name',        accepted: 'Passenger Name · Name · Patient Name',                    required: true  },
  { field: 'Pickup Address',        accepted: 'Pickup Address · Pickup · Pick Up Address',                required: true  },
  { field: 'Dropoff Address',       accepted: 'Dropoff Address · Destination · Drop Off · Drop Off Address', required: true  },
  { field: 'Pickup Time',           accepted: 'Pickup Time · Scheduled Pickup · Pick Up Time',            required: true  },
];

const OPTIONAL_HEADERS = [
  { field: 'Trip ID / Ref',         accepted: 'Trip ID · Trip Ref · Order # · Order ID'           },
  { field: 'Phone',                 accepted: 'Phone · Passenger Phone · Telephone'                },
  { field: 'Member ID',             accepted: 'Member ID · Patient ID · Member #'                  },
  { field: 'Date of Birth',         accepted: 'DOB · Date of Birth · Birthdate'                    },
  { field: 'Mobility Type',         accepted: 'Mobility · Mobility Type · Mobility Code  (values: ambulatory, wheelchair, wheelchair_xl, stretcher)' },
  { field: 'Passenger Count',       accepted: 'Passengers · Passenger Count'                       },
  { field: 'Attendant Count',       accepted: 'Attendants · Attendant Count'                       },
  { field: 'Appointment Time',      accepted: 'Appointment Time · Appointment · Appt · Appt Time'  },
  { field: 'Special Instructions',  accepted: 'Special Instructions · Instructions · Notes · Comments' },
  { field: 'Est. Miles',            accepted: 'Est Miles · Estimated Miles · Miles · Distance'      },
  { field: 'Agency Fare ($)',       accepted: 'Agency Fare · Fare · Rate · Trip Fare — driver pay auto-calculated from this using your configured deduction %' },
  { field: 'Fare Basis',            accepted: 'Fare Basis · Agency Fare Basis  (values: per_trip, per_mile, flat)'   },
];

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const STATUS_OPTIONS = [
  'All', 'Scheduled', 'Assigned', 'Dispatched', 'EnRoute',
  'ArrivedPickup', 'PickedUp', 'ArrivedDrop', 'Completed',
  'Cancelled', 'NoShow', 'PassengerCancelled',
];

const statusBadge = (status) => {
  if (['Completed'].includes(status)) return 'badge-success';
  if (['Cancelled', 'NoShow', 'PassengerCancelled'].includes(status)) return 'badge-warning';
  if (['EnRoute', 'ArrivedPickup', 'PickedUp', 'ArrivedDrop'].includes(status)) return 'badge-info';
  return 'badge-info';
};

const NemtTrips = () => {
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [agencyId, setAgencyId] = useState('');
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [appliedDates, setAppliedDates] = useState({ from: todayIso, to: todayIso });
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importErr, setImportErr] = useState('');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAgencyId, setImportAgencyId] = useState('');
  const [importServiceDate, setImportServiceDate] = useState(todayIso);
  const [showHeaderRef, setShowHeaderRef] = useState(false);

  const { data: agenciesData } = useQuery({
    queryKey: ['nemt-agencies'],
    queryFn: async () => {
      const res = await listAgencies();
      return res.data?.agencies || [];
    },
  });
  const agencies = agenciesData ?? [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['nemt-trips', appliedDates, agencyId],
    queryFn: async () => {
      const params = {};
      if (appliedDates.from) params.serviceDate_gte = appliedDates.from;
      if (appliedDates.to) params.serviceDate_lte = appliedDates.to;
      if (agencyId) params.agencyId = agencyId;
      const res = await listTrips(params);
      return res.data?.trips || [];
    },
  });
  const trips = data ?? [];

  const applyDates = () => setAppliedDates({ from: fromDate, to: toDate });
  const clearDates = () => {
    setFromDate('');
    setToDate('');
    setAppliedDates({ from: '', to: '' });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (status !== 'All' && t.status !== status) return false;
      if (!q) return true;
      return [t.tripId, t.passengerName, t.passengerPhone, t.pickupAddress, t.dropoffAddress]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [trips, search, status]);

  const openImportModal = () => {
    setImportAgencyId('');
    setImportServiceDate(todayIso);
    setImportMsg('');
    setImportErr('');
    setShowHeaderRef(false);
    setShowImportModal(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!importAgencyId) { setImportErr('Please select an agency first.'); return; }
    if (!importServiceDate) { setImportErr('Please enter a service date first.'); return; }
    setImporting(true);
    setImportMsg('');
    setImportErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('agencyId', importAgencyId);
      fd.append('serviceDate', importServiceDate);
      const res = await importTrips(fd);
      const { created, skipped, errors } = res.data;
      let msg = `Imported ${created} trip${created !== 1 ? 's' : ''}.`;
      if (skipped) msg += ` ${skipped} row(s) skipped.`;
      setImportMsg(msg);
      if (errors?.length) setImportErr(errors.map((e) => (typeof e === 'string' ? e : `Row ${e.row}: ${e.message}`)).join(' · '));
      qc.invalidateQueries({ queryKey: ['nemt-trips'] });
      if (!errors?.length) setShowImportModal(false);
    } catch (err) {
      setImportErr(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" className="btn btn-subtle" onClick={openImportModal}>
        Import CSV / XLSX
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <Link to="/nemt/trips/new" className="btn btn-primary">
        <span className="icon">＋</span>New trip
      </Link>
    </div>
  );

  const renderBody = () => {
    if (isLoading) return <div className="skeleton" style={{ height: 260 }} />;
    if (error) return <div className="feedback error">{error.response?.data?.message || 'Failed to load trips.'}</div>;
    if (!filtered.length) return <div className="empty-state">No trips match your filters.</div>;

    return (
      <div className="table-responsive-stack">
        <table className="data-table">
          <thead>
            <tr>
              <th>Trip</th>
              <th>Service date</th>
              <th>Passenger</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Status</th>
              <th>Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td data-label="Trip">
                  <div className="table-stack">
                    <span className="primary">#{t.tripId || t.id?.slice(-6)}</span>
                    {t.agencyTripRef && <span className="secondary">Ref: {t.agencyTripRef}</span>}
                  </div>
                </td>
                <td data-label="Service date">
                  {t.serviceDate ? new Date(t.serviceDate).toLocaleDateString() : '—'}
                </td>
                <td data-label="Passenger">
                  <div className="table-stack">
                    <span className="primary">{t.passengerName || '—'}</span>
                    <span className="secondary">{t.mobilityType || ''}</span>
                  </div>
                </td>
                <td data-label="Pickup">
                  <div className="table-stack">
                    <span className="primary">{t.pickupAddress || '—'}</span>
                    <span className="secondary">
                      {t.scheduledPickupTime
                        ? new Date(t.scheduledPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                </td>
                <td data-label="Dropoff">{t.dropoffAddress || '—'}</td>
                <td data-label="Status">
                  <span className={`badge ${statusBadge(t.status)}`}>{t.status || 'Scheduled'}</span>
                </td>
                <td data-label="Driver">{t.driverId || 'Unassigned'}</td>
                <td data-label="Actions">
                  <Link className="pill-button" to={`/nemt/trips/${t.id}`}>Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AppLayout
      title="NEMT Trips"
      subtitle="Pre-scheduled non-emergency medical transportation trips."
      actions={actions}
    >
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Import trips from CSV / XLSX</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {importMsg && <div className="feedback success">{importMsg}</div>}
              {importErr && <div className="feedback error">{importErr}</div>}

              <div className="form-grid">
                <div>
                  <label htmlFor="importAgency">Agency <span style={{ color: '#f87171' }}>*</span></label>
                  <select id="importAgency" value={importAgencyId} onChange={(e) => setImportAgencyId(e.target.value)}>
                    <option value="">Select agency…</option>
                    {agencies.map((a) => (
                      <option key={a._id} value={a.agencyId}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="importDate">Service date <span style={{ color: '#f87171' }}>*</span></label>
                  <input id="importDate" type="date" value={importServiceDate} onChange={(e) => setImportServiceDate(e.target.value)} />
                </div>
              </div>

              {/* Header reference */}
              <div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: '4px 8px' }}
                  onClick={() => setShowHeaderRef((v) => !v)}
                >
                  {showHeaderRef ? '▾' : '▸'} Column header reference
                </button>

                {showHeaderRef && (
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Your file must have a header row. Column names are case-insensitive and spaces/underscores/dashes are ignored.
                      The <strong>agency</strong> and <strong>service date</strong> apply to all rows in the file — you do not need those columns.
                    </p>

                    <table className="data-table" style={{ marginBottom: 12 }}>
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Required</th>
                          <th>Accepted column names</th>
                        </tr>
                      </thead>
                      <tbody>
                        {REQUIRED_HEADERS.map((h) => (
                          <tr key={h.field}>
                            <td><strong>{h.field}</strong></td>
                            <td style={{ color: '#f87171', fontWeight: 700 }}>Yes</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{h.accepted}</td>
                          </tr>
                        ))}
                        {OPTIONAL_HEADERS.map((h) => (
                          <tr key={h.field}>
                            <td>{h.field}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>No</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{h.accepted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      <strong>Tip:</strong> Pickup/appointment times can be full datetime strings (e.g. <code>2025-06-01 09:30</code>) or Excel date-time cells.
                      Rows missing Passenger Name, Pickup Address, Dropoff Address, or Pickup Time are skipped and reported as errors.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={importing || !importAgencyId || !importServiceDate}
                  onClick={() => fileRef.current?.click()}
                >
                  {importing ? 'Importing…' : 'Choose file & import'}
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Accepts .csv, .xlsx, .xls — max 10 MB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by trip ID, passenger, address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-input" style={{ width: 160 }}>
              <span className="icon">📅</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="search-input" style={{ width: 160 }}>
              <span className="icon">📅</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button className="btn btn-subtle" type="button" onClick={applyDates}>Apply</button>
            <button className="btn btn-ghost" type="button" onClick={clearDates}>Clear</button>
          </div>

          <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="filter-select" value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
            <option value="">All agencies</option>
            {agencies.map((a) => (
              <option key={a._id} value={a.agencyId}>{a.name}</option>
            ))}
          </select>

          <div className="summary">{filtered.length} of {trips.length} trips</div>
        </div>

        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default NemtTrips;
