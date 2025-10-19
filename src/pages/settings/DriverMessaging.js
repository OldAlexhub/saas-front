import { useCallback, useEffect, useMemo, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import { listActives } from '../../services/activeService';
import {
  createDriverMessage,
  deleteDriverMessage,
  sendDriverMessageNow,
  updateDriverMessage,
  listDriverMessages,
} from '../../services/driverMessageService';
import { listDrivers } from '../../services/driverService';

const DEFAULT_LEAD_MINUTES = 10;

const getDefaultSendAt = () => {
  const base = new Date(Date.now() + DEFAULT_LEAD_MINUTES * 60 * 1000);
  base.setSeconds(0, 0);
  return base.toISOString().slice(0, 16);
};

const defaultForm = {
  title: '',
  body: '',
  audienceType: 'all',
  driverIds: [],
  sendAt: getDefaultSendAt(),
  repeatMode: 'none',
  repeatUntil: '',
  notes: '',
};

const DriverMessaging = () => {
  const [form, setForm] = useState(defaultForm);
  const [messages, setMessages] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activesLookup, setActivesLookup] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [driversError, setDriversError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [sendNowLoading, setSendNowLoading] = useState(false);
  const isEditing = Boolean(editingId);
  const [pendingDelete, setPendingDelete] = useState({ id: '', title: '', open: false });

  useEffect(() => {
    let ignore = false;

    const loadMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await listDriverMessages();
        if (ignore) return;
        const payload =
          response.data?.messages || response.data?.results || response.data || [];
        setMessages(Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (!ignore) {
          const message = err.response?.data?.message || 'Unable to load driver messages.';
          setError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    const fetchDrivers = async () => {
      try {
        const [driverRes, activesRes] = await Promise.all([
          listDrivers(),
          listActives().catch(() => ({ data: [] })),
        ]);

        if (ignore) return;

        const driverPayload =
          driverRes.data?.drivers || driverRes.data?.results || driverRes.data || [];
        setDrivers(Array.isArray(driverPayload) ? driverPayload : []);

        const activesPayload =
          activesRes.data?.data || activesRes.data?.actives || activesRes.data || [];
        if (Array.isArray(activesPayload)) {
          const map = new Map();
          activesPayload.forEach((active) => {
            if (!active || !active.driverId) return;
            map.set(String(active.driverId), active);
          });
          setActivesLookup(map);
        }
      } catch (err) {
        if (!ignore) {
          const message = err.response?.data?.message || 'Unable to load drivers.';
          setDriversError(message);
        }
      }
    };

    loadMessages();
    fetchDrivers();

    return () => {
      ignore = true;
    };
  }, []);

  const driverOptions = useMemo(() => {
    return drivers
      .map((driver) => {
        const driverId = driver.driverId || driver._id || '';
        if (!driverId) return null;
        const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driverId;
        const active = activesLookup.get(String(driverId));
        const status = active
          ? `${active.status || 'Inactive'} - ${active.availability || 'Offline'}`
          : driver.status || 'Inactive';
        return {
          value: String(driverId),
          label: `${name} (${status})`,
        };
      })
      .filter(Boolean);
  }, [drivers, activesLookup]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDriverSelect = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setForm((prev) => ({
      ...prev,
      driverIds: values,
    }));
  };

  const resetForm = () => {
    setForm({
      ...defaultForm,
      sendAt: getDefaultSendAt(),
    });
    setEditingId('');
  };

  const toLocalInputValue = useCallback((value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }, []);

  const startEdit = useCallback(
    (message) => {
      if (!message) return;

      const repeatMode =
        message.scheduleType === 'repeat'
          ? message.repeatFrequency === 'weekly'
            ? 'weekly'
            : 'daily'
          : 'none';

      setForm({
        title: message.title || '',
        body: message.body || '',
        audienceType: message.audienceType || 'all',
        driverIds: Array.isArray(message.driverIds)
          ? message.driverIds.map(String)
          : [],
        sendAt: toLocalInputValue(message.sendAt) || getDefaultSendAt(),
        repeatMode,
        repeatUntil: toLocalInputValue(message.repeatUntil) || '',
        notes: message.notes || '',
      });
      setEditingId(message._id ? String(message._id) : message.id || '');
      setSuccess('');
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [toLocalInputValue],
  );

  const cancelEdit = () => {
    resetForm();
    setSuccess('');
    setError('');
  };

  const fetchMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listDriverMessages();
      const payload = response.data?.messages || response.data?.results || response.data || [];
      setMessages(Array.isArray(payload) ? payload : []);
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to load driver messages.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const buildBasePayload = () => {
    const trimmedTitle = form.title.trim();
    const trimmedBody = form.body.trim();

    if (!trimmedTitle) {
      throw new Error('Title is required.');
    }
    if (!trimmedBody) {
      throw new Error('Message body is required.');
    }
    if (form.audienceType === 'driver' && (!form.driverIds || form.driverIds.length === 0)) {
      throw new Error('Select at least one driver when targeting specific drivers.');
    }

    return {
      title: trimmedTitle,
      body: trimmedBody,
      audienceType: form.audienceType,
      driverIds: form.audienceType === 'driver' ? form.driverIds : [],
      notes: form.notes?.trim() || undefined,
    };
  };

  const buildScheduledPayload = () => {
    const payload = buildBasePayload();

    if (!form.sendAt) {
      throw new Error('Choose when the message should be sent.');
    }

    const sendAtDate = new Date(form.sendAt);
    if (Number.isNaN(sendAtDate.getTime())) {
      throw new Error('Send time is invalid.');
    }

    payload.sendAt = sendAtDate.toISOString();
    payload.repeatMode = form.repeatMode;
    payload.repeatUntil =
      form.repeatMode === 'none' || !form.repeatUntil
        ? undefined
        : new Date(form.repeatUntil).toISOString();

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildScheduledPayload();

      if (isEditing) {
        await updateDriverMessage(editingId, payload);
        setSuccess('Message updated.');
      } else {
        await createDriverMessage(payload);
        setSuccess('Message scheduled successfully.');
      }

      resetForm();
      await fetchMessages();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        (isEditing ? 'Failed to update message.' : 'Failed to schedule message.');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setSendNowLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildBasePayload();
      await sendDriverMessageNow(payload);
      setSuccess('Message sent to drivers.');
      resetForm();
      await fetchMessages();
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to send message.';
      setError(message);
    } finally {
      setSendNowLoading(false);
    }
  };

  const requestDelete = (message) => {
    const rowId = message._id ? String(message._id) : message.id || '';
    setPendingDelete({
      id: rowId,
      title: message.title || 'Driver message',
      open: true,
    });
    setError('');
    setSuccess('');
  };

  const closeDeleteDialog = () => {
    setPendingDelete({ id: '', title: '', open: false });
  };

  const confirmDelete = async () => {
    if (!pendingDelete.id) return;
    setDeletingId(pendingDelete.id);
    setError('');
    setSuccess('');

    try {
      await deleteDriverMessage(pendingDelete.id);
      await fetchMessages();
      setSuccess('Message deleted.');
      if (editingId === pendingDelete.id) {
        resetForm();
      }
      closeDeleteDialog();
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to delete message.';
      setError(message);
    } finally {
      setDeletingId('');
    }
  };

  const renderAudience = (message) => {
    if (message.audienceType === 'all') return 'All drivers';
    const count = Array.isArray(message.driverIds) ? message.driverIds.length : 0;
    return `Targeted (${count})`;
  };

  const renderRepeat = (message) => {
    if (message.scheduleType !== 'repeat') return 'One time';
    return message.repeatFrequency === 'weekly' ? 'Weekly' : 'Daily';
  };

  return (
    <>
      <AppLayout
      title="Driver messaging"
      subtitle="Broadcast announcements to the fleet or schedule reminders for specific drivers."
    >
      <div className="panel" style={{ marginBottom: '32px' }}>
        <form className="panel-body" onSubmit={handleSubmit}>
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3>Compose message</h3>
              <p className="panel-subtitle">
                Pick the audience, delivery time and recurrence that best fits the message.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleInputChange}
                required
                placeholder="Shift change reminder"
              />
            </div>
            <div>
              <label htmlFor="audienceType">Audience</label>
              <select
                id="audienceType"
                name="audienceType"
                value={form.audienceType}
                onChange={handleInputChange}
              >
                <option value="all">All drivers</option>
                <option value="driver">Specific drivers</option>
              </select>
            </div>
            <div>
              <label htmlFor="sendAt">Send at</label>
              <input
                id="sendAt"
                name="sendAt"
                type="datetime-local"
                value={form.sendAt}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label htmlFor="repeatMode">Repeat</label>
              <select
                id="repeatMode"
                name="repeatMode"
                value={form.repeatMode}
                onChange={handleInputChange}
              >
                <option value="none">One time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            {form.repeatMode !== 'none' && (
              <div>
                <label htmlFor="repeatUntil">Repeat until</label>
                <input
                  id="repeatUntil"
                  name="repeatUntil"
                  type="datetime-local"
                  value={form.repeatUntil}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>

          {form.audienceType === 'driver' && (
            <div>
              <label htmlFor="driverIds">Drivers</label>
              <select
                id="driverIds"
                name="driverIds"
                multiple
                value={form.driverIds}
                onChange={handleDriverSelect}
                size={Math.min(Math.max(driverOptions.length, 4), 10)}
              >
                {driverOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {driversError && <div className="feedback error" style={{ marginTop: '8px' }}>{driversError}</div>}
            </div>
          )}

          <div>
            <label htmlFor="body">Message</label>
            <textarea
              id="body"
              name="body"
              rows={4}
              value={form.body}
              onChange={handleInputChange}
              placeholder="Remember to sync your meter before the morning rush."
              required
            />
          </div>

          <div>
            <label htmlFor="notes">Internal notes (optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={form.notes}
              onChange={handleInputChange}
              placeholder="Visible to dispatchers only."
            />
          </div>

          {error && <div className="feedback error">{error}</div>}
          {success && <div className="feedback success">{success}</div>}

          <div
            className="panel-footer"
            style={{ justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={isEditing ? cancelEdit : resetForm}
              disabled={saving || sendNowLoading}
            >
              {isEditing ? 'Cancel editing' : 'Reset'}
            </button>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSendNow}
                disabled={sendNowLoading || saving}
              >
                {sendNowLoading ? 'Sending...' : 'Send now'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {isEditing ? (saving ? 'Updating...' : 'Update message') : saving ? 'Scheduling...' : 'Schedule message'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header builder-toolbar">
          <h3>Scheduled messages</h3>
          <span className="panel-subtitle">
            Track upcoming communications and cancel notices that are no longer needed.
          </span>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          {loading ? (
            <div className="skeleton" style={{ height: '160px', borderRadius: '12px' }} />
          ) : error && messages.length === 0 ? (
            <div className="feedback error">{error}</div>
          ) : messages.length === 0 ? (
            <div className="fleet-alert-empty">No messages scheduled yet.</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Audience</th>
                    <th>Next delivery</th>
                    <th>Recurrence</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => {
                    const rowId = message._id ? String(message._id) : message.id || '';
                    const nextRun = message.nextRunAt ? new Date(message.nextRunAt) : null;
                    const sendAt = message.sendAt ? new Date(message.sendAt) : null;
                    const isRowEditing = editingId === rowId;
                    const isDeleting = deletingId === rowId;
                    return (
                      <tr key={rowId || message.title}>
                        <td>
                          <div className="table-stack">
                            <span className="primary">{message.title}</span>
                            <span className="secondary">
                              {message.notes || (message.body || '').slice(0, 80)}
                              {(message.body || '').length > 80 ? '...' : ''}
                            </span>
                          </div>
                        </td>
                        <td>{renderAudience(message)}</td>
                        <td>
                          {nextRun
                            ? `${nextRun.toLocaleString()}`
                            : sendAt
                            ? `${sendAt.toLocaleString()}`
                            : '—'}
                        </td>
                        <td>{renderRepeat(message)}</td>
                        <td>
                          <span
                            className={`badge ${
                              message.status === 'scheduled'
                                ? 'badge-info'
                                : message.status === 'cancelled'
                                ? 'badge-warning'
                                : 'badge-success'
                            }`}
                          >
                            {message.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {message.status === 'scheduled' && (
                              <button
                                type="button"
                                className="btn btn-subtle"
                                onClick={() => startEdit(message)}
                                disabled={isRowEditing || saving || sendNowLoading}
                              >
                                {isRowEditing ? 'Editing' : 'Edit'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => requestDelete(message)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
      {pendingDelete.open && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: 'rgba(15, 23, 42, 0.97)',
              borderRadius: '16px',
              padding: '28px',
              width: 'min(480px, 92vw)',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(96, 165, 250, 0.25)',
              color: 'var(--text-primary)',
            }}
          >
            <h3 style={{ margin: '0 0 12px' }}>Delete driver message?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              "{pendingDelete.title}" will be removed permanently and will no longer send to drivers.
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeDeleteDialog}
                disabled={Boolean(deletingId)}
              >
                Keep message
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? 'Deleting...' : 'Delete message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DriverMessaging;
