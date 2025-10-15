import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { listAdmins, updateApproval } from '../../services/adminService';

const statusFilters = [
  { value: 'all', label: 'All admins' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'yes', label: 'Approved' },
  { value: 'no', label: 'Rejected' },
];

const AdminApprovals = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [updating, setUpdating] = useState('');

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listAdmins();
        const payload =
          res.data?.admins ||
          res.data?.results ||
          res.data?.data ||
          res.data ||
          [];
        setAdmins(Array.isArray(payload) ? payload : []);
      } catch (err) {
        const msg = err.response?.data?.message || 'Unable to fetch admin accounts';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();
    return admins.filter((admin) => {
      const approved = (admin.approved || admin.status || '').toLowerCase();
      const matchesFilter = filter === 'all' || approved === filter;
      if (!matchesFilter) return false;
      if (!query) return true;
      const target = [
        admin.firstName,
        admin.lastName,
        admin.email,
        admin.company,
        admin.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(query);
    });
  }, [admins, search, filter]);

  const handleApprovalChange = async (id, nextState) => {
    setUpdating(id + nextState);
    setError('');
    try {
      await updateApproval(id, nextState);
      setAdmins((prev) =>
        prev.map((admin) =>
          admin._id === id
            ? {
                ...admin,
                approved: nextState,
              }
            : admin,
        ),
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update approval status';
      setError(msg);
    } finally {
      setUpdating('');
    }
  };

  const renderBody = () => {
    if (loading) {
      return <div className="skeleton" style={{ height: '240px' }} />;
    }
    if (error) {
      return <div className="feedback error">{error}</div>;
    }
    if (!filteredAdmins.length) {
      return <div className="empty-state">No admins match your current filters.</div>;
    }

    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAdmins.map((admin) => {
            const approval = (admin.approved || admin.status || 'pending').toLowerCase();
            const badgeClass =
              approval === 'yes'
                ? 'badge-success'
                : approval === 'no'
                ? 'badge-warning'
                : 'badge-info';
            return (
              <tr key={admin._id}>
                <td>
                  <div className="table-stack">
                    <span className="primary">
                      {admin.firstName} {admin.lastName}
                    </span>
                    <span className="secondary">{admin.company || 'No company on file'}</span>
                  </div>
                </td>
                <td>
                  <div className="table-stack">
                    <span className="primary">{admin.email || '—'}</span>
                    <span className="secondary">{admin.phone || 'No phone provided'}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${badgeClass}`}>
                    {approval === 'yes' ? 'Approved' : approval === 'no' ? 'Rejected' : 'Pending'}
                  </span>
                </td>
                <td>
                  <div className="pill-group">
                    <button
                      type="button"
                      className="pill-button"
                      disabled={updating === admin._id + 'yes'}
                      onClick={() => handleApprovalChange(admin._id, 'yes')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="pill-button"
                      disabled={updating === admin._id + 'no'}
                      onClick={() => handleApprovalChange(admin._id, 'no')}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <AppLayout
      title="Admin access approvals"
      subtitle="Grant or deny access to dispatch tools for new administrators."
    >
      <div className="surface">
        <div className="toolbar">
          <div className="search-input">
            <span className="icon">🔍</span>
            <input
              type="search"
              placeholder="Search by name, company or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="summary">{filteredAdmins.length} of {admins.length} admins</div>
        </div>
        {renderBody()}
      </div>
    </AppLayout>
  );
};

export default AdminApprovals;
