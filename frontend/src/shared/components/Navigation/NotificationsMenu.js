import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthContext } from '../../context/auth-context';
import { API_URL, getAssetUrl } from '../../util/api';
import './NotificationsMenu.css';

const NotificationsMenu = ({ onNavigate }) => {
  const auth = useContext(AuthContext);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(() => {
    if (!auth.token) return;
    fetch(`${API_URL}/api/notifications`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data) return;
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, [auth.token]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const close = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const markRead = item => {
    if (!item.read) {
      fetch(`${API_URL}/api/notifications/${item.id}/read`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}` }
      }).catch(() => {});
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, read: true } : entry));
      setUnreadCount(current => Math.max(0, current - 1));
    }
    setOpen(false);
    if (onNavigate) onNavigate();
  };

  const markAllRead = () => {
    fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}` }
    }).then(response => {
      if (!response.ok) return;
      setItems(current => current.map(item => ({ ...item, read: true })));
      setUnreadCount(0);
    }).catch(() => {});
  };

  return (
    <li className="notifications" ref={menuRef}>
      <button type="button" className="notifications__trigger" onClick={() => { setOpen(value => !value); if (!open) loadNotifications(); }} aria-label={`${unreadCount} unread notifications`} aria-expanded={open}>
        <span aria-hidden="true">{'\uD83D\uDD14'}</span>
        {unreadCount > 0 && <strong>{unreadCount > 99 ? '99+' : unreadCount}</strong>}
      </button>
      {open && (
        <div className="notifications__panel">
          <header><div><span>Updates</span><h2>Notifications</h2></div>{unreadCount > 0 && <button type="button" onClick={markAllRead}>Mark all read</button>}</header>
          <div className="notifications__list">
            {items.length === 0 && <p className="notifications__empty">No notifications yet.</p>}
            {items.map(item => {
              const content = <React.Fragment>
                <span className="notifications__avatar">{item.actor && item.actor.image ? <img src={getAssetUrl(item.actor.image)} alt="" /> : (item.actor && item.actor.name ? item.actor.name.charAt(0) : 'M')}</span>
                <span className="notifications__copy"><span><b>{item.actor ? item.actor.name : 'MyHikes'}</b> {item.message}</span>{item.place && <small>{item.place.title}</small>}<time>{new Date(item.createdAt).toLocaleString()}</time></span>
              </React.Fragment>;
              const destination = item.type === 'moderation_report'
                ? '/moderation'
                : (item.place ? `/places/${item.place.id}/details` : null);
              return destination
                ? <Link key={item.id} className={item.read ? '' : 'unread'} to={destination} onClick={() => markRead(item)}>{content}</Link>
                : <button key={item.id} type="button" className={item.read ? '' : 'unread'} onClick={() => markRead(item)}>{content}</button>;
            })}
          </div>
        </div>
      )}
    </li>
  );
};

export default NotificationsMenu;
