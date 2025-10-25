import { useEffect, useMemo, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import { listActives } from '../../services/activeService';
import { listBookings } from '../../services/bookingService';
import { listDrivers } from '../../services/driverService';
import { listDriverLocationTimeline } from '../../services/driverTimelineService';
import { getFare } from '../../services/fareService';
import { incomePerDriver } from '../../services/reportService';
import { listVehicles } from '../../services/vehicleService';

const BOOKING_COLUMN_PRIORITY = [
  'bookingId',
  'tripType',
  'tripSource',
  'dispatchMethod',
  'status',
  'customerName',
  'phoneNumber',
  'pickupAddress',
  'pickupTime',
  'dropoffAddress',
  'dropoffTime',
  'driverId',
  'cabNumber',
  'estimatedFare',
  'finalFare',
  'passengers',
  'notes',
  'createdAt',
  'updatedAt',
];

const humanizeKey = (key = '') => {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
};

const serialiseValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_err) {
      return String(value);
    }
  }
  return String(value);
};

const buildColumnDefinitions = (rows = [], priorityKeys = []) => {
  if (!rows.length) return [];

  const keySet = new Set();
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    Object.keys(row).forEach((key) => keySet.add(key));
  });

  const orderedKeys = [];
  priorityKeys.forEach((key) => {
    if (keySet.has(key)) {
      orderedKeys.push(key);
      keySet.delete(key);
    }
  });
  const remainingKeys = Array.from(keySet).sort((a, b) => a.localeCompare(b));
  const finalKeys = [...orderedKeys, ...remainingKeys];

  return finalKeys.map((key) => ({
    header: humanizeKey(key),
    accessor: (row) => serialiseValue(row?.[key]),
  }));
};

const AVAILABLE_WIDGETS = [
  { id: 'table', label: 'Booking table' },
  { id: 'metric', label: 'KPI tile' },
  { id: 'chart', label: 'Trend chart' },
  { id: 'map', label: 'Geo coverage map' },
];

