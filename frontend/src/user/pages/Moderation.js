import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthContext } from '../../shared/context/auth-context';
import { NotificationContext } from '../../shared/context/notification-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { API_URL } from '../../shared/util/api';
import './Moderation.css';

const filters = ['open', 'resolved', 'dismissed'];

const Moderation = () => {
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);

  const loadReports = useCallback(async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/reports?status=${status}`, 'GET', null, {
        Authorization: `Bearer ${auth.token}`
      });
      setReports(data.reports || []);
    } catch (err) {}
  }, [auth.token, sendRequest, status]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const review = async (reportId, nextStatus) => {
    try {
      await sendRequest(`${API_URL}/api/reports/${reportId}`, 'PATCH', JSON.stringify({ status: nextStatus }), {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      });
      setReports(current => current.filter(report => report.id !== reportId));
      notifications.showNotification(`Report marked as ${nextStatus}.`);
    } catch (err) {}
  };

  const removeContent = async report => {
    const description = report.targetType === 'place'
      ? 'Remove this entire place, its photos and all related trail-log references permanently?'
      : `Remove this ${report.targetType} permanently?`;
    if (!window.confirm(description)) return;
    try {
      await sendRequest(`${API_URL}/api/reports/${report.id}/content`, 'DELETE', null, {
        Authorization: `Bearer ${auth.token}`
      });
      setReports(current => report.targetType === 'place'
        ? current.filter(item => String(item.place && (item.place.id || item.place._id)) !== String(report.place && (report.place.id || report.place._id)))
        : current.filter(item => !(item.targetType === report.targetType && item.targetId === report.targetId))
      );
      notifications.showNotification(report.targetType === 'place' ? 'Reported place removed.' : 'Reported content removed.');
    } catch (err) {}
  };

  return (
    <section className="moderation-page">
      <header>
        <span>Community safety</span>
        <h1>Moderation queue</h1>
        <p>Review content reported by the MyHikes community.</p>
      </header>

      <nav className="moderation-page__filters" aria-label="Report status">
        {filters.map(filter => (
          <button key={filter} type="button" className={status === filter ? 'active' : ''} onClick={() => setStatus(filter)}>
            {filter}
          </button>
        ))}
      </nav>

      {error && <button type="button" className="moderation-page__error" onClick={clearError}>{error}</button>}
      {isLoading && <p className="moderation-page__empty">Loading reports…</p>}
      {!isLoading && reports.length === 0 && <p className="moderation-page__empty">No {status} reports.</p>}

      <div className="moderation-page__list">
        {reports.map(report => (
          <article key={report.id} className="moderation-card">
            <div className="moderation-card__topline">
              <span>{report.targetType}</span>
              <time>{new Date(report.createdAt).toLocaleString()}</time>
            </div>
            <h2>{report.targetLabel || 'Reported content'}</h2>
            <p className="moderation-card__reason">Reason: <strong>{report.reason}</strong></p>
            {report.details && <p>{report.details}</p>}
            <div className="moderation-card__meta">
              <span>Reported by {report.reporter ? report.reporter.name : 'Deleted user'}</span>
              {report.place && <Link to={`/places/${report.place.id}/details`}>Open place →</Link>}
            </div>
            {status === 'open' && (
              <div className="moderation-card__actions">
                <button type="button" className="danger" onClick={() => removeContent(report)}>
                  {report.targetType === 'place' ? 'Remove place' : 'Remove content'}
                </button>
                <button type="button" onClick={() => review(report.id, 'resolved')}>Resolve</button>
                <button type="button" className="secondary" onClick={() => review(report.id, 'dismissed')}>Dismiss</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default Moderation;
