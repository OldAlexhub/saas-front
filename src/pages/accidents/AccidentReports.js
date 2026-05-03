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
  try { return new Date(value).toLocaleDateString(); } catch { return '—'; }
};

const typeLabel = (value) => INCIDENT_TYPES.find((t) => t.value === value)?.label || value;

export default function AccidentReports() {
  const [tab, setTab] = useState('file');

  const [form, setForm] = useState(emptyForm);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ type: '', status: '', driver: '', from: '', to: '' });
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    listDriversForAccident().then((r) => setDrivers(r.data?.drivers || [])).catch(() => {});
    listVehiclesForAccident().then((r) => setVehicles(r.data?.vehicles || [])).catch(() => {});
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
    if (!id) { setForm((f) => ({ ...f, driverRef: '', driverName: '', driverIdNumber: '' })); return; }
    const d = drivers.find((d) => d._id === id);
    setForm((f) => ({ ...f, driverRef: id, driverName: d ? `${d.firstName} ${d.lastName}` : '', driverIdNumber: d?.driverId || '' }));
  }

  function handleVehicleSelect(e) {
    const id = e.target.value;
    if (!id) { setForm((f) => ({ ...f, vehicleRef: '', vehiclePlate: '', vehicleDescription: '' })); return; }
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
    if (expandedId === id) { setExpandedId(null); setUpdateForm({}); return; }
    const report = reports.find((r) => r._id === id);
    setExpandedId(id);
    setUpdateForm({ status: report?.status || 'open', resolution: report?.resolution || '', note: '' });
  }

  async function saveUpdate(id) {
    setUpdating(true);
    try {
      const res = await updateAccidentReport(id, updateForm);
      setReports((cur) => cur.map((r) => (r._id === id ? res.data.report : r)));
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

        {/* ── Tab switcher ── */}
        <div className="map-toggle" style={{ justifyContent: 'flex-start', padding: '0 0 24px' }}>
          <button
            type="button"
            className={`btn btn-ghost ${tab === 'file' ? 'active' : ''}`}
            onClick={() => setTab('file')}
          >
            File a Report
          </button>
          <button
            type="button"
            className={`btn btn-ghost ${tab === 'view' ? 'active' : ''}`}
            onClick={() => setTab('view')}
          >
            View Reports
          </button>
        </div>

        {/* ── FILE REPORT TAB ── */}
        {tab === 'file' && (
          <form onSubmit={submitReport}>
            {submitMsg && <div className="feedback success" style={{ marginBottom: 20 }}>{submitMsg}</div>}
            {submitError && <div className="feedback error" style={{ marginBottom: 20 }}>{submitError}</div>}

            <div className="form-section">
              <div>
                <h3>Incident details</h3>
                <p>Record the basic facts of the event.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="type">Incident type</label>
                  <select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                    {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="incidentDate">Incident date</label>
                  <input id="incidentDate" type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="incidentTime">Time (approximate)</label>
                  <input id="incidentTime" type="time" value={form.incidentTime} onChange={(e) => setForm({ ...form, incidentTime: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="location">Location</label>
                  <input id="location" type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Address or intersection" required />
                </div>
                <div className="full-width">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe what happened in detail" required />
                </div>
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
                      <option key={d._id} value={d._id}>{d.firstName} {d.lastName} ({d.driverId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="driverName">Driver name (override / type manually)</label>
                  <input id="driverName" type="text" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Full name" required />
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
                  <input id="vehiclePlate" type="text" value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} placeholder="License plate" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Circumstances</h3>
                <p>Check all that apply and provide details.</p>
              </div>
              <div className="form-grid">
                <div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="passengersInvolved" checked={form.passengersInvolved} onChange={(e) => setForm({ ...form, passengersInvolved: e.target.checked })} />
                    <label htmlFor="passengersInvolved">Passengers in vehicle</label>
                  </div>
                  {form.passengersInvolved && (
                    <textarea value={form.passengerInjuries} onChange={(e) => setForm({ ...form, passengerInjuries: e.target.value })} placeholder="Describe any passenger injuries or state 'None'" rows={2} style={{ marginTop: 10 }} />
                  )}
                </div>
                <div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="thirdPartyInvolved" checked={form.thirdPartyInvolved} onChange={(e) => setForm({ ...form, thirdPartyInvolved: e.target.checked })} />
                    <label htmlFor="thirdPartyInvolved">Third party involved</label>
                  </div>
                  {form.thirdPartyInvolved && (
                    <textarea value={form.thirdPartyInfo} onChange={(e) => setForm({ ...form, thirdPartyInfo: e.target.value })} placeholder="Name, contact, vehicle, insurance info" rows={2} style={{ marginTop: 10 }} />
                  )}
                </div>
                <div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="policeInvolved" checked={form.policeInvolved} onChange={(e) => setForm({ ...form, policeInvolved: e.target.checked })} />
                    <label htmlFor="policeInvolved">Police responded</label>
                  </div>
                  {form.policeInvolved && (
                    <input type="text" value={form.policeReportNumber} onChange={(e) => setForm({ ...form, policeReportNumber: e.target.value })} placeholder="Police report number" style={{ marginTop: 10 }} />
                  )}
                </div>
                <div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="injuries" checked={form.injuries} onChange={(e) => setForm({ ...form, injuries: e.target.checked })} />
                    <label htmlFor="injuries">Injuries reported</label>
                  </div>
                  {form.injuries && (
                    <textarea value={form.injuryDescription} onChange={(e) => setForm({ ...form, injuryDescription: e.target.value })} placeholder="Describe injuries" rows={2} style={{ marginTop: 10 }} />
                  )}
                </div>
                <div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="propertyDamage" checked={form.propertyDamage} onChange={(e) => setForm({ ...form, propertyDamage: e.target.checked })} />
                    <label htmlFor="propertyDamage">Property damage</label>
                  </div>
                  {form.propertyDamage && (
                    <textarea value={form.damageDescription} onChange={(e) => setForm({ ...form, damageDescription: e.target.value })} placeholder="Describe damage" rows={2} style={{ marginTop: 10 }} />
                  )}
                </div>
                <div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="insuranceClaimed" checked={form.insuranceClaimed} onChange={(e) => setForm({ ...form, insuranceClaimed: e.target.checked })} />
                    <label htmlFor="insuranceClaimed">Insurance claim filed</label>
                  </div>
                  {form.insuranceClaimed && (
                    <input type="text" value={form.insuranceClaimNumber} onChange={(e) => setForm({ ...form, insuranceClaimNumber: e.target.value })} placeholder="Claim number" style={{ marginTop: 10 }} />
                  )}
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div />
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Filing report…' : 'File accident report'}
              </button>
            </div>
          </form>
        )}

        {/* ── VIEW REPORTS TAB ── */}
        {tab === 'view' && (
          <div>
            <div className="form-section">
              <div className="form-grid">
                <div>
                  <label htmlFor="filterType">Type</label>
                  <select id="filterType" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                    <option value="">All types</option>
                    {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="filterStatus">Status</label>
                  <select id="filterStatus" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="filterDriver">Driver name</label>
                  <input id="filterDriver" type="text" value={filters.driver} onChange={(e) => setFilters({ ...filters, driver: e.target.value })} placeholder="Search by driver" />
                </div>
                <div>
                  <label htmlFor="filterFrom">From date</label>
                  <input id="filterFrom" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="filterTo">To date</label>
                  <input id="filterTo" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                </div>
              </div>
              <div>
                <button type="button" className="btn btn-primary" onClick={loadReports} disabled={loadingReports}>
                  {loadingReports ? 'Loading…' : 'Search'}
                </button>
              </div>
            </div>

            {reportsError && <div className="feedback error" style={{ marginBottom: 16 }}>{reportsError}</div>}

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report #</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Driver</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Filed by</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 && !loadingReports && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                        No reports found. Adjust filters or file the first report.
                      </td>
                    </tr>
                  )}
                  {reports.map((report) => (
                    <>
                      <tr key={report._id}>
                        <td><strong>{report.reportNumber}</strong></td>
                        <td>{formatDate(report.incidentDate)}</td>
                        <td>{typeLabel(report.type)}</td>
                        <td>{report.driverName || '—'}</td>
                        <td>{report.location || '—'}</td>
                        <td>
                          <span className={STATUS_BADGE[report.status] || 'badge badge-info'}>
                            {STATUSES.find((s) => s.value === report.status)?.label || report.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{report.reportedBy || '—'}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn btn-ghost" onClick={() => toggleExpand(report._id)}>
                              {expandedId === report._id ? 'Collapse' : 'View'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === report._id && (
                        <tr key={`${report._id}-detail`}>
                          <td colSpan={8} style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.55)', borderBottom: '1px solid var(--surface-border)' }}>
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

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <dt style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  );
}

function ReportDetail({ report, updateForm, setUpdateForm, onSave, saving }) {
  return (
    <div>
      {/* Detail fields */}
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0 20px', marginBottom: 20 }}>
        <Field label="Report number" value={report.reportNumber} />
        <Field label="Incident date" value={report.incidentDate ? `${new Date(report.incidentDate).toLocaleDateString()}${report.incidentTime ? ` at ${report.incidentTime}` : ''}` : null} />
        <Field label="Type" value={INCIDENT_TYPES.find((t) => t.value === report.type)?.label} />
        <Field label="Location" value={report.location} />
        <Field label="Driver" value={report.driverName + (report.driverIdNumber ? ` (ID: ${report.driverIdNumber})` : '')} />
        <Field label="Vehicle" value={[report.vehicleDescription, report.vehiclePlate].filter(Boolean).join(' — ')} />
        <Field label="Police report #" value={report.policeInvolved ? (report.policeReportNumber || 'Yes — no number recorded') : null} />
        <Field label="Insurance claim #" value={report.insuranceClaimed ? (report.insuranceClaimNumber || 'Yes — no number recorded') : null} />
        {report.resolution && <Field label="Resolution" value={report.resolution} />}
      </dl>

      {report.description && (
        <div style={{ marginBottom: 16 }}>
          <dt style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 4 }}>Description</dt>
          <dd style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{report.description}</dd>
        </div>
      )}

      {report.passengersInvolved && <Field label="Passenger injuries" value={report.passengerInjuries || 'Passengers involved — no injury details recorded'} />}
      {report.thirdPartyInvolved && <Field label="Third party info" value={report.thirdPartyInfo || 'Third party involved — no details recorded'} />}
      {report.injuries && <Field label="Injury description" value={report.injuryDescription} />}
      {report.propertyDamage && <Field label="Damage description" value={report.damageDescription} />}

      {report.internalNotes?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '0 0 8px' }}>Internal notes</p>
          {report.internalNotes.map((n) => (
            <div key={n._id} style={{ fontSize: '0.88rem', borderLeft: '3px solid var(--surface-border)', paddingLeft: 12, marginBottom: 8, color: 'var(--text-primary)' }}>
              <span>{n.note}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 10, fontSize: '0.8rem' }}>— {n.addedBy} {n.addedAt ? new Date(n.addedAt).toLocaleString() : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Update controls */}
      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 16, marginTop: 4 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '0 0 12px' }}>Update report</p>
        <div className="form-grid">
          <div>
            <label htmlFor="updateStatus">Status</label>
            <select id="updateStatus" value={updateForm.status || ''} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="updateResolution">Resolution notes</label>
            <input id="updateResolution" type="text" value={updateForm.resolution || ''} onChange={(e) => setUpdateForm({ ...updateForm, resolution: e.target.value })} placeholder="How was this resolved?" />
          </div>
          <div className="full-width">
            <label htmlFor="updateNote">Add internal note</label>
            <textarea id="updateNote" rows={2} value={updateForm.note || ''} onChange={(e) => setUpdateForm({ ...updateForm, note: e.target.value })} placeholder="Internal note visible only to admins" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
