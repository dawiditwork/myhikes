import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ notification, onClose }) => {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;
  return <div className={`toast toast--${notification.type || 'success'}`} role="status">
    <span>{notification.type === 'error' ? '!' : '✓'}</span>
    <p>{notification.message}</p>
    <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>
  </div>;
};
export default Toast;
