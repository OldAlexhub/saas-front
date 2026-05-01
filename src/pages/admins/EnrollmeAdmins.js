import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import {
  createEnrollmeAdmin,
  deleteEnrollmeAdmin,
  listEnrollmeAdmins,
  updateEnrollmeAdmin,
} from '../../services/enrollmeAdminService';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  compliance_manager: 'Compliance Manager',
  reviewer: 'Reviewer',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);

const EMPTY_FORM = { name: '', email: '', password: '', role: 'reviewer' };

const EnrollmeAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listEnrollmeAdmins();
        setAdmins(res.data?.admins || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to fetch EnrollMe admins.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      [a.name, a.email, ROLE_LABELS[a.role]].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [admins, search]);

  const handleFormChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await createEnrollmeAdmin(form);
      setAdmins((prev) => [res.data.admin, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create admin.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin) => {
    setTogglingId(admin.id);
    setError('');
    try {
      const res = await updateEnrollmeAdmin(admin.id, { isActive: !admin.isActive });
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? res.data.admin : a)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update admin.');
    } finally {
      setTogglingId('');
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await deleteEnrollmeAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete admin.');
    } finally {
      setDeletingId('');
    }
  };

  const renderTable = () => {
    if (loading) return <div className="skeleton" style={{ height: '240px' }} />;
    if (error) return <div className="feedback error">{error}</div>;
    if (!filtered.length) return <div className="empty-state">No EnrollMe admins found.</div>;

    return (
      <div className="table-responsive-stack">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((admin) => (
              <tr key={admin.id}>
                <td data-label="Name">
                  <span className="primary">{admin.name}</span>
                </td>
                <td data-label="Email">
                  <span className="primary">{admin.email}</span>
                </td>
                <td data-label="Role">
                  <span className="secondary">{ROLE_LABELS[admin.role] || admin.role}</span>
                </td>
                <td data-label="Status">
                  <span className={`badge ${admin.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td data-label="Last Login">
                  <span className="secondary">
                    {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : '—'}
                  </span>
                </td>
                <td data-label="Actions">
                  {confirmDeleteId === admin.id ? (
                    <div className="pill-group">
                      <span className="secondary" style={{ fontSize: '0.8rem' }}>Delete?</span>
                      <button
                        type="button"
                        className="pill-button"
                        disabled={deletingId === admin.id}
                        onClick={() => handleDelete(admin.id)}
                      >
                        {deletingId === admin.id ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        className="pill-button"
                        onClick={() => setConfirmDeleteId('')}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="pill-group">
                      <button
                        type="button"
                        className="pill-button"
                        disabled={togglingId === admin.id}
                        onClick={() => handleToggleActive(admin)}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="pill-button"
                        onClick={() => setConfirmDeleteId(admin.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
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
      title="EnrollMe Admins"
      subtitle="Manage admin accounts for the driver enrollment portal."
      actions={
        <button
          type="button"
          className="pill-button"
          onClick={() => {
            setShowForm((v) => !v);
            setFormError('');
            setForm(EMPTY_FORM);
          }}
        >
          {showForm ? 'Cancel' : 'Add Admin'}
        </button>
      }
    >
      {showForm && (
        <div className="surface" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleCreate}>
            <div className="form-grid two-column">
              <div>
                <label htmlFor="em-name">Full name</label>
                <input
                  id="em-name"
                  name="name"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="em-email">Email</label>
                <input
                  id="em-email"
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="em-password">Password</label>
                <input
                  id="em-password"
                  name="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleFormChange}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="em-role">Role</label>
                <select
                  id="em-role"
                  name="role"
                  className="filter-select"
                  value={form.role}
                  onChange={handleFormChange}
                  style={{ width: '100%' }}
                >
                  {ROLE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {formError && <div className="feedback error" style={{ marginTop: '0.75rem' }}>{formError}</div>}
            <div className="pill-group" style={{ marginTop: '1rem' }}>
              <button type="submit" className="pill-button" disabled={saving}>
                {saving ? 'Saving…' : 'Create Admin'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by name, email or role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="summary">{filtered.length} of {admins.length} admins</div>
        </div>
        {!loading && error && <div className="feedback error">{error}</div>}
        {renderTable()}
      </div>
    </AppLayout>
  );
};

export default EnrollmeAdmins;
