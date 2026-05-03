import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import {
  createAccidentReport,
  listAccidentReports,
  listDriversForAccident,
  listVehiclesForAccident,
  updateAccidentReport,
} from '../../services/accidentReportService';

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accident' },
  { value: 'incident', label: 'Incident / Near miss' },
  { value: 'citation', label: 'Citation / Traffic violation' },
  { value: 'complaint', label: 'Passenger complaint' },
  { value: 'regulatory_inquiry', label: 'Regulatory inquiry' },
  { value: 'safety_event', label: 'Safety event' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE = {
  open: 'badge badge-warning',
  under_review: 'badge badge-info',
  resolved: 'badge badge-success',
  closed: 'badge badge-info',
};

const emptyForm = {
  incidentDate: '',
  incidentTime: '',
  location: '',
  type: 'accident',
  description: '',
  driverRef: '',
  driverName: '',
  driverIdNumber: '',
  vehicleRef: '',
  vehiclePlate: '',
  vehicleDescription: '',
  passengersInvolved: false,
  passengerInjuries: '',
  thirdPartyInvolved: false,
  thirdPartyInfo: '',
  policeInvolved: false,
  policeReportNumber: '',
  injuries: false,
  injuryDescription: '',
  propertyDamage: false,
  damageDescription: '',
  insuranceClaimed: false,
  insuranceClaimNumber: '',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
};

const typeLabel = (value) => INCIDENT_TYPES.find((t) => t.value === value)?.label || value;

export default function AccidentReports() {
  const [tab, setTab] = useState('file');

  // --- File Report state ---
  const [form, setForm] = useState(emptyForm);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');

  // --- View Reports state ---
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ type: '', status: '', driver: '', from: '', to: '' });
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    listDriversForAccident()
      .then((res) => setDrivers(res.data?.drivers || []))
      .catch(() => {});
    listVehiclesForAccident()
      .then((res) => setVehicles(res.data?.vehicles || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'view') loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadReports() {
    setLoadingReports(true);
    setReportsError('');
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.driver) params.driver = filters.driver;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await listAccidentReports(params);
      setReports(res.data?.reports || []);
    } catch (err) {
      setReportsError(err.response?.data?.message || 'Failed to load reports.');
    } finally {
      setLoadingReports(false);
    }
  }

  function handleDriverSelect(e) {
    const id = e.target.value;
    if (!id) {
      setForm((f) => ({ ...f, driverRef: '', driverName: '', driverIdNumber: '' }));
      return;
    }
    const driver = drivers.find((d) => d._id === id);
    setForm((f) => ({
      ...f,
      driverRef: id,
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : '',
      driverIdNumber: driver?.driverId || '',
    }));
  }

  function handleVehicleSelect(e) {
    const id = e.target.value;
    if (!id) {
      setForm((f) => ({ ...f, vehicleRef: '', vehiclePlate: '', vehicleDescription: '' }));
      return;
    }
    const v = vehicles.find((v) => v._id === id);
    setForm((f) => ({
      ...f,
      vehicleRef: id,
      vehiclePlate: v?.licPlates || '',
      vehicleDescription: v ? [v.year, v.make, v.model, v.cabNumber ? `Cab #${v.cabNumber}` : ''].filter(Boolean).join(' ') : '',
    }));
  }

  async function submitReport(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    setSubmitError('');
    try {
      await createAccidentReport(form);
      setSubmitMsg('Report filed successfully.');
      setForm(emptyForm);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to file report.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null);
      setUpdateForm({});
    } else {
      const report = reports.find((r) => r._id === id);
      setExpandedId(id);
      setUpdateForm({ status: report?.status || 'open', resolution: report?.resolution || '', note: '' });
    }
  }

  async function saveUpdate(id) {
    setUpdating(true);
    try {
      const res = await updateAccidentReport(id, updateForm);
      setReports((current) => current.map((r) => (r._id === id ? res.data.report : r)));
      setUpdateForm((f) => ({ ...f, note: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update report.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AppLayout
      title="Accident Reports"
      subtitle="File and manage accident, incident, and safety event records."
    >
      <div className="surface">
        {/* Subtab bar */}
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${tab === 'file' ? 'active' : ''}`}
            onClick={() => setTab('file')}
          >
            File a Report
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'view' ? 'active' : ''}`}
            onClick={() => setTab('view')}
          >
            View Reports
          </button>
        </div>

        {/* ── FILE REPORT TAB ── */}
        {tab === 'file' && (
          <form onSubmit={submitReport}>
            {submitMsg && <div className="feedback success" style={{ marginBottom: 16 }}>{submitMsg}</div>}
            {submitError && <div className="feedback error" style={{ marginBottom: 16 }}>{submitError}</div>}

            <div className="form-section">
              <div>
                <h3>Incident details</h3>
                <p>Record the basic facts of the event.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="type">Incident type</label>
                  <select
                    id="type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="incidentDate">Incident date</label>
                  <input
                    id="incidentDate"
                    type="date"
                    value={form.incidentDate}
                    onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="incidentTime">Time (approximate)</label>
                  <input
                    id="incidentTime"
                    type="time"
                    value={form.incidentTime}
                    onChange={(e) => setForm({ ...form, incidentTime: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="location">Location</label>
                  <input
                    id="location"
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Address or intersection"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder="Describe what happened in detail"
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Driver and vehicle</h3>
                <p>Select from the roster or type the name if the driver is not in the system.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="driverSelect">Driver (select from roster)</label>
                  <select id="driverSelect" value={form.driverRef} onChange={handleDriverSelect}>
                    <option value="">— Select driver —</option>
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.firstName} {d.lastName} ({d.driverId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="driverName">Driver name (override / type manually)</label>
                  <input
                    id="driverName"
                    type="text"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="vehicleSelect">Vehicle (select from fleet)</label>
                  <select id="vehicleSelect" value={form.vehicleRef} onChange={handleVehicleSelect}>
                    <option value="">— Select vehicle —</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {[v.year, v.make, v.model, v.licPlates, v.cabNumber ? `Cab #${v.cabNumber}` : ''].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vehiclePlate">Plate (override / type manually)</label>
                  <input
                    id="vehiclePlate"
                    type="text"
                    value={form.vehiclePlate}
                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                    placeholder="License plate"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Circumstances</h3>
                <p>Check all that apply and provide details.</p>
              </div>
              <div className="form-grid">
                {/* Passengers */}
                <div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={form.passengersInvolved}
                      onChange={(e) => setForm({ ...form, passengersInvolved: e.target.checked })}
                    />
                    Passengers in vehicle
                  </label>
                  {form.passengersInvolved && (
                    <textarea
                      value={form.passengerInjuries}
                      onChange={(e) => setForm({ ...form, passengerInjuries: e.target.value })}
                      placeholder="Describe any passenger injuries or state 'None'"
                      rows={2}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
                {/* Third party */}
                <div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={form.thirdPartyInvolved}
                      onChange={(e) => setForm({ ...form, thirdPartyInvolved: e.target.checked })}
                    />
                    Third party involved
                  </label>
                  {form.thirdPartyInvolved && (
                    <textarea
                      value={form.thirdPartyInfo}
                      onChange={(e) => setForm({ ...form, thirdPartyInfo: e.target.value })}
                      placeholder="Name, contact, vehicle, insurance info"
                      rows={2}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
                {/* Police */}
                <div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={form.policeInvolved}
                      onChange={(e) => setForm({ ...form, policeInvolved: e.target.checked })}
                    />
                    Police responded
                  </label>
                  {form.policeInvolved && (
                    <input
                      type="text"
                      value={form.policeReportNumber}
                      onChange={(e) => setForm({ ...form, policeReportNumber: e.target.value })}
                      placeholder="Police report number"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
                {/* Injuries */}
                <div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={form.injuries}
                      onChange={(e) => setForm({ ...form, injuries: e.target.checked })}
                    />
                    Injuries reported
                  </label>
                  {form.injuries && (
                    <textarea
                      value={form.injuryDescription}
                      onChange={(e) => setForm({ ...form, injuryDescription: e.target.value })}
                      placeholder="Describe injuries"
                      rows={2}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
                {/* Property damage */}
                <div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={form.propertyDamage}
                      onChange={(e) => setForm({ ...form, propertyDamage: e.target.checked })}
                    />
                    Property damage
                  </label>
                  {form.propertyDamage && (
                    <textarea
                      value={form.damageDescription}
                      onChange={(e) => setForm({ ...form, damageDescription: e.target.value })}
                      placeholder="Describe damage"
                      rows={2}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
                {/* Insurance */}
                <div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={form.insuranceClaimed}
                      onChange={(e) => setForm({ ...form, insuranceClaimed: e.target.checked })}
                    />
                    Insurance claim filed
                  </label>
                  {form.insuranceClaimed && (
                    <input
                      type="text"
                      value={form.insuranceClaimNumber}
                      onChange={(e) => setForm({ ...form, insuranceClaimNumber: e.target.value })}
                      placeholder="Claim number"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div />
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Filing report...' : 'File accident report'}
              </button>
            </div>
          </form>
        )}

        {/* ── VIEW REPORTS TAB ── */}
        {tab === 'view' && (
          <div>
            {/* Filters */}
            <div className="form-section">
              <div className="form-grid">
                <div>
                  <label htmlFor="filterType">Type</label>
                  <select
                    id="filterType"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  >
                    <option value="">All types</option>
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filterStatus">Status</label>
                  <select
                    id="filterStatus"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filterDriver">Driver name</label>
                  <input
                    id="filterDriver"
                    type="text"
                    value={filters.driver}
                    onChange={(e) => setFilters({ ...filters, driver: e.target.value })}
                    placeholder="Search by driver"
                  />
                </div>
                <div>
                  <label htmlFor="filterFrom">From date</label>
                  <input
                    id="filterFrom"
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="filterTo">To date</label>
                  <input
                    id="filterTo"
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={loadReports} disabled={loadingReports}>
                  {loadingReports ? 'Loading...' : 'Search'}
                </button>
              </div>
            </div>

            {reportsError && <div className="feedback error">{reportsError}</div>}

            {/* Results table */}
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Report #</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Filed by</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 && !loadingReports && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                        No reports found. Adjust filters or file the first report.
                      </td>
                    </tr>
                  )}
                  {reports.map((report) => (
                    <>
                      <tr key={report._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={tdStyle}><strong>{report.reportNumber}</strong></td>
                        <td style={tdStyle}>{formatDate(report.incidentDate)}</td>
                        <td style={tdStyle}>{typeLabel(report.type)}</td>
                        <td style={tdStyle}>{report.driverName}</td>
                        <td style={tdStyle}>{report.location}</td>
                        <td style={tdStyle}>
                          <span className={STATUS_BADGE[report.status] || 'badge badge-info'}>
                            {STATUSES.find((s) => s.value === report.status)?.label || report.status}
                          </span>
                        </td>
                        <td style={tdStyle}>{report.reportedBy || '—'}</td>
                        <td style={tdStyle}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => toggleExpand(report._id)}
                          >
                            {expandedId === report._id ? 'Collapse' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === report._id && (
                        <tr key={`${report._id}-detail`}>
                          <td colSpan={8} style={{ background: '#f9fafb', padding: '16px 20px' }}>
                            <ReportDetail
                              report={report}
                              updateForm={updateForm}
                              setUpdateForm={setUpdateForm}
                              onSave={() => saveUpdate(report._id)}
                              saving={updating}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const thStyle = { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontSize: 13, color: '#6b7280', fontWeight: 600 };
const tdStyle = { padding: '10px 12px', fontSize: 14, verticalAlign: 'top' };

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: '#6b7280', display: 'block' }}>{label}</span>
      <span style={{ fontSize: 14 }}>{value}</span>
    </div>
  );
}

function ReportDetail({ report, updateForm, setUpdateForm, onSave, saving }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Field label="Report number" value={report.reportNumber} />
        <Field label="Incident date" value={report.incidentDate ? `${new Date(report.incidentDate).toLocaleDateString()}${report.incidentTime ? ` at ${report.incidentTime}` : ''}` : null} />
        <Field label="Type" value={INCIDENT_TYPES.find((t) => t.value === report.type)?.label} />
        <Field label="Location" value={report.location} />
        <Field label="Driver" value={report.driverName + (report.driverIdNumber ? ` (ID: ${report.driverIdNumber})` : '')} />
        <Field label="Vehicle" value={[report.vehicleDescription, report.vehiclePlate].filter(Boolean).join(' — ')} />
        <Field label="Police report #" value={report.policeInvolved ? (report.policeReportNumber || 'Yes — no number recorded') : null} />
        <Field label="Insurance claim #" value={report.insuranceClaimed ? (report.insuranceClaimNumber || 'Yes — no number recorded') : null} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#6b7280', display: 'block' }}>Description</span>
        <p style={{ fontSize: 14, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{report.description}</p>
      </div>

      {report.passengersInvolved && <Field label="Passenger injuries" value={report.passengerInjuries || 'Passengers involved — no injury details recorded'} />}
      {report.thirdPartyInvolved && <Field label="Third party info" value={report.thirdPartyInfo || 'Third party involved — no details recorded'} />}
      {report.injuries && <Field label="Injury description" value={report.injuryDescription} />}
      {report.propertyDamage && <Field label="Damage description" value={report.damageDescription} />}
      {report.resolution && <Field label="Resolution" value={report.resolution} />}

      {report.internalNotes?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Internal notes</span>
          {report.internalNotes.map((n) => (
            <div key={n._id} style={{ fontSize: 13, borderLeft: '3px solid #e5e7eb', paddingLeft: 10, marginBottom: 6 }}>
              <span>{n.note}</span>
              <span style={{ color: '#9ca3af', marginLeft: 8, fontSize: 12 }}>— {n.addedBy} {n.addedAt ? new Date(n.addedAt).toLocaleString() : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Update controls */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Update status</label>
          <select
            value={updateForm.status || ''}
            onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Resolution notes</label>
          <input
            type="text"
            value={updateForm.resolution || ''}
            onChange={(e) => setUpdateForm({ ...updateForm, resolution: e.target.value })}
            placeholder="How was this resolved?"
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Add internal note</label>
          <textarea
            rows={2}
            value={updateForm.note || ''}
            onChange={(e) => setUpdateForm({ ...updateForm, note: e.target.value })}
            placeholder="Internal note visible only to admins"
          />
        </div>
        <div>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
