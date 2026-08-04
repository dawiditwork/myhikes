import React, { useContext, useState } from 'react';

import { AuthContext } from '../../shared/context/auth-context';
import { NotificationContext } from '../../shared/context/notification-context';
import { API_URL } from '../../shared/util/api';
import ReportButton from '../../shared/components/UIElements/ReportButton';

const CONDITIONS = {
  mud: ['🟤', 'Mud'], snow: ['❄️', 'Snow'], ice: ['🧊', 'Ice'],
  closed_section: ['⛔', 'Closed section'], parking_issue: ['🅿️', 'Parking issue']
};
const DAY = 24 * 60 * 60 * 1000;

const TrailConditions = ({ place, onPlaceChange, onError }) => {
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);
  const [condition, setCondition] = useState('mud');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const placeId = place.id || place._id;

  const request = async (url, options) => {
    onError('');
    setBusy(true);
    try { return await fetch(url, options); } finally { setBusy(false); }
  };

  const report = async event => {
    event.preventDefault();
    const response = await request(`${API_URL}/api/places/${placeId}/conditions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify({ condition, note })
    });
    if (response.ok) {
      const data = await response.json();
      onPlaceChange(data.place);
      setNote('');
      notifications.showNotification('Condition report published.');
    } else {
      const data = await response.json().catch(() => ({}));
      onError(data.message || 'Could not publish the condition report.');
    }
  };

  const updateReport = async (reportId, action, method) => {
    const response = await request(`${API_URL}/api/places/${placeId}/conditions/${reportId}${action}`, {
      method, headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (response.ok) {
      const data = await response.json();
      onPlaceChange(data.place);
      notifications.showNotification(method === 'DELETE' ? 'Condition report deleted.' : 'Report confirmation updated.');
    } else {
      const data = await response.json().catch(() => ({}));
      onError(data.message || 'Could not update the condition report.');
    }
  };

  return (
    <section>
      <span className="place-details__eyebrow">Community updates</span>
      <h2>Current conditions</h2>
      {auth.isLoggedIn && <form className="trail-community__form" onSubmit={report}>
        <select value={condition} onChange={event => setCondition(event.target.value)}>{Object.entries(CONDITIONS).map(([id, value]) => <option key={id} value={id}>{value.join(' ')}</option>)}</select>
        <input value={note} maxLength="300" onChange={event => setNote(event.target.value)} placeholder="Optional note (max. 300 characters)" />
        <button disabled={busy}>Report conditions</button>
      </form>}
      {(place.conditionReports || []).length ? <div className="trail-community__reports">{[...place.conditionReports].reverse().map(item => {
        const authorId = item.author && String(item.author.id || item.author._id || item.author);
        const reportId = item.id || item._id;
        const isFresh = Date.now() - new Date(item.createdAt).getTime() <= 14 * DAY;
        const confirmations = item.confirmedBy || [];
        const confirmedByMe = confirmations.some(id => String(id.id || id._id || id) === auth.userId);
        return <article key={reportId} className={!isFresh ? 'stale' : ''}><strong>{CONDITIONS[item.condition]?.join(' ')}</strong><span>{item.author?.name || 'Community member'} · {new Date(item.createdAt).toLocaleDateString()}</span><em>{isFresh ? 'Current' : 'Older than 14 days'}</em>{item.note && <p>{item.note}</p>}<div className="trail-community__report-actions">{auth.isLoggedIn && authorId !== auth.userId && <button className={confirmedByMe ? 'active' : ''} disabled={busy} onClick={() => updateReport(reportId, '/confirm', 'PUT')}>Confirm ({confirmations.length})</button>}{auth.isLoggedIn && authorId !== auth.userId && <ReportButton placeId={placeId} targetType="condition" targetId={reportId} targetLabel={CONDITIONS[item.condition]?.[1]} />}{authorId === auth.userId && <button disabled={busy} onClick={() => updateReport(reportId, '', 'DELETE')}>Delete</button>}</div></article>;
      })}</div> : <p className="trail-community__empty">No recent condition reports.</p>}
    </section>
  );
};

export default TrailConditions;
