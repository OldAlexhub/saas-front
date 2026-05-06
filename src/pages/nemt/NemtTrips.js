import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listAgencies, listTrips, importTrips } from '../../services/nemtService';

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

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    setImportErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await importTrips(fd);
      const { imported, errors } = res.data;
      let msg = `Imported ${imported} trip${imported !== 1 ? 's' : ''}.`;
      if (errors?.length) msg += ` ${errors.length} row(s) skipped.`;
      setImportMsg(msg);
      qc.invalidateQueries({ queryKey: ['nemt-trips'] });
    } catch (err) {
      setImportErr(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        className="btn btn-subtle"
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import CSV / XLSX'}
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
              <tr key={t._id}>
                <td data-label="Trip">
                  <div className="table-stack">
                    <span className="primary">#{t.tripId || t._id?.slice(-6)}</span>
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
                  <Link className="pill-button" to={`/nemt/trips/${t._id}`}>Manage</Link>
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
      <div className="surface">
        {importMsg && <div className="feedback success">{importMsg}</div>}
        {importErr && <div className="feedback error">{importErr}</div>}

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
