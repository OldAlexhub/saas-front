import { useEffect, useMemo, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import { listDrivers } from '../../services/driverService';
import { runOperationalReport } from '../../services/reportService';
import { listVehicles } from '../../services/vehicleService';

const STORAGE_COLUMNS = 'reports:selectedColumns:v2';
const STORAGE_VIEWS = 'reports:savedViews:v2';

const todayInput = () => new Date().toISOString().slice(0, 10);

const daysAgoInput = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const startOfMonthInput = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

const createInitialFilters = () => ({
  from: daysAgoInput(29),
  to: todayInput(),
  status: 'all',
  tripSource: 'all',
  dispatchMethod: 'all',
  driverId: '',
  cabNumber: '',
  dateField: 'pickupTime',
  dueWithin: '45',
  limit: '1000',
});

const DATE_PRESETS = [
  { key: 'today', label: 'Today', range: () => ({ from: todayInput(), to: todayInput() }) },
  { key: '7d', label: '7 days', range: () => ({ from: daysAgoInput(6), to: todayInput() }) },
  { key: '30d', label: '30 days', range: () => ({ from: daysAgoInput(29), to: todayInput() }) },
  { key: 'mtd', label: 'Month', range: () => ({ from: startOfMonthInput(), to: todayInput() }) },
];

const REPORT_TEMPLATES = [
  {
    key: 'trip-data',
    title: 'Trip Data Log',
    shortTitle: 'Trips',
    category: 'Operations',
    description: 'Dispatch, flagdown, trip status, fare, timing, and audit-ready ride detail.',
    endpoint: 'trip-data',
    hasDateRange: true,
    filters: ['dateField', 'status', 'tripSource', 'dispatchMethod', 'driverId', 'cabNumber', 'limit'],
    defaultColumns: [
      'bookingId',
      'tripDate',
      'status',
      'tripSource',
      'driverName',
      'cabNumber',
      'pickupAddress',
      'dropoffAddress',
      'completedAt',
      'totalFare',
      'syncStatus',
    ],
    summaryCards: [
      { key: 'totalTrips', label: 'Trips', format: 'number' },
      { key: 'completedTrips', label: 'Completed', format: 'number' },
      { key: 'cancelledTrips', label: 'Cancelled', format: 'number' },
      { key: 'flagdownTrips', label: 'Flagdowns', format: 'number' },
      { key: 'totalFare', label: 'Revenue', format: 'currency' },
      { key: 'totalMiles', label: 'Miles', format: 'number' },
    ],
    columns: [
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'documentId', label: 'Document ID' },
      { key: 'tripDate', label: 'Trip Date', format: 'date' },
      { key: 'pickupTime', label: 'Pickup Time', format: 'datetime' },
      { key: 'assignedAt', label: 'Assigned At', format: 'datetime' },
      { key: 'enRouteAt', label: 'En Route At', format: 'datetime' },
      { key: 'pickedUpAt', label: 'Picked Up At', format: 'datetime' },
      { key: 'completedAt', label: 'Completed At', format: 'datetime' },
      { key: 'cancelledAt', label: 'Cancelled At', format: 'datetime' },
      { key: 'status', label: 'Status', format: 'status' },
      { key: 'tripSource', label: 'Trip Source' },
      { key: 'dispatchMethod', label: 'Dispatch Method' },
      { key: 'customerName', label: 'Customer' },
      { key: 'phoneNumber', label: 'Phone' },
      { key: 'pickupAddress', label: 'Pickup' },
      { key: 'dropoffAddress', label: 'Dropoff' },
      { key: 'driverId', label: 'Driver ID' },
      { key: 'driverName', label: 'Driver' },
      { key: 'cabNumber', label: 'Cab' },
      { key: 'passengers', label: 'Passengers', format: 'number' },
      { key: 'wheelchairNeeded', label: 'Wheelchair', format: 'boolean' },
      { key: 'estimatedDistanceMiles', label: 'Estimated Miles', format: 'number' },
      { key: 'meterMiles', label: 'Meter Miles', format: 'number' },
      { key: 'waitMinutes', label: 'Wait Minutes', format: 'number' },
      { key: 'fareStrategy', label: 'Fare Strategy' },
      { key: 'estimatedFare', label: 'Estimated Fare', format: 'currency' },
      { key: 'finalFare', label: 'Final Fare', format: 'currency' },
      { key: 'feesTotal', label: 'Fees', format: 'currency' },
      { key: 'totalFare', label: 'Total Fare', format: 'currency' },
      { key: 'noShowFeeApplied', label: 'No Show Fee', format: 'boolean' },
      { key: 'needsReassignment', label: 'Needs Reassignment', format: 'boolean' },
      { key: 'syncStatus', label: 'Sync Status', format: 'status' },
      { key: 'eventCount', label: 'Event Count', format: 'number' },
      { key: 'queueDepth', label: 'Queue Depth', format: 'number' },
      { key: 'cancelReason', label: 'Cancel Reason' },
    ],
  },
  {
    key: 'hours-of-service',
    title: 'Hours of Service',
    shortTitle: 'HOS',
    category: 'Compliance',
    description: 'Daily on-duty totals, duty sessions, open shifts, and recorded HOS violations.',
    endpoint: 'hours-of-service',
    hasDateRange: true,
    filters: ['driverId', 'limit'],
    defaultColumns: [
      'driverId',
      'driverName',
      'cabNumber',
      'date',
      'onDutyHours',
      'dutySessions',
      'currentlyOnDuty',
      'violations',
      'violationNotes',
    ],
    summaryCards: [
      { key: 'drivers', label: 'Drivers', format: 'number' },
      { key: 'totalRows', label: 'Daily Rows', format: 'number' },
      { key: 'totalOnDutyHours', label: 'On Duty Hours', format: 'number' },
      { key: 'openDuty', label: 'Open Duty', format: 'number' },
      { key: 'violations', label: 'Violations', format: 'number' },
    ],
    columns: [
      { key: 'driverId', label: 'Driver ID' },
      { key: 'driverName', label: 'Driver' },
      { key: 'cabNumber', label: 'Cab' },
      { key: 'date', label: 'Date', format: 'date' },
      { key: 'onDutyHours', label: 'On Duty Hours', format: 'number' },
      { key: 'onDutyMinutes', label: 'On Duty Minutes', format: 'number' },
      { key: 'entryCount', label: 'HOS Entries', format: 'number' },
      { key: 'dutySessions', label: 'Duty Sessions', format: 'number' },
      { key: 'firstStart', label: 'First Start', format: 'datetime' },
      { key: 'lastEnd', label: 'Last End', format: 'datetime' },
      { key: 'currentlyOnDuty', label: 'Currently On Duty', format: 'boolean' },
      { key: 'openDutyStart', label: 'Open Duty Start', format: 'datetime' },
      { key: 'violations', label: 'Violations', format: 'number' },
      { key: 'violationNotes', label: 'Violation Notes' },
    ],
  },
  {
    key: 'driver-compliance',
    title: 'Driver Compliance',
    shortTitle: 'Drivers',
    category: 'Compliance',
    description: 'License, DOT medical, CBI, MVR, and fingerprint expiry readiness.',
    endpoint: 'driver-compliance',
    filters: ['dueWithin'],
    defaultColumns: [
      'driverId',
      'driverName',
      'phoneNumber',
      'complianceLabel',
      'nextExpiryType',
      'nextExpiryDate',
      'daysToNextExpiry',
      'dlExpiry',
      'dotExpiry',
    ],
    summaryCards: [
      { key: 'totalDrivers', label: 'Drivers', format: 'number' },
      { key: 'compliant', label: 'Compliant', format: 'number' },
      { key: 'dueSoon', label: 'Due Soon', format: 'number' },
      { key: 'expired', label: 'Expired', format: 'number' },
      { key: 'missing', label: 'Missing', format: 'number' },
    ],
    columns: [
      { key: 'driverId', label: 'Driver ID' },
      { key: 'driverName', label: 'Driver' },
      { key: 'email', label: 'Email' },
      { key: 'phoneNumber', label: 'Phone' },
      { key: 'dlNumber', label: 'License Number' },
      { key: 'complianceLabel', label: 'Compliance', format: 'status' },
      { key: 'nextExpiryType', label: 'Next Expiry' },
      { key: 'nextExpiryDate', label: 'Next Expiry Date', format: 'date' },
      { key: 'daysToNextExpiry', label: 'Days Left', format: 'number' },
      { key: 'dlExpiry', label: 'DL Expiry', format: 'date' },
      { key: 'dotExpiry', label: 'DOT Expiry', format: 'date' },
      { key: 'cbiExpiry', label: 'CBI Expiry', format: 'date' },
      { key: 'mvrExpiry', label: 'MVR Expiry', format: 'date' },
      { key: 'fingerPrintsExpiry', label: 'Fingerprint Expiry', format: 'date' },
    ],
  },
  {
    key: 'vehicle-compliance',
    title: 'Vehicle Compliance',
    shortTitle: 'Vehicles',
    category: 'Compliance',
    description: 'Registration and inspection expiry status by cab and plate.',
    endpoint: 'vehicle-compliance',
    filters: ['dueWithin'],
    defaultColumns: [
      'cabNumber',
      'licPlates',
      'make',
      'model',
      'complianceLabel',
      'nextExpiryType',
      'nextExpiryDate',
      'daysToNextExpiry',
      'regisExpiry',
      'annualInspection',
    ],
    summaryCards: [
      { key: 'totalVehicles', label: 'Vehicles', format: 'number' },
      { key: 'compliant', label: 'Compliant', format: 'number' },
      { key: 'dueSoon', label: 'Due Soon', format: 'number' },
      { key: 'expired', label: 'Expired', format: 'number' },
      { key: 'missing', label: 'Missing', format: 'number' },
    ],
    columns: [
      { key: 'cabNumber', label: 'Cab' },
      { key: 'vinNumber', label: 'VIN' },
      { key: 'licPlates', label: 'Plate' },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'year', label: 'Year', format: 'number' },
      { key: 'color', label: 'Color' },
      { key: 'complianceLabel', label: 'Compliance', format: 'status' },
      { key: 'nextExpiryType', label: 'Next Expiry' },
      { key: 'nextExpiryDate', label: 'Next Expiry Date', format: 'date' },
      { key: 'daysToNextExpiry', label: 'Days Left', format: 'number' },
      { key: 'regisExpiry', label: 'Registration Expiry', format: 'date' },
      { key: 'annualInspection', label: 'Annual Inspection', format: 'date' },
    ],
  },
  {
    key: 'income-per-driver',
    title: 'Income per Driver',
    shortTitle: 'Income',
    category: 'Finance',
    description: 'Completed trip earnings, average fare, and driver-level revenue contribution.',
    endpoint: 'income-per-driver',
    hasDateRange: true,
    filters: ['driverId', 'limit'],
    defaultColumns: ['driverId', 'driverName', 'trips', 'totalFare', 'averageFare'],
    summaryCards: [
      { key: 'totalDrivers', label: 'Drivers', format: 'number' },
      { key: 'totalTrips', label: 'Trips', format: 'number' },
      { key: 'totalRevenue', label: 'Revenue', format: 'currency' },
      { key: 'avgFare', label: 'Avg Fare', format: 'currency' },
    ],
    columns: [
      { key: 'driverId', label: 'Driver ID' },
      { key: 'driverName', label: 'Driver' },
      { key: 'trips', label: 'Trips', format: 'number' },
      { key: 'totalFare', label: 'Total Fare', format: 'currency' },
      { key: 'averageFare', label: 'Average Fare', format: 'currency' },
    ],
  },
];

