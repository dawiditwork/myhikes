import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/auth-context';
import { NotificationContext } from '../../context/notification-context';
import { API_URL } from '../../util/api';
import Modal from './Modal';
import './ReportButton.css';

const ReportButton = ({ placeId, targetType, targetId, targetLabel, className = '' }) => {
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('incorrect');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!auth.isLoggedIn) return null;

  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ placeId, targetType, targetId, targetLabel, reason, details }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not submit report.');
      setOpen(false); setDetails(''); setReason('incorrect'); notifications.showNotification('Report submitted for review.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <React.Fragment>
    <button type="button" className={`report-button ${className}`} onClick={() => setOpen(true)}>Report</button>
    <Modal show={open} onCancel={() => setOpen(false)} header="Report content" className="report-modal" footer={null}>
      <form className="report-form" onSubmit={submit}>
        <p>Tell the moderation team what is wrong with this {targetType}.</p>
        <label>Reason<select value={reason} onChange={event => setReason(event.target.value)}><option value="incorrect">Incorrect information</option><option value="unsafe">Unsafe or dangerous</option><option value="spam">Spam</option><option value="abuse">Abusive content</option><option value="other">Other</option></select></label>
        <label>Additional details<textarea value={details} maxLength="500" onChange={event => setDetails(event.target.value)} placeholder="Optional, but helpful" /></label>
        {error && <p className="report-form__error">{error}</p>}
        <div><button type="button" onClick={() => setOpen(false)}>Cancel</button><button disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</button></div>
      </form>
    </Modal>
  </React.Fragment>;
};
export default ReportButton;
