import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import {
  listAgencies, createAgency, updateAgency, deactivateAgency,
} from '../../services/nemtService';

const emptyForm = () => ({
  name: '', contactName: '', contactEmail: '', contactPhone: '', billingAddress: '',
});

const NemtAgencies = () => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['nemt-agencies'],
    queryFn: async () => {
      const res = await listAgencies();
      return res.data?.agencies || [];
    },
  });
  const agencies = data ?? [];

  const setCreate = (field) => (e) => setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setEdit = (field) => (e) => setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await createAgency(createForm);
      setCreateForm(emptyForm());
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['nemt-agencies'] });
      setMessage('Agency created.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agency.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (agency) => {
    setEditId(agency._id);
    setEditForm({
      name: agency.name || '',
      contactName: agency.contactName || '',
      contactEmail: agency.contactEmail || '',
      contactPhone: agency.contactPhone || '',
      billingAddress: agency.billingAddress || '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateAgency(editId, editForm);
      setEditId(null);
      qc.invalidateQueries({ queryKey: ['nemt-agencies'] });
      setMessage('Agency updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update agency.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (agency) => {
    if (!window.confirm(`Deactivate ${agency.name}? It will no longer appear in trip creation.`)) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deactivateAgency(agency._id);
      qc.invalidateQueries({ queryKey: ['nemt-agencies'] });
      setMessage('Agency deactivated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate agency.');
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <button type="button" className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
      {showCreate ? 'Cancel' : '＋ New agency'}
    </button>
  );

  return (
    <AppLayout title="NEMT Agencies" subtitle="Manage the agencies that authorize NEMT trips." actions={actions}>
      <div className="surface">
        {message && <div className="feedback success">{message}</div>}
        {error && <div className="feedback error">{error}</div>}

        {showCreate && (
          <section className="panel" style={{ marginBottom: 24, maxWidth: 640 }}>
            <form onSubmit={handleCreate}>
              <div className="panel-header"><h3>New agency</h3></div>
              <div className="panel-body">
                <div className="form-grid">
                  <div className="full-width">
                    <label htmlFor="ca-name">Agency name</label>
                    <input id="ca-name" type="text" value={createForm.name} onChange={setCreate('name')} required />
                  </div>
                  <div>
                    <label htmlFor="ca-contactName">Contact name</label>
                    <input id="ca-contactName" type="text" value={createForm.contactName} onChange={setCreate('contactName')} />
                  </div>
                  <div>
                    <label htmlFor="ca-contactEmail">Contact email</label>
                    <input id="ca-contactEmail" type="email" value={createForm.contactEmail} onChange={setCreate('contactEmail')} />
                  </div>
                  <div>
                    <label htmlFor="ca-contactPhone">Contact phone</label>
                    <input id="ca-contactPhone" type="tel" value={createForm.contactPhone} onChange={setCreate('contactPhone')} />
                  </div>
                  <div className="full-width">
                    <label htmlFor="ca-billingAddress">Billing address</label>
                    <input id="ca-billingAddress" type="text" value={createForm.billingAddress} onChange={setCreate('billingAddress')} />
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <button type="submit" className="btn btn-primary" disabled={saving}>Create agency</button>
              </div>
            </form>
          </section>
        )}

        {isLoading ? (
          <div className="skeleton" style={{ height: 240 }} />
        ) : agencies.length === 0 ? (
          <div className="empty-state">No agencies yet. Add one to start creating NEMT trips.</div>
        ) : (
          <div className="table-responsive-stack">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>ID</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr key={a._id}>
                    {editId === a._id ? (
                      <td colSpan={5}>
                        <form onSubmit={handleUpdate}>
                          <div className="form-grid" style={{ padding: '8px 0' }}>
                            <div>
                              <label htmlFor={`ea-name-${a._id}`}>Name</label>
                              <input id={`ea-name-${a._id}`} type="text" value={editForm.name} onChange={setEdit('name')} required />
                            </div>
                            <div>
                              <label htmlFor={`ea-contact-${a._id}`}>Contact name</label>
                              <input id={`ea-contact-${a._id}`} type="text" value={editForm.contactName} onChange={setEdit('contactName')} />
                            </div>
                            <div>
                              <label htmlFor={`ea-email-${a._id}`}>Email</label>
                              <input id={`ea-email-${a._id}`} type="email" value={editForm.contactEmail} onChange={setEdit('contactEmail')} />
                            </div>
                            <div>
                              <label htmlFor={`ea-phone-${a._id}`}>Phone</label>
                              <input id={`ea-phone-${a._id}`} type="tel" value={editForm.contactPhone} onChange={setEdit('contactPhone')} />
                            </div>
                            <div className="full-width">
                              <label htmlFor={`ea-billing-${a._id}`}>Billing address</label>
                              <input id={`ea-billing-${a._id}`} type="text" value={editForm.billingAddress} onChange={setEdit('billingAddress')} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
                              <button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
                            </div>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td data-label="Agency">
                          <span className="primary">{a.name}</span>
                        </td>
                        <td data-label="ID">{a.agencyId}</td>
                        <td data-label="Contact">
                          <div className="table-stack">
                            <span className="primary">{a.contactName || '—'}</span>
                            <span className="secondary">{a.contactEmail || a.contactPhone || ''}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="pill-button" onClick={() => startEdit(a)}>Edit</button>
                            {a.status === 'active' && (
                              <button type="button" className="pill-button" onClick={() => handleDeactivate(a)} disabled={saving}>Deactivate</button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NemtAgencies;