const TEMPLATE_BY_KEY = REPORT_TEMPLATES.reduce((acc, template) => {
  acc[template.key] = template;
  return acc;
}, {});

const unwrapArray = (response, preferredKeys = []) => {
  const payload = response?.data ?? response ?? {};
  if (Array.isArray(payload)) return payload;
  for (const key of preferredKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const loadJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_err) {
    return fallback;
  }
};

const formatNumber = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number);
};

const formatCurrency = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '$0.00';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(number);
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { timeZone: 'UTC' });
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatValue = (value, format) => {
  if (value === null || value === undefined || value === '') return '';
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'number':
      return formatNumber(value);
    case 'date':
      return formatDate(value);
    case 'datetime':
      return formatDateTime(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
};

const statusClass = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (['completed', 'compliant', 'online', 'yes'].includes(normalized)) return 'badge-success';
  if (['expired', 'cancelled', 'noshow', 'missing', 'no'].includes(normalized.replace(/\s+/g, ''))) return 'badge-danger';
  if (['due soon', 'duesoon', 'open', 'queued', 'warning'].includes(normalized.replace(/\s+/g, ''))) return 'badge-warning';
  return 'badge-info';
};

const getInitialColumns = () => {
  const stored = loadJson(STORAGE_COLUMNS, {});
  return REPORT_TEMPLATES.reduce((acc, template) => {
    const storedColumns = Array.isArray(stored?.[template.key]) ? stored[template.key] : null;
    acc[template.key] = storedColumns && storedColumns.length ? storedColumns : template.defaultColumns;
    return acc;
  }, {});
};

