import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../shared/context/auth-context';
import { API_URL } from '../../shared/util/api';
import { NotificationContext } from '../../shared/context/notification-context';
import TrailEquipment from './TrailEquipment';
import TrailConditions from './TrailConditions';

const TrailCommunityPanel = ({ place, onPlaceChange }) => {
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);
  const placeId = place.id || place._id;
  const [status, setStatus] = useState({ wantToVisit: false, completed: false });
  const [busy, setBusy] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [completion, setCompletion] = useState({ completedAt: new Date().toISOString().slice(0, 10), durationMinutes: '', distanceKm: '', elevationGain: '', note: '' });
  const [plan, setPlan] = useState({ plannedAt: '', note: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!auth.token) return;
    fetch(`${API_URL}/api/users/collections/${placeId}`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(response => response.ok ? response.json() : null).then(data => data && setStatus(data)).catch(() => {});
  }, [auth.token, placeId]);

  const request = async (url, options) => {
    setFormError('');
    setBusy(true);
    try { return await fetch(url, options); } finally { setBusy(false); }
  };

  const toggleCollection = async (key, route) => {
    const active = status[key];
    const response = await request(`${API_URL}/api/users/collections/${route}/${placeId}`, {
      method: active ? 'DELETE' : 'PUT', headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (response.ok) { setStatus(current => ({ ...current, [key]: !active })); notifications.showNotification(active ? 'Removed from your collection.' : 'Added to your collection.'); }
  };

  const completeTrail = async event => {
    event.preventDefault();
    const response = await request(`${API_URL}/api/users/collections/completed/${placeId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(completion)
    });
    if (response.ok) { setStatus(current => ({ ...current, completed: true })); setShowCompletionForm(false); setCompletion({ completedAt: new Date().toISOString().slice(0, 10), durationMinutes: '', distanceKm: '', elevationGain: '', note: '' }); notifications.showNotification('Hike saved to your trail log.'); }
    else { const data = await response.json().catch(() => ({})); setFormError(data.message || 'Could not save trail log entry.'); }
  };

  const savePlan = async event => {
    event.preventDefault();
    const response = await request(`${API_URL}/api/users/collections/want-to-visit/${placeId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }, body: JSON.stringify(plan)
    });
    if (response.ok) { setStatus(current => ({ ...current, wantToVisit: true })); setShowPlanForm(false); notifications.showNotification('Trip plan saved.'); }
    else { const data = await response.json().catch(() => ({})); setFormError(data.message || 'Could not save trip plan.'); }
  };

  const completionChangeHandler = event => {
    const { name, value } = event.target;
    setCompletion(current => ({ ...current, [name]: value }));
  };

  const planChangeHandler = event => {
    const { name, value } = event.target;
    setPlan(current => ({ ...current, [name]: value }));
  };

  return <div className="trail-community">
    <TrailEquipment requiredEquipment={place.requiredEquipment} />
    {auth.isLoggedIn && <div className="trail-community__collections">
      <button disabled={busy} className={status.wantToVisit ? 'active' : ''} onClick={() => status.wantToVisit ? toggleCollection('wantToVisit', 'want-to-visit') : setShowPlanForm(value => !value)}>{status.wantToVisit ? 'Remove from plans' : 'Plan this hike'}</button>
      <button disabled={busy} className={status.completed ? 'active' : ''} onClick={() => setShowCompletionForm(value => !value)}>{status.completed ? 'Log another hike' : 'Log completed hike — time & stats'}</button>
    </div>}
    {formError && <p className="trail-community__error" role="alert">{formError}</p>}
    {auth.isLoggedIn && showPlanForm && !status.wantToVisit && <form className="trail-community__completion" onSubmit={savePlan}>
      <label>Planned date<input name="plannedAt" type="date" value={plan.plannedAt} onChange={planChangeHandler} /></label>
      <label>Plan note<textarea name="note" maxLength="300" value={plan.note} onChange={planChangeHandler} placeholder="Optional preparation note" /></label>
      <button disabled={busy}>Save trip plan</button>
    </form>}
    {auth.isLoggedIn && showCompletionForm && <form className="trail-community__completion" onSubmit={completeTrail}>
      <label>Date completed<input name="completedAt" type="date" max={new Date().toISOString().slice(0, 10)} required value={completion.completedAt} onChange={completionChangeHandler} /></label>
      <label>Your time (minutes)<input name="durationMinutes" type="number" min="1" max="1440" value={completion.durationMinutes} onChange={completionChangeHandler} placeholder="Optional" /></label>
      <label>Actual distance (km)<input name="distanceKm" type="number" min="0.1" max="1000" step="0.1" value={completion.distanceKm} onChange={completionChangeHandler} placeholder={place.distanceKm || 'Optional'} /></label>
      <label>Elevation gain (m)<input name="elevationGain" type="number" min="0" max="10000" step="1" value={completion.elevationGain} onChange={completionChangeHandler} placeholder={place.elevationGain != null ? place.elevationGain : 'Optional'} /></label>
      <label>Trail note<textarea name="note" maxLength="500" value={completion.note} onChange={completionChangeHandler} placeholder="What was the hike like?" /></label>
      <button disabled={busy}>Save in trail log</button>
    </form>}
    <TrailConditions place={place} onPlaceChange={onPlaceChange} onError={setFormError} />
  </div>;
};
export default TrailCommunityPanel;