const ReportsBuilder = () => {
  const [canvasWidgets, setCanvasWidgets] = useState([]);
  const [datasets, setDatasets] = useState({
    bookings: [],
    drivers: [],
    vehicles: [],
    actives: [],
    driverTimeline: [],
    fare: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingWidgetKey, setEditingWidgetKey] = useState(null);
  const [widgetDraft, setWidgetDraft] = useState({ dataset: 'bookings' });
  const [dashboards, setDashboards] = useState(() => {
    try {
      const raw = window.localStorage.getItem('reports:dashboards');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });
  const [activeDashboard, setActiveDashboard] = useState(() => window.localStorage.getItem('reports:activeDashboard') || 'default');
  const [dashboardName, setDashboardName] = useState('');

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
        const [
          bookingsRes,
          driversRes,
          vehiclesRes,
          activesRes,
          timelineRes,
          fareRes,
        ] = await Promise.all([
          listBookings(),
          listDrivers(),
          listVehicles(),
          listActives(),
          listDriverLocationTimeline({ limit: 1000 }),
          getFare().catch(() => ({ data: null })),
        ]);

        if (ignore) return;

        const bookingsRaw = unwrap(bookingsRes, ['bookings', 'results']);
        const bookings = bookingsRaw.map((booking) => {
          const isFlagdown =
            booking.dispatchMethod === 'flagdown' || booking.tripSource === 'driver';
          return {
            ...booking,
            tripType: isFlagdown ? 'Flagdown' : 'Booked',
          };
        });
        const drivers = unwrap(driversRes, ['drivers', 'results']);
        const vehicles = unwrap(vehiclesRes, ['vehicles', 'results']);
        const actives = unwrap(activesRes, ['data', 'actives', 'results']);
        const driverTimeline =
          timelineRes?.data?.records ||
          unwrap(timelineRes, ['records', 'data']);
        const fare = fareRes?.data?.fare || fareRes?.data?.currentFare || fareRes?.data?.data || null;

        setDatasets({
          bookings,
          drivers,
          vehicles,
          actives,
          driverTimeline: Array.isArray(driverTimeline) ? driverTimeline : [],
          fare,
        });
      } catch (err) {
        if (!ignore) {
          const message = err.response?.data?.message || 'Unable to load report datasets.';
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

  // Load persisted canvas widgets from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('reports:canvasWidgets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCanvasWidgets(parsed);
      }
    } catch (err) {
      // ignore parse errors
    }
  }, []);

  // Persist canvas widgets when changed
  useEffect(() => {
    try {
      window.localStorage.setItem('reports:canvasWidgets', JSON.stringify(canvasWidgets));
    } catch (err) {
      // ignore storage errors
    }
  }, [canvasWidgets]);

  const openWidgetConfig = (widget) => {
    setEditingWidgetKey(widget.key);
    setWidgetDraft({ dataset: widget.dataset || 'bookings', title: widget.title || widget.label, size: widget.size || 'medium' });
  };

  const saveWidgetConfig = () => {
    setCanvasWidgets((prev) =>
      prev.map((w) => {
        if (w.key !== editingWidgetKey) return w;
        // choose default fields: for bookings use priority list, otherwise first N keys from sample
        let defaultFields = [];
        if (widgetDraft.dataset === 'bookings') {
          const avail = getAvailableFields('bookings');
          defaultFields = BOOKING_COLUMN_PRIORITY.filter((k) => avail.includes(k)).slice(0, 6);
        } else {
          const avail = getAvailableFields(widgetDraft.dataset);
          defaultFields = avail.slice(0, 6);
        }
        return { ...w, dataset: widgetDraft.dataset, fields: defaultFields, title: widgetDraft.title, size: widgetDraft.size };
      }),
    );
    setEditingWidgetKey(null);
  };

  const cancelWidgetConfig = () => {
    setEditingWidgetKey(null);
  };

  // Income report state (per-driver aggregation)
  const [incomeFromDate, setIncomeFromDate] = useState('');
  const [incomeToDate, setIncomeToDate] = useState('');
  const [incomeDriverId, setIncomeDriverId] = useState('');
  const [incomeResults, setIncomeResults] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(false);

  const formatCurrency = (value) => {
    const n = Number(value || 0);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
    } catch (_e) {
      return `$${n.toFixed(2)}`;
    }
  };

  const runIncomeReport = async () => {
    setIncomeLoading(true);
    setIncomeResults([]);
    try {
      const params = {};
  if (incomeFromDate) params.from = incomeFromDate;
  if (incomeToDate) params.to = incomeToDate;
  if (incomeDriverId) params.driverId = incomeDriverId;

      const resp = await incomePerDriver(params);
      const rows = resp?.data?.data || resp?.data || [];
      const results = (Array.isArray(rows) ? rows : []).map((r) => ({
        driverId: r.driverId,
        name: r.name || (r.driverId === 'unassigned' ? 'Unassigned' : String(r.driverId)),
        trips: r.trips || 0,
        total: Number((r.total || 0).toFixed(2)),
        avg: Number((r.avg || 0).toFixed(2)),
        totalFormatted: formatCurrency(r.total || 0),
        avgFormatted: formatCurrency(r.avg || 0),
      }));

      setIncomeResults(results);
    } catch (err) {
      console.error('Income report fetch error', err);
      setIncomeResults([]);
    } finally {
      setIncomeLoading(false);
    }
  };

  const getAvailableFields = (datasetKey) => {
    const rows = datasets[datasetKey] || [];
    if (!rows.length) return [];
    const first = rows[0] || {};
    return Object.keys(first).slice(0, 40);
  };


  


  const bookingColumns = useMemo(
    () => buildColumnDefinitions(datasets.bookings, BOOKING_COLUMN_PRIORITY),
    [datasets.bookings],
  );
  const bookingStatusSeries = useMemo(() => {
    const counts = datasets.bookings.reduce((acc, booking) => {
      const status = booking.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts);
  }, [datasets.bookings]);

  const metricsSnapshot = useMemo(() => {
    const totalBookings = datasets.bookings.length;
    const completed = datasets.bookings.filter((item) => item.status === 'Completed').length;
    const cancelled = datasets.bookings.filter((item) => item.status === 'Cancelled').length;
    const flagdowns = datasets.bookings.filter((item) => item.tripType === 'Flagdown').length;
    const activeOnline = datasets.actives.filter(
      (item) => item.status === 'Active' && item.availability === 'Online',
    ).length;

    return {
      totalBookings,
      completed,
      cancelled,
      flagdowns,
      drivers: datasets.drivers.length,
      vehicles: datasets.vehicles.length,
      activeOnline,
    };
  }, [datasets]);

  const activeSummary = useMemo(() => {
    const online = datasets.actives.filter(
      (item) => item.status === 'Active' && item.availability === 'Online',
    ).length;
    const offline = datasets.actives.filter(
      (item) => item.status === 'Active' && item.availability !== 'Online',
    ).length;
    const inactive = datasets.actives.filter((item) => item.status !== 'Active').length;
    return { online, offline, inactive };
  }, [datasets.actives]);

  const datasetExports = useMemo(
    () => [
      {
        key: 'bookings',
        label: 'Bookings',
        count: datasets.bookings.length,
        description: 'Full manifest of scheduled, completed and cancelled rides.',
        columns:
          bookingColumns.length > 0
            ? bookingColumns
            : [
                {
                  header: 'Booking Id',
                  accessor: (row) => (row.bookingId ? String(row.bookingId) : row._id ?? ''),
                },
                {
                  header: 'Pickup Time',
                  accessor: (row) => (row.pickupTime ? new Date(row.pickupTime).toISOString() : ''),
                },
                { header: 'Customer Name', accessor: (row) => row.customerName ?? '' },
                { header: 'Status', accessor: (row) => row.status ?? '' },
              ],
        rows: datasets.bookings,
        filename: 'bookings-report.csv',
      },
      {
        key: 'driverTimeline',
        label: 'Driver location timeline',
        count: datasets.driverTimeline.length,
        description: 'Historical GPS breadcrumbs captured from the driver app.',
        columns: [
          { header: 'Driver ID', accessor: 'driverId' },
          { header: 'Booking ID', accessor: (row) => (row.bookingId ? String(row.bookingId) : '') },
          { header: 'Trip Source', accessor: (row) => row.tripSource || 'dispatch' },
          { header: 'Captured At', accessor: (row) => row.capturedAt || row.createdAt || '' },
          { header: 'Latitude', accessor: (row) => Array.isArray(row.point?.coordinates) ? row.point.coordinates[1] : '' },
          { header: 'Longitude', accessor: (row) => Array.isArray(row.point?.coordinates) ? row.point.coordinates[0] : '' },
          { header: 'Speed', accessor: (row) => row.speed ?? '' },
          { header: 'Heading', accessor: (row) => row.heading ?? '' },
          { header: 'Accuracy', accessor: (row) => row.accuracy ?? '' },
        ],
        rows: datasets.driverTimeline,
        filename: 'driver-location-timeline.csv',
      },
      {
        key: 'drivers',
        label: 'Drivers',
        count: datasets.drivers.length,
        description: 'Roster information including contact and compliance.',
        columns: [
          { header: 'Driver ID', accessor: (row) => row.driverId || row._id || '' },
          { header: 'Name', accessor: (row) => [row.firstName, row.lastName].filter(Boolean).join(' ') },
          { header: 'Email', accessor: 'email' },
          { header: 'Phone', accessor: 'phoneNumber' },
          { header: 'License Expiry', accessor: 'licenseExpiry' },
          { header: 'Status', accessor: 'status' },
        ],
        rows: datasets.drivers,
        filename: 'drivers-report.csv',
      },
      {
        key: 'vehicles',
        label: 'Vehicles',
        count: datasets.vehicles.length,
        description: 'Fleet inventory with plate and inspection info.',
        columns: [
          { header: 'Cab Number', accessor: 'cabNumber' },
          { header: 'VIN', accessor: 'vinNumber' },
          { header: 'Plate', accessor: 'licPlates' },
          { header: 'Make', accessor: 'make' },
          { header: 'Model', accessor: 'model' },
          { header: 'Year', accessor: 'year' },
          { header: 'Registration Expiry', accessor: 'regisExpiry' },
        ],
        rows: datasets.vehicles,
        filename: 'vehicles-report.csv',
      },
      {
        key: 'actives',
        label: 'Actives',
        count: datasets.actives.length,
        description: 'Current availability across the active roster.',
        columns: [
          { header: 'Driver ID', accessor: 'driverId' },
          { header: 'Cab', accessor: 'cabNumber' },
          { header: 'Status', accessor: 'status' },
          { header: 'Availability', accessor: 'availability' },
          {
            header: 'Last Updated',
            accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).toISOString() : ''),
          },
        ],
        rows: datasets.actives,
        filename: 'actives-report.csv',
      },
      {
        key: 'fare',
        label: 'Fare configuration',
        count: datasets.fare ? 1 : 0,
        description: 'Live billing parameters used for pricing.',
        columns: [
          { header: 'Fare per mile', accessor: (row) => row.farePerMile },
          { header: 'Extra passenger', accessor: (row) => row.extraPass },
          { header: 'Wait time per minute', accessor: (row) => row.waitTimePerMinute },
          {
            header: 'Updated at',
            accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).toISOString() : ''),
          },
        ],
        rows: datasets.fare ? [datasets.fare] : [],
        filename: 'fare-configuration.csv',
      },
    ],
    [datasets, bookingColumns],
  );

  const exportToCsv = (rows, columns, filename) => {
    if (!rows.length) return;

    const lines = [
      columns.map((column) => `"${column.header}"`).join(','),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value =
              typeof column.accessor === 'function'
                ? column.accessor(row)
                : row?.[column.accessor] ?? '';
            const normalised = value === null || value === undefined ? '' : String(value);
            return `"${normalised.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDragStart = (event, widget) => {
    event.dataTransfer.setData('text/plain', JSON.stringify(widget));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    if (!data) return;

    try {
      const widget = JSON.parse(data);
      // Auto-configure sensible defaults for non-expert users
      const getDefaultsForWidget = (id) => {
        switch (id) {
          case 'table': {
            const dataset = 'bookings';
            const avail = getAvailableFields(dataset);
            const fields = BOOKING_COLUMN_PRIORITY.filter((k) => avail.includes(k)).slice(0, 6);
            return { dataset, fields };
          }
          case 'metric': {
            const dataset = 'bookings';
            const fields = []; // metric shows count by dataset
            return { dataset, fields };
          }
          case 'chart': {
            const dataset = 'bookings';
            const fields = availIncludes('status') ? ['status'] : ['tripType'];
            return { dataset, fields };
          }
          case 'map': {
            const dataset = 'driverTimeline';
            const fields = ['point'];
            return { dataset, fields };
          }
          default: {
            const dataset = 'bookings';
            const avail = getAvailableFields(dataset);
            return { dataset, fields: avail.slice(0, 6) };
          }
        }
      };

      // helper to test availability of 'status' field
      const availIncludes = (f) => {
        const avail = getAvailableFields('bookings');
        return avail.includes(f);
      };

      const defaults = getDefaultsForWidget(widget.id);
      setCanvasWidgets((prev) => [...prev, { ...widget, key: `${widget.id}-${Date.now()}`, dataset: defaults.dataset, fields: defaults.fields }]);
    } catch {
      // ignore malformed drops
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const renderWidgetContent = (widget) => {
    if (loading) {
      return <p className="panel-subtitle">Loading live data.</p>;
    }
    if (error) {
      return <p className="feedback error" style={{ margin: 0 }}>{error}</p>;
    }

    const datasetKey = widget.dataset || 'bookings';
    const rows = datasets[datasetKey] || [];
    const fields = Array.isArray(widget.fields) && widget.fields.length ? widget.fields : null;

    switch (widget.id) {
      case 'table':
        return (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {(fields || ['_id']).slice(0, 6).map((h) => (
                    <th key={h}>{humanizeKey(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, ri) => (
                  <tr key={row._id || ri}>
                    {(fields || ['_id']).slice(0, 6).map((f) => (
                      <td key={f}>{typeof f === 'string' ? (row[f] ? String(row[f]) : '-') : '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'metric':
        // Simple metric: show counts for the selected dataset
        return (
          <div className="builder-metric-grid">
            <div className="builder-metric-card">
              <span className="label">{humanizeKey(datasetKey)}</span>
              <span className="value">{rows.length}</span>
              <span className="meta">Preview of {rows.length} records</span>
            </div>
          </div>
        );
      case 'chart':
        // Very small chart: histogram of a chosen field if provided
        if (!fields || !fields.length) return <p className="panel-subtitle">Configure a field to chart.</p>;
        const field = fields[0];
        const counts = rows.reduce((acc, r) => {
          const v = r?.[field] ?? 'Unknown';
          acc[v] = (acc[v] || 0) + 1;
          return acc;
        }, {});
        return (
          <div className="builder-chart-rows">
            {Object.entries(counts).slice(0, 8).map(([k, count]) => {
              const percent = rows.length ? Math.round((count / rows.length) * 100) : 0;
              return (
                <div key={k} className="builder-chart-row">
                  <div className="meta">
                    <span>{String(k)}</span>
                    <span>{count}</span>
                  </div>
                  <div className="builder-chart-bar">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'map':
        return (
          <div className="builder-map-summary">
            <div className="stats">
              <span>
                Records: <strong>{rows.length}</strong>
              </span>
            </div>
            <p className="note">Map preview is disabled in this lightweight builder. Configure dataset/fields for export.</p>
          </div>
        );
      default:
        return <p className="panel-subtitle">Content under construction.</p>;
    }
  };

  return (
    <AppLayout
      title="Report designer"
      subtitle="Assemble dashboards for leadership, export datasets and share actionable insights."
    >
      <div className="builder-top-controls">
        <div className="builder-top-inner">
          <select value={activeDashboard} onChange={(e) => { setActiveDashboard(e.target.value); window.localStorage.setItem('reports:activeDashboard', e.target.value); }}>
            <option value="default">Default</option>
            {Object.keys(dashboards).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input placeholder="New dashboard name" value={dashboardName} onChange={(e) => setDashboardName(e.target.value)} />
          <button type="button" className="btn" onClick={() => {
            if (!dashboardName) return;
            const newDash = { ...(dashboards || {}), [dashboardName]: canvasWidgets };
            setDashboards(newDash);
            window.localStorage.setItem('reports:dashboards', JSON.stringify(newDash));
            setDashboardName('');
          }}>Save dashboard</button>
          <button type="button" className="btn btn-ghost" onClick={() => {
            const dash = dashboards[activeDashboard];
            if (dash) setCanvasWidgets(dash);
          }}>Load</button>
          <button type="button" className="btn btn-danger" onClick={() => {
            if (!dashboards[activeDashboard]) return;
            const copy = { ...dashboards };
            delete copy[activeDashboard];
            setDashboards(copy);
            window.localStorage.setItem('reports:dashboards', JSON.stringify(copy));
            setActiveDashboard('default');
          }}>Delete</button>
        </div>
      </div>
      {/* Income report panel: aggregate earnings per driver */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header builder-toolbar">
          <h3>Income report (per driver)</h3>
          <span className="panel-subtitle">Compute earnings and trip counts for drivers over a period.</span>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13 }}>From</label>
            <input type="date" value={incomeFromDate} onChange={(e) => setIncomeFromDate(e.target.value)} />
            <label style={{ fontSize: 13 }}>To</label>
            <input type="date" value={incomeToDate} onChange={(e) => setIncomeToDate(e.target.value)} />
            <label style={{ fontSize: 13 }}>Driver</label>
            <select value={incomeDriverId} onChange={(e) => setIncomeDriverId(e.target.value)}>
              <option value="">All drivers</option>
              {datasets.drivers.map((d) => (
                <option key={d._id || d.driverId} value={d._id || d.driverId}>{[d.firstName, d.lastName].filter(Boolean).join(' ') || (d.driverId || d._id)}</option>
              ))}
            </select>
            <button type="button" className="btn" onClick={runIncomeReport} disabled={incomeLoading}>{incomeLoading ? 'Running…' : 'Run'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setIncomeFromDate(''); setIncomeToDate(''); setIncomeDriverId(''); setIncomeResults([]); }}>Clear</button>
          </div>

          {/* Small snapshot summary to exercise computed values (and avoid unused-vars ESLint warnings) */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: '#444' }}>Bookings: <strong>{metricsSnapshot.totalBookings}</strong></div>
            <div style={{ fontSize: 13, color: '#444' }}>Completed: <strong>{metricsSnapshot.completed}</strong></div>
            <div style={{ fontSize: 13, color: '#444' }}>Drivers: <strong>{metricsSnapshot.drivers}</strong></div>
            <div style={{ fontSize: 13, color: '#666' }}>Active online: <strong>{metricsSnapshot.activeOnline}</strong></div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            {bookingStatusSeries.slice(0, 4).map(([st, ct]) => (
              <div key={st} style={{ fontSize: 12, color: '#555', background: '#f3f3f3', padding: '4px 8px', borderRadius: 6 }}>
                {st}: {ct}
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>Active: {activeSummary.online} / Offline: {activeSummary.offline} / Inactive: {activeSummary.inactive}</div>
          </div>

          <div>
            {incomeResults.length === 0 ? (
              <p className="panel-subtitle">No results — choose a date range and run the report.</p>
            ) : (
              <div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Trips</th>
                      <th>Total earnings</th>
                      <th>Average fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeResults.map((r) => (
                      <tr key={r.driverId || r.name}>
                        <td>{r.name}</td>
                        <td>{r.trips}</td>
                        <td>{r.totalFormatted}</td>
                        <td>{r.avgFormatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn" onClick={() => exportToCsv(incomeResults.map((r) => ({ driver: r.name, trips: r.trips, total: r.total, avg: r.avg })), [
                    { header: 'Driver', accessor: 'driver' },
                    { header: 'Trips', accessor: 'trips' },
                    { header: 'Total', accessor: 'total' },
                    { header: 'Average', accessor: 'avg' },
                  ], 'income-per-driver.csv')}>Export CSV</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="builder-layout">
        <aside className="panel builder-sidebar">
          <div className="panel-header">
            <div>
              <h3>Widget library</h3>
              <p className="panel-subtitle">
                Drag components into the canvas and tailor the layout to your team.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <ul className="builder-widget-list">
              {AVAILABLE_WIDGETS.map((widget) => (
                <li key={widget.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => handleDragStart(event, widget)}
                    className="builder-widget-button"
                  >
                    {widget.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section
          className={`builder-canvas ${canvasWidgets.length === 0 ? 'empty' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {canvasWidgets.length === 0 ? (
            <div className="drop-hint">
              <strong>Drag widgets here to start designing your report</strong>
              <p>Drop a Booking table, KPI tile, Trend chart or Geo map to begin.</p>
            </div>
          ) : (
            canvasWidgets.map((widget) => (
              <div key={widget.key} className={`builder-widget-card size-${widget.size || 'medium'}`}>
                <div className="widget-header">
                  <div className="widget-title">{widget.title || widget.label}</div>
                  <div className="widget-controls">
                    <button type="button" className="btn btn-ghost" onClick={() => openWidgetConfig(widget)}>Configure</button>
                    <button type="button" className="btn btn-ghost" onClick={() => {
                      // remove widget
                      setCanvasWidgets((prev) => prev.filter((w) => w.key !== widget.key));
                    }}>Delete</button>
                  </div>
                </div>
                <div className="widget-body">
                  {renderWidgetContent(widget)}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="panel" style={{ marginTop: '32px' }}>
        <div className="panel-header builder-toolbar">
          <h3>Datasets in this report</h3>
          <span className="panel-subtitle">Export any dataset to CSV for quick Excel analysis.</span>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          {editingWidgetKey && (
            <div style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <strong>Widget configuration</strong>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12 }}>Dataset</label>
                <select value={widgetDraft.dataset} onChange={(e) => setWidgetDraft((d) => ({ ...d, dataset: e.target.value }))}>
                  <option value="bookings">Bookings</option>
                  <option value="drivers">Drivers</option>
                  <option value="vehicles">Vehicles</option>
                  <option value="driverTimeline">DriverTimeline</option>
                  <option value="actives">Actives</option>
                </select>
                <label style={{ fontSize: 12 }}>Columns</label>
                <div style={{ color: '#666', fontSize: 12 }}>{getAvailableFields(widgetDraft.dataset).slice(0, 6).join(', ') || 'Auto'}</div>
                <button type="button" className="btn" onClick={saveWidgetConfig}>Save</button>
                <button type="button" className="btn btn-ghost" onClick={cancelWidgetConfig}>Cancel</button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
          ) : error ? (
            <div className="feedback error">{error}</div>
          ) : (
            <div className="builder-datasets">
              {datasetExports.map((dataset) => (
                <div key={dataset.key} className="builder-dataset-card">
                  <div className="title">{dataset.label}</div>
                  <div className="meta">{dataset.description}</div>
                  <div className="count">{dataset.count} records</div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!dataset.rows.length}
                    onClick={() => exportToCsv(dataset.rows, dataset.columns, dataset.filename)}
                  >
                    Export CSV
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportsBuilder;





