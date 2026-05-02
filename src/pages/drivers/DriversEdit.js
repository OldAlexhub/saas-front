import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import { getApkDownloadUrl } from "../../services/appService";
import { getDriver, updateDriver } from "../../services/driverService";

const emptyForm = {
  driverId: "",
  firstName: "",
  lastName: "",
  dlNumber: "",
  email: "",
  dob: "",
  dlExpiry: "",
  dotExpiry: "",
  fullAddress: "",
  ssn: "",
  phoneNumber: "",
  cbiExpiry: "",
  mvrExpiry: "",
  fingerPrintsExpiry: "",
  status: "pending",
};

const formatDateInput = (value) => (value ? value.substring(0, 10) : "");

const DriversEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [justApproved, setJustApproved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDriver = async () => {
      setFetching(true);
      setError("");
      try {
        const res = await getDriver(id);
        const data = res.data?.driver || res.data?.data || res.data;
        if (data && typeof data === "object") {
          setForm({
            ...emptyForm,
            ...data,
            driverId: data.driverId || "",
            dob: data.dob || "",
            dlExpiry: data.dlExpiry || "",
            dotExpiry: data.dotExpiry || "",
            cbiExpiry: data.cbiExpiry || "",
            mvrExpiry: data.mvrExpiry || "",
            fingerPrintsExpiry: data.fingerPrintsExpiry || "",
            status: data.status || "pending",
          });
        }
      } catch (err) {
        const msg = err.response?.data?.message || "Unable to load driver";
        setError(msg);
      } finally {
        setFetching(false);
      }
    };

    fetchDriver();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateDriver(id, form);
      navigate("/drivers");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update driver";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    setStatusBusy(true);
    setStatusError("");
    setJustApproved(false);
    try {
      const res = await updateDriver(id, { status: nextStatus });
      const updated = res.data?.driver || res.data?.data || res.data;
      const saved = updated?.status || nextStatus;
      setForm((prev) => ({ ...prev, status: saved }));
      if (saved === "approved") setJustApproved(true);
    } catch (err) {
      setStatusError(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getApkDownloadUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const actions = (
    <Link to="/drivers" className="btn btn-ghost">
      Back to list
    </Link>
  );

  return (
    <AppLayout
      title="Update driver profile"
      subtitle="Keep personal, compliance and contact details accurate."
      actions={actions}
    >
      <div className="surface">
        {fetching ? (
          <div className="skeleton" style={{ height: "420px" }} />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div>
                <h3>Profile</h3>
                <p>Review core identity information before saving.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="driverId">Driver ID</label>
                  <input id="driverId" type="text" name="driverId" value={form.driverId} disabled />
                </div>
                <div>
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dob">Date of birth</label>
                  <input
                    id="dob"
                    type="date"
                    name="dob"
                    value={formatDateInput(form.dob)}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phoneNumber">Phone</label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fullAddress">Residential address</label>
                  <input
                    id="fullAddress"
                    type="text"
                    name="fullAddress"
                    value={form.fullAddress}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ssn">SSN</label>
                  <input
                    id="ssn"
                    type="text"
                    name="ssn"
                    value={form.ssn}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>License & compliance</h3>
                <p>Keep regulatory documents renewed and on file.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="dlNumber">License number</label>
                  <input
                    id="dlNumber"
                    type="text"
                    name="dlNumber"
                    value={form.dlNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dlExpiry">License expiry</label>
                  <input
                    id="dlExpiry"
                    type="date"
                    name="dlExpiry"
                    value={formatDateInput(form.dlExpiry)}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dotExpiry">DOT medical expiry</label>
                  <input
                    id="dotExpiry"
                    type="date"
                    name="dotExpiry"
                    value={formatDateInput(form.dotExpiry)}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cbiExpiry">CBI clearance expiry</label>
                  <input
                    id="cbiExpiry"
                    type="date"
                    name="cbiExpiry"
                    value={formatDateInput(form.cbiExpiry)}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="mvrExpiry">MVR expiry</label>
                  <input
                    id="mvrExpiry"
                    type="date"
                    name="mvrExpiry"
                    value={formatDateInput(form.mvrExpiry)}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fingerPrintsExpiry">Fingerprint card expiry</label>
                  <input
                    id="fingerPrintsExpiry"
                    type="date"
                    name="fingerPrintsExpiry"
                    value={formatDateInput(form.fingerPrintsExpiry)}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Operational status</h3>
                <p>Control whether this driver is cleared to operate. Approving generates a shareable app download link.</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <span>
                    Current status:{" "}
                    <span
                      className={
                        form.status === "approved"
                          ? "badge badge-success"
                          : form.status === "inactive"
                          ? "badge badge-warning"
                          : "badge badge-info"
                      }
                    >
                      {form.status === "approved" ? "Approved" : form.status === "inactive" ? "Inactive" : "Pending"}
                    </span>
                  </span>
                </div>
                <div className="pill-group">
                  <button
                    type="button"
                    className="pill-button"
                    disabled={statusBusy || form.status === "approved"}
                    onClick={() => handleStatusChange("approved")}
                  >
                    Approve to operate
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    disabled={statusBusy || form.status === "inactive"}
                    onClick={() => handleStatusChange("inactive")}
                  >
                    Deactivate
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    disabled={statusBusy || form.status === "pending"}
                    onClick={() => handleStatusChange("pending")}
                  >
                    Reset to pending
                  </button>
                </div>
                {statusError && <div className="feedback error" style={{ marginTop: 8 }}>{statusError}</div>}

                {(justApproved || form.status === "approved") && (
                  <div className="feedback info" style={{ marginTop: 16 }}>
                    {justApproved && <p style={{ marginBottom: 8 }}><strong>Driver approved.</strong> Share the link below so they can download the app.</p>}
                    {!justApproved && <p style={{ marginBottom: 8 }}>This driver is approved to operate. Share the link below to let them install the app.</p>}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        readOnly
                        value={getApkDownloadUrl()}
                        style={{ flex: 1, minWidth: 0 }}
                        onFocus={(e) => e.target.select()}
                      />
                      <button type="button" className="btn btn-primary" onClick={handleCopyLink}>
                        {copied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-footer">
              <div>{error && <div className="feedback error">{error}</div>}</div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Updating driver." : "Update driver"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default DriversEdit;
