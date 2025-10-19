import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import {
  addFare,
  createFlatRate,
  deleteFlatRate,
  getFare,
  listFlatRates,
  updateFare,
  updateFlatRate,
} from '../services/fareService';

const defaultFareForm = {
  farePerMile: '',
  extraPass: '',
  waitTimePerMinute: '',
  baseFare: '',
  minimumFare: '',
  waitTriggerSpeedMph: '5',
  idleGracePeriodSeconds: '60',
  meterRoundingMode: 'nearest_0.1',
  surgeEnabled: false,
  surgeMultiplier: '1',
  surgeNotes: '',
};

const defaultFlatRateForm = {
  name: '',
  distanceLabel: '',
  amount: '',
  active: true,
};

const roundingOptions = [
  { value: 'none', label: 'No rounding' },
  { value: 'nearest_0.1', label: 'Nearest $0.10' },
  { value: 'nearest_0.25', label: 'Nearest $0.25' },
  { value: 'nearest_0.5', label: 'Nearest $0.50' },
  { value: 'nearest_1', label: 'Nearest $1.00' },
];

const Fares = () => {
  const [form, setForm] = useState(defaultFareForm);
  const [isExisting, setIsExisting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fareMeta, setFareMeta] = useState(null);
  const [flatRates, setFlatRates] = useState([]);
  const [flatRateForm, setFlatRateForm] = useState(defaultFlatRateForm);
  const [flatRateMessage, setFlatRateMessage] = useState('');
  const [flatRateError, setFlatRateError] = useState('');
  const [savingFlatRate, setSavingFlatRate] = useState(false);
  const [otherFees, setOtherFees] = useState([]);
  const [otherFeeMessage, setOtherFeeMessage] = useState('');
  const [newFee, setNewFee] = useState({ name: '', amount: '' });
  const [otherFeeError, setOtherFeeError] = useState('');
  const [savingOtherFee, setSavingOtherFee] = useState(false);
  const [editFeeIndex, setEditFeeIndex] = useState(null);
  const [editFeeDraft, setEditFeeDraft] = useState({ name: '', amount: '' });

  const fetchFare = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getFare();
      const payload = res?.data?.fare || (res?.data && !Array.isArray(res.data) ? res.data : null);
      const activeFlatRates = Array.isArray(res?.data?.flatRates) ? res.data.flatRates : [];

      if (payload && typeof payload === 'object') {
        const {
          farePerMile,
          extraPass,
          waitTimePerMinute,
          baseFare,
          minimumFare,
          waitTriggerSpeedMph,
          idleGracePeriodSeconds,
          meterRoundingMode,
          surgeEnabled,
          surgeMultiplier,
          surgeNotes,
        } = payload;
        setForm({
          farePerMile: valueOrEmpty(farePerMile),
          extraPass: valueOrEmpty(extraPass),
          waitTimePerMinute: valueOrEmpty(waitTimePerMinute),
          baseFare: valueOrEmpty(baseFare),
          minimumFare: valueOrEmpty(minimumFare),
          waitTriggerSpeedMph: valueOrEmpty(waitTriggerSpeedMph, '5'),
          idleGracePeriodSeconds: valueOrEmpty(idleGracePeriodSeconds, '60'),
          meterRoundingMode: meterRoundingMode || 'nearest_0.1',
          surgeEnabled: Boolean(surgeEnabled),
          surgeMultiplier: valueOrEmpty(surgeMultiplier, '1'),
          surgeNotes: surgeNotes || '',
        });
        setFareMeta(payload);
        setIsExisting(true);
        setOtherFees(
          Array.isArray(payload.otherFees)
            ? payload.otherFees.map((fee) => ({
                name: fee?.name || '',
                amount: valueOrEmpty(fee?.amount),
              }))
            : [],
        );
      } else {
        setIsExisting(false);
        setFareMeta(null);
        setForm(defaultFareForm);
        setOtherFees([]);
      }
      setNewFee({ name: '', amount: '' });
      setOtherFeeError('');
      setOtherFeeMessage('');
      setEditFeeIndex(null);
      setEditFeeDraft({ name: '', amount: '' });
      setSavingOtherFee(false);
      setFlatRates(activeFlatRates);
    } catch (err) {
      console.error('Failed to fetch fare', err);
      setIsExisting(false);
      setFareMeta(null);
      setFlatRates([]);
      setForm(defaultFareForm);
      setOtherFees([]);
      setNewFee({ name: '', amount: '' });
      setOtherFeeError('');
      setOtherFeeMessage('');
      setEditFeeIndex(null);
      setEditFeeDraft({ name: '', amount: '' });
      setSavingOtherFee(false);
      setError(err.response?.data?.message || 'Unable to load fare settings.');
    } finally {
      setLoading(false);
    }
  };

  const refreshFlatRates = async () => {
    try {
      const res = await listFlatRates();
      const items = res?.data?.flatRates;
      setFlatRates(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load flat rates', err);
      setFlatRateError(err.response?.data?.message || 'Unable to load flat rates.');
    }
  };

  useEffect(() => {
    fetchFare();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNewFeeChange = (e) => {
    const { name, value } = e.target;
    setNewFee((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (otherFeeError) setOtherFeeError('');
    if (otherFeeMessage) setOtherFeeMessage('');
  };

  const beginEditOtherFee = (index) => {
    if (savingOtherFee) return;
    const fee = otherFees[index];
    if (!fee) return;
    setEditFeeIndex(index);
    setEditFeeDraft({ name: fee.name, amount: fee.amount });
    setOtherFeeError('');
    setOtherFeeMessage('');
  };

  const cancelEditOtherFee = () => {
    setEditFeeIndex(null);
    setEditFeeDraft({ name: '', amount: '' });
    setOtherFeeError('');
  };

  const handleEditFeeDraftChange = (e) => {
    const { name, value } = e.target;
    setEditFeeDraft((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (otherFeeError) setOtherFeeError('');
    if (otherFeeMessage) setOtherFeeMessage('');
  };

  const persistOtherFees = async (nextFees, successText) => {
    setSavingOtherFee(true);
    setOtherFeeError('');
    setOtherFeeMessage('');
    try {
      const payloadFees = nextFees.map((fee, index) => {
        const name = (fee?.name || '').trim();
        if (!name) {
          throw new Error(`Provide a fee name for row #${index + 1}.`);
        }
        const amountValue = fee?.amount;
        if (amountValue === '' || amountValue === undefined || amountValue === null) {
          throw new Error(`Provide an amount for "${name}".`);
        }
        const amount = Number(amountValue);
        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error(`Amount for "${name}" must be a non-negative number.`);
        }
        return { name, amount };
      });

      const response = await updateFare({ otherFees: payloadFees });
      const updatedFare = response?.data?.fare;

      if (updatedFare?.otherFees) {
        setOtherFees(
          updatedFare.otherFees.map((fee) => ({
            name: fee?.name || '',
            amount: valueOrEmpty(fee?.amount),
          })),
        );
      } else {
        setOtherFees(
          payloadFees.map((fee) => ({
            name: fee.name,
            amount: valueOrEmpty(fee.amount),
          })),
        );
      }

      setOtherFeeMessage(successText);
      setEditFeeIndex(null);
      setEditFeeDraft({ name: '', amount: '' });
      setNewFee({ name: '', amount: '' });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to update other fees.';
      setOtherFeeError(message);
    } finally {
      setSavingOtherFee(false);
    }
  };

  const addOtherFee = async () => {
    if (savingOtherFee) return;
    const name = newFee.name.trim();
    if (!name) {
      setOtherFeeError('Provide a fee name.');
      return;
    }
    if (newFee.amount === '') {
      setOtherFeeError('Provide a fee amount.');
      return;
    }
    const amountNumber = Number(newFee.amount);
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      setOtherFeeError('Amount must be a non-negative number.');
      return;
    }
    const nextFees = [...otherFees, { name, amount: String(newFee.amount) }];
    await persistOtherFees(nextFees, 'Other fee added.');
  };

  const saveEditedOtherFee = async () => {
    if (savingOtherFee) return;
    if (editFeeIndex === null || editFeeIndex < 0 || editFeeIndex >= otherFees.length) {
      return;
    }
    const name = editFeeDraft.name.trim();
    if (!name) {
      setOtherFeeError('Provide a fee name.');
      return;
    }
    if (editFeeDraft.amount === '') {
      setOtherFeeError('Provide a fee amount.');
      return;
    }
    const amountNumber = Number(editFeeDraft.amount);
    if (!Number.isFinite(amountNumber) || amountNumber < 0) {
      setOtherFeeError('Amount must be a non-negative number.');
      return;
    }
    const nextFees = otherFees.map((fee, idx) =>
      idx === editFeeIndex ? { name, amount: String(editFeeDraft.amount) } : fee,
    );
    await persistOtherFees(nextFees, 'Other fee updated.');
  };

  const removeOtherFee = async (index) => {
    if (savingOtherFee) return;
    const nextFees = otherFees.filter((_, idx) => idx !== index);
    await persistOtherFees(nextFees, 'Other fee removed.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const payload = buildFarePayload(form, otherFees);
      if (isExisting) {
        await updateFare(payload);
        setMessage('Fare updated successfully.');
      } else {
        await addFare(payload);
        setMessage('Fare created successfully.');
        setIsExisting(true);
      }
      await fetchFare();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFlatRateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFlatRateForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFlatRateSubmit = async (e) => {
    e.preventDefault();
    setFlatRateError('');
    setFlatRateMessage('');
    setSavingFlatRate(true);
    try {
      const payload = buildFlatRatePayload(flatRateForm);
      await createFlatRate(payload);
      setFlatRateMessage('Flat rate saved.');
      setFlatRateForm(defaultFlatRateForm);
      await refreshFlatRates();
    } catch (err) {
      setFlatRateError(err.response?.data?.message || 'Unable to save flat rate.');
    } finally {
      setSavingFlatRate(false);
    }
  };

  const handleFlatRateToggle = async (rate) => {
    setFlatRateError('');
    setFlatRateMessage('');
    setSavingFlatRate(true);
    try {
      await updateFlatRate(rate._id, { active: !rate.active });
      setFlatRateMessage(`Flat rate "${rate.name}" ${rate.active ? 'disabled' : 'enabled'}.`);
      await refreshFlatRates();
    } catch (err) {
      setFlatRateError(err.response?.data?.message || 'Unable to update flat rate.');
    } finally {
      setSavingFlatRate(false);
    }
  };

  const handleFlatRateDelete = async (rate) => {
    if (!window.confirm(`Remove flat rate "${rate.name}"?`)) return;
    setFlatRateError('');
    setFlatRateMessage('');
    setSavingFlatRate(true);
    try {
      await deleteFlatRate(rate._id);
      setFlatRateMessage('Flat rate removed.');
      await refreshFlatRates();
    } catch (err) {
      setFlatRateError(err.response?.data?.message || 'Unable to delete flat rate.');
    } finally {
      setSavingFlatRate(false);
    }
  };

  const actions = (
    <button type="button" className="btn btn-ghost" onClick={() => fetchFare()} disabled={loading}>
      {loading ? 'Refreshing...' : 'Reload settings'}
    </button>
  );

  const hasFlatRates = useMemo(() => flatRates && flatRates.length > 0, [flatRates]);

  return (
    <AppLayout
      title="Driver app settings"
      subtitle="Control how the mobile app meter behaves, including wait time triggers and flat fares."
      actions={actions}
    >
      <div className="surface" style={{ maxWidth: '960px', marginBottom: '2rem' }}>
        {fareMeta && (
          <div className="fare-summary">
            <p>
              Meter charges <strong>${Number(fareMeta.farePerMile || 0).toFixed(2)}</strong> per mile with
              <strong> ${Number(fareMeta.waitTimePerMinute || 0).toFixed(2)}</strong> each minute below{' '}
              <strong>{Number(fareMeta.waitTriggerSpeedMph ?? 5)} mph</strong>.
            </p>
            {fareMeta.baseFare ? (
              <p>
                Starting fare: ${Number(fareMeta.baseFare).toFixed(2)}; minimum fare{' '}
                {Number(fareMeta.minimumFare || 0).toFixed(2)}.
              </p>
            ) : (
              <p>Minimum fare {Number(fareMeta.minimumFare || 0).toFixed(2)}.</p>
            )}
            {hasFlatRates && (
              <p className="muted">
                Drivers can override the meter by selecting a flat rate. When a flat rate is chosen, the live meter is
                disabled for that trip.
              </p>
            )}
            <p className="muted">
              Last updated {fareMeta.updatedAt ? new Date(fareMeta.updatedAt).toLocaleString() : 'when created'}.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div>
              <h3>Base rates</h3>
              <p>Per-mile, base, and minimum charges applied when the meter is running.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="baseFare">Base fare</label>
                <input
                  id="baseFare"
                  type="number"
                  step="0.01"
                  name="baseFare"
                  value={form.baseFare}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="farePerMile">Fare per mile</label>
                <input
                  id="farePerMile"
                  type="number"
                  step="0.01"
                  name="farePerMile"
                  value={form.farePerMile}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="minimumFare">Minimum fare</label>
                <input
                  id="minimumFare"
                  type="number"
                  step="0.01"
                  name="minimumFare"
                  value={form.minimumFare}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="extraPass">Extra passenger</label>
                <input
                  id="extraPass"
                  type="number"
                  step="0.01"
                  name="extraPass"
                  value={form.extraPass}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div>
              <h3>Wait time & rounding</h3>
              <p>Define when waiting time charges begin and how the meter rounds totals.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="waitTimePerMinute">Wait time per minute</label>
                <input
                  id="waitTimePerMinute"
                  type="number"
                  step="0.01"
                  name="waitTimePerMinute"
                  value={form.waitTimePerMinute}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="waitTriggerSpeedMph">Trigger speed (mph)</label>
                <input
                  id="waitTriggerSpeedMph"
                  type="number"
                  step="0.1"
                  name="waitTriggerSpeedMph"
                  value={form.waitTriggerSpeedMph}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="idleGracePeriodSeconds">Grace period (seconds)</label>
                <input
                  id="idleGracePeriodSeconds"
                  type="number"
                  step="1"
                  name="idleGracePeriodSeconds"
                  value={form.idleGracePeriodSeconds}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="meterRoundingMode">Rounding</label>
                <select
                  id="meterRoundingMode"
                  name="meterRoundingMode"
                  value={form.meterRoundingMode}
                  onChange={handleChange}
                >
                  {roundingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
          </div>
        </div>

          <div className="form-section">
            <div>
              <h3>Other fees</h3>
              <p>Preset surcharges drivers can add when closing a trip.</p>
            </div>
            <div className="other-fees-list">
              {otherFees.length === 0 ? (
                <p className="muted">No additional fees configured.</p>
              ) : (
                otherFees.map((fee, index) => {
                  const isEditing = editFeeIndex === index;
                  const amountDisplay = Number(fee.amount || 0).toFixed(2);
                  return (
                    <div key={`${fee.name}-${index}`} className="other-fee-row">
                      {isEditing ? (
                        <>
                          <input
                            id={`fee-name-${index}`}
                            type="text"
                            name="name"
                            value={editFeeDraft.name}
                            onChange={handleEditFeeDraftChange}
                            placeholder="Fee name"
                            disabled={savingOtherFee}
                          />
                          <input
                            id={`fee-amount-${index}`}
                            type="number"
                            name="amount"
                            min="0"
                            step="0.01"
                            value={editFeeDraft.amount}
                            onChange={handleEditFeeDraftChange}
                            placeholder="Amount"
                            disabled={savingOtherFee}
                          />
                          <div className="other-fee-row-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={saveEditedOtherFee}
                              disabled={savingOtherFee}
                            >
                              {savingOtherFee ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={cancelEditOtherFee}
                              disabled={savingOtherFee}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="other-fee-label">
                            <span className="primary">{fee.name}</span>
                            <span className="secondary">Drivers can add this at checkout.</span>
                          </div>
                          <div className="other-fee-amount">${amountDisplay}</div>
                          <div className="other-fee-row-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => beginEditOtherFee(index)}
                              disabled={savingOtherFee || editFeeIndex !== null}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost danger"
                              onClick={() => removeOtherFee(index)}
                              disabled={savingOtherFee || editFeeIndex !== null}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="other-fee-add">
              <div>
                <label htmlFor="newFeeName">Add fee name</label>
                <input
                  id="newFeeName"
                  name="name"
                  type="text"
                  value={newFee.name}
                  onChange={handleNewFeeChange}
                  placeholder="e.g., Toll reimbursement"
                />
              </div>
              <div>
                <label htmlFor="newFeeAmount">Amount</label>
                <input
                  id="newFeeAmount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newFee.amount}
                  onChange={handleNewFeeChange}
                />
              </div>
              <div className="other-fee-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={addOtherFee}
                  disabled={savingOtherFee}
                >
                  {savingOtherFee ? 'Saving...' : 'Add fee'}
                </button>
              </div>
            </div>
            {otherFeeError && <div className="feedback error">{otherFeeError}</div>}
            {otherFeeMessage && <div className="feedback success">{otherFeeMessage}</div>}
          </div>

          <div className="form-section">
            <div>
              <h3>Surge multiplier</h3>
              <p>Enable a temporary surge. Drivers will see the multiplier when the meter runs.</p>
            </div>
            <div className="form-grid">
              <div className="checkbox-field">
                <input
                  id="surgeEnabled"
                  type="checkbox"
                  name="surgeEnabled"
                  checked={form.surgeEnabled}
                  onChange={handleChange}
                />
                <label htmlFor="surgeEnabled">Enable surge pricing</label>
              </div>
              <div>
                <label htmlFor="surgeMultiplier">Multiplier</label>
                <input
                  id="surgeMultiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  name="surgeMultiplier"
                  value={form.surgeMultiplier}
                  onChange={handleChange}
                  disabled={!form.surgeEnabled}
                />
              </div>
              <div className="full-width">
                <label htmlFor="surgeNotes">Driver note</label>
                <textarea
                  id="surgeNotes"
                  name="surgeNotes"
                  rows={2}
                  value={form.surgeNotes}
                  onChange={handleChange}
                  placeholder="Explain when surge is active so drivers can communicate it to riders."
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <div>
              {error && <div className="feedback error">{error}</div>}
              {message && <div className="feedback success">{message}</div>}
            </div>
            <button type="submit" className="btn btn-primary">
              {isExisting ? 'Update fares' : 'Create fares'}
            </button>
          </div>
        </form>
      </div>

      <div className="surface" style={{ maxWidth: '960px' }}>
        <div className="form-section">
          <div>
            <h3>Flat rates</h3>
            <p>
              Drivers can opt into a flat rate before ending a trip. Selecting a flat rate disables the live meter for
              that ride.
            </p>
          </div>
        </div>

        <form onSubmit={handleFlatRateSubmit} className="flat-rate-form">
          <div className="form-grid">
            <div>
              <label htmlFor="frName">Name</label>
              <input
                id="frName"
                name="name"
                value={flatRateForm.name}
                onChange={handleFlatRateChange}
                required
              />
            </div>
            <div>
              <label htmlFor="frDistanceLabel">Distance / note</label>
              <input
                id="frDistanceLabel"
                name="distanceLabel"
                value={flatRateForm.distanceLabel}
                onChange={handleFlatRateChange}
                placeholder="e.g., Airport to Downtown (25 miles)"
              />
            </div>
            <div>
              <label htmlFor="frAmount">Amount</label>
              <input
                id="frAmount"
                name="amount"
                type="number"
                step="0.01"
                value={flatRateForm.amount}
                onChange={handleFlatRateChange}
                required
              />
            </div>
            <div className="checkbox-field">
              <input
                id="frActive"
                type="checkbox"
                name="active"
                checked={flatRateForm.active}
                onChange={handleFlatRateChange}
              />
              <label htmlFor="frActive">Active</label>
            </div>
          </div>
          <div className="form-footer">
            <div>
              {flatRateError && <div className="feedback error">{flatRateError}</div>}
              {flatRateMessage && <div className="feedback success">{flatRateMessage}</div>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingFlatRate}>
              {savingFlatRate ? 'Saving...' : 'Add flat rate'}
            </button>
          </div>
        </form>

        <div className="flat-rate-table">
          {flatRates.length === 0 ? (
            <p className="muted">No flat rates configured yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Distance / Notes</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flatRates.map((rate) => (
                  <tr key={rate._id}>
                    <td>{rate.name}</td>
                    <td>{rate.distanceLabel || '—'}</td>
                    <td>${Number(rate.amount || 0).toFixed(2)}</td>
                    <td>{rate.active ? 'Active' : 'Inactive'}</td>
                    <td>{rate.updatedAt ? new Date(rate.updatedAt).toLocaleString() : '—'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleFlatRateToggle(rate)}
                        disabled={savingFlatRate}
                      >
                        {rate.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost danger"
                        onClick={() => handleFlatRateDelete(rate)}
                        disabled={savingFlatRate}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

function valueOrEmpty(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return value === 0 ? '0' : String(value);
}

function buildFarePayload(form, otherFees = []) {
  const payload = {
    farePerMile: toNumber(form.farePerMile, 'farePerMile'),
    waitTimePerMinute: toNumber(form.waitTimePerMinute, 'waitTimePerMinute'),
    waitTriggerSpeedMph: toNumber(form.waitTriggerSpeedMph, 'waitTriggerSpeedMph'),
    idleGracePeriodSeconds: toNumber(form.idleGracePeriodSeconds, 'idleGracePeriodSeconds'),
    meterRoundingMode: form.meterRoundingMode,
    surgeEnabled: Boolean(form.surgeEnabled),
  };

  if (form.extraPass) payload.extraPass = toNumber(form.extraPass, 'extraPass', true);
  if (form.baseFare) payload.baseFare = toNumber(form.baseFare, 'baseFare', true);
  if (form.minimumFare) payload.minimumFare = toNumber(form.minimumFare, 'minimumFare', true);
  if (form.surgeEnabled && form.surgeMultiplier) {
    payload.surgeMultiplier = toNumber(form.surgeMultiplier, 'surgeMultiplier', true);
  }
  if (form.surgeNotes) payload.surgeNotes = form.surgeNotes;

  if (Array.isArray(otherFees)) {
    payload.otherFees = otherFees.map((fee, index) => {
      const name = (fee?.name || '').trim();
      if (!name) {
        throw new Error(`Provide a name for other fee #${index + 1}.`);
      }
      if (fee?.amount === '' || fee?.amount === undefined || fee?.amount === null) {
        throw new Error(`Provide an amount for other fee "${name}".`);
      }
      const amount = toNumber(fee.amount, `other fee "${name}"`, true);
      if (amount < 0) {
        throw new Error(`other fee "${name}" must be a non-negative number.`);
      }
      return { name, amount };
    });
  }

  return payload;
}

function buildFlatRatePayload(form) {
  return {
    name: form.name,
    distanceLabel: form.distanceLabel || undefined,
    amount: toNumber(form.amount, 'amount'),
    active: Boolean(form.active),
  };
}

function toNumber(value, label, allowZero = false) {
  const num = Number(value);
  if (!Number.isFinite(num) || (!allowZero && num === 0 && value !== '0')) {
    throw new Error(`${label} must be a valid number.`);
  }
  return num;
}

export default Fares;