const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const ReportsBuilder = () => {
  const [activeTemplateKey, setActiveTemplateKey] = useState('trip-data');
  const [filters, setFilters] = useState(createInitialFilters);
  const [selectedColumnsByTemplate, setSelectedColumnsByTemplate] = useState(getInitialColumns);
  const [reportData, setReportData] = useState({
    rows: [],
    summary: {},
    generatedAt: '',
    count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [savedViews, setSavedViews] = useState(() => loadJson(STORAGE_VIEWS, {}));
  const [viewName, setViewName] = useState('');

  const activeTemplate = TEMPLATE_BY_KEY[activeTemplateKey] || REPORT_TEMPLATES[0];
  const selectedColumnKeys = selectedColumnsByTemplate[activeTemplateKey] || activeTemplate.defaultColumns;
  const visibleColumns = activeTemplate.columns.filter((column) => selectedColumnKeys.includes(column.key));

  useEffect(() => {
    let ignore = false;

    const loadOptions = async () => {
      setBootLoading(true);
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          listDrivers({ limit: 1000 }),
          listVehicles({ limit: 1000 }),
        ]);
        if (ignore) return;
        setDrivers(unwrapArray(driversRes, ['drivers', 'results']));
        setVehicles(unwrapArray(vehiclesRes, ['vehicles', 'results']));
      } catch (_err) {
        if (!ignore) {
          setDrivers([]);
          setVehicles([]);
        }
      } finally {
        if (!ignore) setBootLoading(false);
      }
    };

    loadOptions();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_COLUMNS, JSON.stringify(selectedColumnsByTemplate));
  }, [selectedColumnsByTemplate]);

  const buildParams = (template, nextFilters = filters) => {
    const params = {};
    if (template.hasDateRange) {
      if (nextFilters.from) params.from = nextFilters.from;
      if (nextFilters.to) params.to = nextFilters.to;
    }
    if (template.filters.includes('dateField') && nextFilters.dateField) params.dateField = nextFilters.dateField;
    if (template.filters.includes('status') && nextFilters.status !== 'all') params.status = nextFilters.status;
    if (template.filters.includes('tripSource') && nextFilters.tripSource !== 'all') params.tripSource = nextFilters.tripSource;
    if (template.filters.includes('dispatchMethod') && nextFilters.dispatchMethod !== 'all') params.dispatchMethod = nextFilters.dispatchMethod;
    if (template.filters.includes('driverId') && nextFilters.driverId) params.driverId = nextFilters.driverId;
    if (template.filters.includes('cabNumber') && nextFilters.cabNumber) params.cabNumber = nextFilters.cabNumber;
    if (template.filters.includes('dueWithin') && nextFilters.dueWithin) params.dueWithin = nextFilters.dueWithin;
    if (template.filters.includes('limit') && nextFilters.limit) params.limit = nextFilters.limit;
    return params;
  };

  const runReport = async (templateKey = activeTemplateKey, nextFilters = filters) => {
    const template = TEMPLATE_BY_KEY[templateKey] || activeTemplate;
    setLoading(true);
    setError('');
    try {
      const response = await runOperationalReport(template.endpoint, buildParams(template, nextFilters));
      const payload = response?.data || {};
      const rows = Array.isArray(payload.rows)
        ? payload.rows
        : Array.isArray(payload.data)
          ? payload.data
          : [];
      setReportData({
        rows,
        summary: payload.summary || {},
        generatedAt: payload.generatedAt || new Date().toISOString(),
        count: payload.count ?? rows.length,
      });
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to run the selected report.';
      setReportData({ rows: [], summary: {}, generatedAt: '', count: 0 });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport(activeTemplateKey, filters);
    // The report should refresh when a new template is chosen, not on every filter keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateKey]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return reportData.rows;
    return reportData.rows.filter((row) =>
      visibleColumns.some((column) =>
        String(row?.[column.key] ?? '').toLowerCase().includes(term),
      ),
    );
  }, [reportData.rows, searchTerm, visibleColumns]);

  const driverOptions = useMemo(
    () =>
      drivers.map((driver) => ({
        value: driver.driverId || driver._id,
        label: [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.email || driver.driverId,
      })),
    [drivers],
  );

  const cabOptions = useMemo(
    () =>
      vehicles
        .map((vehicle) => vehicle.cabNumber)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b))),
    [vehicles],
  );

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyDatePreset = (preset) => {
    const nextRange = preset.range();
    setFilters((prev) => ({ ...prev, ...nextRange }));
  };

  const handleTemplateChange = (templateKey) => {
    setActiveTemplateKey(templateKey);
    setSearchTerm('');
    setError('');
  };

  const toggleColumn = (columnKey) => {
    setSelectedColumnsByTemplate((prev) => {
      const current = prev[activeTemplateKey] || activeTemplate.defaultColumns;
      const next = current.includes(columnKey)
        ? current.filter((key) => key !== columnKey)
        : [...current, columnKey];
      return {
        ...prev,
        [activeTemplateKey]: next.length ? next : current,
      };
    });
  };

  const resetColumns = () => {
    setSelectedColumnsByTemplate((prev) => ({
      ...prev,
      [activeTemplateKey]: activeTemplate.defaultColumns,
    }));
  };

  const exportCsv = () => {
    if (!filteredRows.length || !visibleColumns.length) return;

    const lines = [
      visibleColumns.map((column) => `"${column.label.replace(/"/g, '""')}"`).join(','),
      ...filteredRows.map((row) =>
        visibleColumns
          .map((column) => {
            const rawValue = row?.[column.key];
            const value = toCsvValue(rawValue);
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTemplate.key}-${todayInput()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next = {
      ...savedViews,
      [name]: {
        templateKey: activeTemplateKey,
        filters,
        columns: selectedColumnKeys,
        savedAt: new Date().toISOString(),
      },
    };
    setSavedViews(next);
    setViewName('');
    window.localStorage.setItem(STORAGE_VIEWS, JSON.stringify(next));
  };

  const loadView = (name) => {
    const view = savedViews[name];
    if (!view) return;
    const nextFilters = { ...createInitialFilters(), ...(view.filters || {}) };
    setActiveTemplateKey(view.templateKey || 'trip-data');
    setFilters(nextFilters);
    if (Array.isArray(view.columns)) {
      setSelectedColumnsByTemplate((prev) => ({
        ...prev,
        [view.templateKey || 'trip-data']: view.columns,
      }));
    }
    setTimeout(() => runReport(view.templateKey || 'trip-data', nextFilters), 0);
  };

  const deleteView = (name) => {
    const next = { ...savedViews };
    delete next[name];
    setSavedViews(next);
    window.localStorage.setItem(STORAGE_VIEWS, JSON.stringify(next));
  };

  const renderSummaryValue = (card) => {
    const value = reportData.summary?.[card.key] ?? 0;
    return formatValue(value, card.format);
  };

  const renderCell = (row, column) => {
    const value = row?.[column.key];
    if (column.format === 'status') {
      const label = formatValue(value, column.format) || '-';
      return <span className={`badge ${statusClass(label)}`}>{label}</span>;
    }
    return formatValue(value, column.format) || '-';
  };

  const criticalCount =
    Number(reportData.summary?.expired || 0) +
    Number(reportData.summary?.missing || 0) +
    Number(reportData.summary?.violations || 0);

  return (
    <AppLayout
      title="Report designer"
      subtitle="Run ad hoc operations and compliance reports from live TaxiOps records."
    >
      <div className="reports-workspace">
        <section className="reports-template-strip" aria-label="Report templates">
          {REPORT_TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              className={`reports-template-tile ${template.key === activeTemplateKey ? 'active' : ''}`}
              onClick={() => handleTemplateChange(template.key)}
            >
              <span className="reports-template-category">{template.category}</span>
              <span className="reports-template-title">{template.title}</span>
              <span className="reports-template-description">{template.description}</span>
            </button>
          ))}
        </section>

        <section className="reports-control-band">
          <div className="reports-control-heading">
            <div>
              <span className="reports-kicker">{activeTemplate.category}</span>
              <h2>{activeTemplate.title}</h2>
              <p>{activeTemplate.description}</p>
            </div>
            <div className="reports-actions">
              <button type="button" className="btn btn-primary" onClick={() => runReport()} disabled={loading}>
                {loading ? 'Running...' : 'Run report'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!filteredRows.length}>
                Export CSV
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={!filteredRows.length}>
                Print
              </button>
            </div>
          </div>

          <div className="reports-filter-grid">
            {activeTemplate.hasDateRange && (
              <>
                <div className="reports-field">
                  <label htmlFor="report-from">From</label>
                  <input
                    id="report-from"
                    type="date"
                    value={filters.from}
                    onChange={(event) => setFilter('from', event.target.value)}
                  />
                </div>
                <div className="reports-field">
                  <label htmlFor="report-to">To</label>
                  <input
                    id="report-to"
                    type="date"
                    value={filters.to}
                    onChange={(event) => setFilter('to', event.target.value)}
                  />
                </div>
                <div className="reports-field reports-preset-field">
                  <label>Date preset</label>
                  <div className="reports-segmented">
                    {DATE_PRESETS.map((preset) => (
                      <button key={preset.key} type="button" onClick={() => applyDatePreset(preset)}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTemplate.filters.includes('dateField') && (
              <div className="reports-field">
                <label htmlFor="report-date-field">Date field</label>
                <select
                  id="report-date-field"
                  value={filters.dateField}
                  onChange={(event) => setFilter('dateField', event.target.value)}
                >
                  <option value="pickupTime">Pickup time</option>
                  <option value="completedAt">Completed time</option>
                  <option value="createdAt">Created time</option>
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('status') && (
              <div className="reports-field">
                <label htmlFor="report-status">Status</label>
                <select id="report-status" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="EnRoute">En route</option>
                  <option value="PickedUp">Picked up</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="NoShow">No show</option>
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('tripSource') && (
              <div className="reports-field">
                <label htmlFor="report-trip-source">Trip source</label>
                <select id="report-trip-source" value={filters.tripSource} onChange={(event) => setFilter('tripSource', event.target.value)}>
                  <option value="all">All sources</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="driver">Flagdown</option>
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('dispatchMethod') && (
              <div className="reports-field">
                <label htmlFor="report-dispatch-method">Dispatch method</label>
                <select
                  id="report-dispatch-method"
                  value={filters.dispatchMethod}
                  onChange={(event) => setFilter('dispatchMethod', event.target.value)}
                >
                  <option value="all">All methods</option>
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                  <option value="flagdown">Flagdown</option>
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('driverId') && (
              <div className="reports-field">
                <label htmlFor="report-driver">Driver</label>
                <select id="report-driver" value={filters.driverId} onChange={(event) => setFilter('driverId', event.target.value)}>
                  <option value="">All drivers</option>
                  {driverOptions.map((driver) => (
                    <option key={driver.value} value={driver.value}>
                      {driver.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('cabNumber') && (
              <div className="reports-field">
                <label htmlFor="report-cab">Cab</label>
                <select id="report-cab" value={filters.cabNumber} onChange={(event) => setFilter('cabNumber', event.target.value)}>
                  <option value="">All cabs</option>
                  {cabOptions.map((cabNumber) => (
                    <option key={cabNumber} value={cabNumber}>
                      {cabNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('dueWithin') && (
              <div className="reports-field">
                <label htmlFor="report-due-within">Due within</label>
                <select id="report-due-within" value={filters.dueWithin} onChange={(event) => setFilter('dueWithin', event.target.value)}>
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            )}

            {activeTemplate.filters.includes('limit') && (
              <div className="reports-field">
                <label htmlFor="report-limit">Row limit</label>
                <input
                  id="report-limit"
                  type="number"
                  min="1"
                  max="5000"
                  value={filters.limit}
                  onChange={(event) => setFilter('limit', event.target.value)}
                />
              </div>
            )}
          </div>
        </section>

        <section className="reports-summary-grid" aria-label="Report summary">
          {activeTemplate.summaryCards.map((card) => (
            <div key={card.key} className="reports-summary-tile">
              <span>{card.label}</span>
              <strong>{loading ? '-' : renderSummaryValue(card)}</strong>
            </div>
          ))}
        </section>

        {criticalCount > 0 && !loading && (
          <div className="reports-alert">
            <strong>{criticalCount}</strong>
            <span>compliance or exception item{criticalCount === 1 ? '' : 's'} need review in this result set.</span>
          </div>
        )}

        <section className="reports-results-layout">
          <aside className="reports-sidebar-panel">
            <div className="reports-sidebar-section">
              <div className="reports-sidebar-heading">
                <h3>Columns</h3>
                <button type="button" className="btn btn-ghost" onClick={resetColumns}>
                  Reset
                </button>
              </div>
              <div className="reports-column-list">
                {activeTemplate.columns.map((column) => (
                  <label key={column.key} className="reports-column-option">
                    <input
                      type="checkbox"
                      checked={selectedColumnKeys.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="reports-sidebar-section">
              <div className="reports-sidebar-heading">
                <h3>Saved Views</h3>
              </div>
              <div className="reports-save-row">
                <input
                  type="text"
                  value={viewName}
                  placeholder="View name"
                  onChange={(event) => setViewName(event.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={saveView} disabled={!viewName.trim()}>
                  Save
                </button>
              </div>
              <div className="reports-saved-list">
                {Object.keys(savedViews).length === 0 ? (
                  <span className="reports-empty-text">No saved views yet.</span>
                ) : (
                  Object.entries(savedViews).map(([name, view]) => (
                    <div key={name} className="reports-saved-view">
                      <button type="button" onClick={() => loadView(name)}>
                        <span>{name}</span>
                        <small>{TEMPLATE_BY_KEY[view.templateKey]?.shortTitle || view.templateKey}</small>
                      </button>
                      <button type="button" className="reports-delete-view" onClick={() => deleteView(name)} aria-label={`Delete ${name}`}>
                        x
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="reports-results-panel">
            <div className="reports-results-toolbar">
              <div>
                <h3>Results</h3>
                <p>
                  {loading
                    ? 'Running report...'
                    : `${filteredRows.length} visible of ${reportData.count || reportData.rows.length} rows`}
                  {reportData.generatedAt ? ` - generated ${formatDateTime(reportData.generatedAt)}` : ''}
                </p>
              </div>
              <div className="reports-search">
                <label htmlFor="report-search">Search</label>
                <input
                  id="report-search"
                  type="search"
                  value={searchTerm}
                  placeholder="Filter visible rows"
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            {error && <div className="feedback error">{error}</div>}
            {bootLoading && <div className="feedback warning">Loading report filters...</div>}

            {loading ? (
              <div className="reports-loading-grid">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="reports-empty-state">No rows match the current report filters.</div>
            ) : (
              <div className="reports-table-wrap">
                <table className="data-table reports-data-table">
                  <thead>
                    <tr>
                      {visibleColumns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, rowIndex) => (
                      <tr key={row.documentId || row.driverId || row.cabNumber || rowIndex}>
                        {visibleColumns.map((column) => (
                          <td key={column.key}>{renderCell(row, column)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </AppLayout>
  );
};

export default ReportsBuilder;
