import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import PlaceList from '../../places/components/PlaceList';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import Modal from '../../shared/components/UIElements/Modal';
import { AuthContext } from '../../shared/context/auth-context';
import { NotificationContext } from '../../shared/context/notification-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { getAssetUrl } from '../../shared/util/api';
import './UserProfile.css';

const UserProfile = () => {
  const userId = useParams().userId;
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [stats, setStats] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privacy, setPrivacy] = useState({ isOwner: false, canViewTrailLog: true });
  const [collections, setCollections] = useState({ wantToVisit: [], completed: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', location: '' });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [logForm, setLogForm] = useState({ completedAt: '', durationMinutes: '', distanceKm: '', elevationGain: '', note: '' });
  const heroRef = useRef(null);
  const editFormRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (auth.userId === userId && auth.token) {
          await sendRequest(
            '/api/users/completion-logs/backfill-created',
            'POST',
            null,
            { Authorization: 'Bearer ' + auth.token }
          );
        }
        const data = await sendRequest(
          `/api/users/${userId}/profile`,
          'GET',
          null,
          auth.token ? { Authorization: 'Bearer ' + auth.token } : {}
        );
        setProfile(data.profile);
        setIsPrivate(Boolean(data.isPrivate));
        setPrivacy(data.privacy || { isOwner: auth.userId === userId, canViewTrailLog: true });
        setPlaces(data.places || []);
        setStats(data.stats);
        setCollections(data.collections || { wantToVisit: [], completed: [] });
        setForm({
          name: data.profile.name || '',
          bio: data.profile.bio || '',
          location: data.profile.location || ''
        });
      } catch (err) {}
    };
    loadProfile();
  }, [sendRequest, userId, auth.userId, auth.token]);

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  useEffect(() => {
    if (!isEditing || !editFormRef.current) return;
    editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (nameInputRef.current) nameInputRef.current.focus({ preventScroll: true });
  }, [isEditing]);

  const toggleEditHandler = () => {
    if (isEditing) {
      setIsEditing(false);
      if (heroRef.current) heroRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setIsEditing(true);
  };

  const changeHandler = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  };

  const submitHandler = async event => {
    event.preventDefault();
    const data = new FormData();
    data.append('name', form.name);
    data.append('bio', form.bio);
    data.append('location', form.location);
    if (avatar) data.append('image', avatar);

    try {
      const response = await sendRequest(
        '/api/users/profile',
        'PATCH',
        data,
        { Authorization: 'Bearer ' + auth.token }
      );
      setProfile(response.profile);
      setAvatar(null);
      setIsEditing(false);
      notifications.showNotification('Profile updated.');
    } catch (err) {}
  };

  const deleteAccountHandler = async () => {
    try {
      await sendRequest(
        '/api/users/profile',
        'DELETE',
        null,
        { Authorization: 'Bearer ' + auth.token }
      );
      setShowDeleteConfirm(false);
      auth.logout();
    } catch (err) {}
  };

  const formatDuration = minutes => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours ? `${hours} h` : ''}${hours && rest ? ' ' : ''}${rest ? `${rest} min` : ''}`;
  };

  const startLogEdit = log => {
    setEditingLogId(log.id);
    setLogForm({ completedAt: new Date(log.completedAt).toISOString().slice(0, 10), durationMinutes: log.durationMinutes || '', distanceKm: log.distanceKm || '', elevationGain: log.elevationGain != null ? log.elevationGain : '', note: log.note || '' });
  };

  const logChangeHandler = event => {
    const { name, value } = event.target;
    setLogForm(current => ({ ...current, [name]: value }));
  };

  const saveLogHandler = async event => {
    event.preventDefault();
    try {
      await sendRequest(`/api/users/completion-logs/${editingLogId}`, 'PATCH', JSON.stringify(logForm), { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth.token });
      setCollections(current => ({ ...current, completionLogs: current.completionLogs.map(log => log.id === editingLogId ? { ...log, ...logForm, durationMinutes: logForm.durationMinutes ? Number(logForm.durationMinutes) : undefined, distanceKm: logForm.distanceKm ? Number(logForm.distanceKm) : undefined, elevationGain: logForm.elevationGain !== '' ? Number(logForm.elevationGain) : undefined } : log) }));
      setEditingLogId(null);
      notifications.showNotification('Trail log entry updated.');
    } catch (err) {}
  };

  const deleteLogHandler = async logId => {
    try {
      await sendRequest(`/api/users/completion-logs/${logId}`, 'DELETE', null, { Authorization: 'Bearer ' + auth.token });
      setCollections(current => ({ ...current, completionLogs: current.completionLogs.filter(log => log.id !== logId) }));
      notifications.showNotification('Trail log entry deleted.');
    } catch (err) {}
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      <Modal
        show={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        header="Delete account?"
        className="user-profile__delete-modal"
        footer={
          <React.Fragment>
            <button
              type="button"
              className="user-profile__modal-cancel"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isLoading}
            >
              Keep account
            </button>
            <button
              type="button"
              className="user-profile__modal-delete"
              onClick={deleteAccountHandler}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete permanently'}
            </button>
          </React.Fragment>
        }
      >
        <p>
          This permanently removes your profile, places, photos, comments and
          ratings. This action cannot be undone.
        </p>
      </Modal>
      {isLoading && !profile && <LoadingSpinner />}
      {profile && isPrivate && <section className="user-profile user-profile__private"><img src={getAssetUrl(profile.image)} alt={profile.name} /><span>Private profile</span><h1>{profile.name}</h1>{profile.location && <p>{profile.location}</p>}<strong>This explorer has chosen to keep their profile private.</strong></section>}
      {profile && stats && !isPrivate && (
        <section className="user-profile">
          <div className="user-profile__hero" ref={heroRef}>
            <img
              src={avatarPreview || getAssetUrl(profile.image)}
              alt={profile.name}
            />
            <div className="user-profile__identity">
              <span>Explorer profile</span>
              <h1>{profile.name}</h1>
              {profile.location && <p className="user-profile__location">{profile.location}</p>}
              <p className="user-profile__bio">
                {profile.bio || 'This explorer has not added a bio yet.'}
              </p>
            </div>
            {auth.userId === userId && (
              <button type="button" onClick={toggleEditHandler}>
                {isEditing ? 'Cancel' : 'Edit profile'}
              </button>
            )}
          </div>

          <div className="user-profile__stats user-profile__stats--five">
            <div><strong>{stats.placeCount}</strong><span>Places</span></div>
            <div><strong>{stats.averageRating ? stats.averageRating.toFixed(1) : '—'}</strong><span>Average rating</span></div>
            <div><strong>{stats.ratingCount}</strong><span>Ratings received</span></div>
            <div><strong>{stats.wantToVisitCount || 0}</strong><span>Want to visit</span></div>
            <div><strong>{privacy.canViewTrailLog ? (stats.completedCount || 0) : '—'}</strong><span>Completed</span></div>
          </div>
          {privacy.canViewTrailLog ? <React.Fragment><div className="user-profile__adventure-stats">
            <div><strong>{stats.hasDistanceData ? `${Number(stats.totalDistanceKm).toFixed(1)} km` : 'No data'}</strong><span>Total distance</span></div>
            <div><strong>{stats.hasElevationData ? `${Math.round(stats.totalElevationGain)} m` : 'No data'}</strong><span>Total elevation</span></div>
            <div><strong>{formatDuration(stats.totalDurationMinutes) || '—'}</strong><span>Recorded time</span></div>
          </div>
          <p className="user-profile__stats-note">Activity totals come from your trail log. Places you publish are automatically recorded as completed hikes; other trails count after you log their completion.</p>
          {stats.monthlyStats && stats.monthlyStats.length > 0 && <section className="user-profile__monthly">
            <div><span>Activity history</span><h2>Last 12 active months</h2></div>
            <div className="user-profile__chart">{stats.monthlyStats.map(month => {
              const maxDistance = Math.max(...stats.monthlyStats.map(item => item.distanceKm || 0), 1);
              return <div key={month.month} title={`${month.distanceKm.toFixed(1)} km · ${month.completions} hikes`}><span style={{ height: `${Math.max(8, month.distanceKm / maxDistance * 100)}%` }}><strong>{month.completions}</strong></span><small>{new Date(`${month.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}</small></div>;
            })}</div>
          </section>}</React.Fragment> : <div className="user-profile__private-log">This explorer keeps their trail log private.</div>}

          {isEditing && auth.userId === userId && (
            <form className="user-profile__form" ref={editFormRef} onSubmit={submitHandler}>
              <label>Name<input ref={nameInputRef} name="name" value={form.name} onChange={changeHandler} maxLength="80" required /></label>
              <label>Location<input name="location" value={form.location} onChange={changeHandler} maxLength="100" placeholder="e.g. Kielce, Poland" /></label>
              <label>Bio<textarea name="bio" value={form.bio} onChange={changeHandler} maxLength="500" placeholder="Tell the community about yourself..." /></label>
              <label className="user-profile__file">New avatar (optional)<input type="file" accept=".jpg,.jpeg,.png" onChange={event => setAvatar(event.target.files[0] || null)} /></label>
              <button type="submit" disabled={isLoading}>Save profile</button>
            </form>
          )}

          {auth.userId === userId && (
            <section className="user-profile__danger-zone">
              <div>
                <span>Danger zone</span>
                <strong>Delete your account</strong>
                <p>Your profile and all places you shared will be removed permanently.</p>
              </div>
              <button type="button" onClick={() => setShowDeleteConfirm(true)}>
                Delete account
              </button>
            </section>
          )}

          <div className="user-profile__places-heading">
            <div><span>Shared adventures</span><h2>Places by {profile.name}</h2></div>
            <Link to={`/${userId}/places`}>Open places page &rarr;</Link>
          </div>
          {places.length > 0 ? (
            <PlaceList items={places} onDeletePlace={deletedId => setPlaces(current => current.filter(place => place.id !== deletedId))} />
          ) : (
            <div className="user-profile__empty">No places shared yet.</div>
          )}
          <div className="user-profile__collection-grid">
            <section><div className="user-profile__places-heading"><div><span>Trail plans</span><h2>Want to visit</h2></div></div>{collections.plannedVisits && collections.plannedVisits.length ? <div className="user-profile__trail-log">{collections.plannedVisits.map(planItem => <article key={planItem.id}><div><span>{planItem.plannedAt ? new Date(planItem.plannedAt).toLocaleDateString() : 'No date selected'}</span><h3>{planItem.place.title}</h3>{planItem.note && <p>{planItem.note}</p>}</div><Link to={`/places/${planItem.place.id || planItem.place._id}/details`}>View trail →</Link></article>)}</div> : collections.wantToVisit.length ? <PlaceList items={collections.wantToVisit} /> : <div className="user-profile__empty">No planned trails yet.</div>}</section>
            {privacy.canViewTrailLog && <section><div className="user-profile__places-heading"><div><span>Trail log</span><h2>Completed</h2></div></div>{collections.completionLogs && collections.completionLogs.length ? <div className="user-profile__trail-log">{collections.completionLogs.map(log => <article key={log.id}>{editingLogId === log.id ? <form onSubmit={saveLogHandler} className="user-profile__log-form"><input name="completedAt" type="date" required max={new Date().toISOString().slice(0, 10)} value={logForm.completedAt} onChange={logChangeHandler} /><input name="durationMinutes" type="number" min="1" max="1440" placeholder="Minutes" value={logForm.durationMinutes} onChange={logChangeHandler} /><input name="distanceKm" type="number" min="0.1" max="1000" step="0.1" placeholder="Distance (km)" value={logForm.distanceKm} onChange={logChangeHandler} /><input name="elevationGain" type="number" min="0" max="10000" step="1" placeholder="Elevation (m)" value={logForm.elevationGain} onChange={logChangeHandler} /><textarea name="note" maxLength="500" value={logForm.note} onChange={logChangeHandler} /><button>Save</button><button type="button" onClick={() => setEditingLogId(null)}>Cancel</button></form> : <React.Fragment><div><span>{new Date(log.completedAt).toLocaleDateString()}</span><h3>{log.place.title}</h3>{log.durationMinutes && <strong>{formatDuration(log.durationMinutes)}</strong>}{(log.distanceKm || log.place.distanceKm) && <p>{log.distanceKm || log.place.distanceKm} km{(log.elevationGain != null || log.place.elevationGain != null) ? ` · +${log.elevationGain != null ? log.elevationGain : log.place.elevationGain} m` : ''}</p>}{log.note && <p>{log.note}</p>}</div><div className="user-profile__log-actions"><Link to={`/places/${log.place.id || log.place._id}/details`}>View trail →</Link>{auth.userId === userId && <React.Fragment><button onClick={() => startLogEdit(log)}>Edit</button><button onClick={() => deleteLogHandler(log.id)}>Delete</button></React.Fragment>}</div></React.Fragment>}</article>)}</div> : collections.completed.length ? <PlaceList items={collections.completed} /> : <div className="user-profile__empty">No completed trails yet.</div>}</section>}
          </div>
        </section>
      )}
    </React.Fragment>
  );
};

export default UserProfile;
