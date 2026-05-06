import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { createRun } from '../../services/nemtService';
import { listActives } from '../../services/activeService';

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const NemtRunCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    serviceDate: todayIso,
    driverId: '',
    cabNumber: '',
    notes: '',
  });
  const [actives, setActives] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listActives().then((res) => {
      const list = res.data?.data || res.data?.actives || res.data || [];
      setActives(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);

  const set = (field) => (e) => {
    if (field === 'driverId') {
      const match = actives.find((a) => {
        const v = a.driverId ?? a._id;
        return v != null && String(v) === e.target.value;
      });
      setForm((prev) => ({
        ...prev,
        driverId: e.target.value,
        cabNumber: match?.cabNumber ? String(match.cabNumber) : prev.cabNumber,
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        serviceDate: form.serviceDate,
        driverId: form.driverId || undefined,
        cabNumber: form.cabNumber || undefined,
        notes: form.notes || undefined,
      };
      const res = await createRun(payload);
      const created = res.data?.run;
      navigate(`/nemt/runs/${created?._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create run.');
      setSaving(false);
    }
  };

  const driverOptions = actives
    .map((a) => {
      const value = a.driverId ?? a._id;
      if (!value) return null;
      const name = `${a.firstName || ''} ${a.lastName || ''}`.trim() || String(value);
      return { value: String(value), label: a.cabNumber ? `${name} — Cab ${a.cabNumber}` : name };
    })
    .filter(Boolean);

  const actions = (
    <a href="/nemt/runs" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); navigate('/nemt/runs'); }}>
      Back to runs
    </a>
  );

  return (
    <AppLayout title="New NEMT Run" subtitle="Create a driver manifest for a service day." actions={actions}>
      <div className="surface">
        {error && <div className="feedback error">{error}</div>}
        <div style={{ maxWidth: 560 }}>
          <section className="panel">
            <form onSubmit={handleSubmit}>
              <div className="panel-header"><h3>Run details</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div>
                    <label htmlFor="serviceDate">Service date</label>
                    <input id="serviceDate" type="date" value={form.serviceDate} onChange={set('serviceDate')} required />
                  </div>
                  <div>
                    <label htmlFor="driverId">Assign driver (optional)</label>
                    <select id="driverId" value={form.driverId} onChange={set('driverId')}>
                      <option value="">Unassigned</option>
                      {driverOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cabNumber">Cab number</label>
                    <input id="cabNumber" type="text" value={form.cabNumber} onChange={set('cabNumber')} placeholder="Optional" />
                  </div>
                  <div className="full-width">
                    <label htmlFor="notes">Notes</label>
                    <textarea id="notes" rows={2} value={form.notes} onChange={set('notes')} />
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create run'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default NemtRunCreate;
