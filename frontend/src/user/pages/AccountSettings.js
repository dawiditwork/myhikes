import React, { useContext, useEffect, useState } from 'react';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { AuthContext } from '../../shared/context/auth-context';
import { NotificationContext } from '../../shared/context/notification-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { API_URL } from '../../shared/util/api';
import './AccountSettings.css';

const AccountSettings = () => {
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [settings, setSettings] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    sendRequest(`${API_URL}/api/users/account/settings`, 'GET', null, { Authorization: 'Bearer ' + auth.token })
      .then(data => setSettings(data.settings)).catch(() => {});
  }, [auth.token, sendRequest]);

  const savePrivacy = async event => {
    event.preventDefault();
    try {
      const data = await sendRequest(`${API_URL}/api/users/account/settings`, 'PATCH', JSON.stringify(settings), { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth.token });
      setSettings(data.settings);
      notifications.showNotification('Privacy settings saved.');
    } catch (err) {}
  };

  const changePassword = async event => {
    event.preventDefault(); setPasswordError('');
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    try {
      await sendRequest(`${API_URL}/api/users/account/password`, 'PATCH', JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }), { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth.token });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notifications.showNotification('Password changed successfully.');
    } catch (err) {}
  };

  const passwordChange = event => {
    const { name, value } = event.target;
    setPasswords(current => ({ ...current, [name]: value }));
  };

  const privacyChange = event => {
    const { name, value } = event.target;
    setSettings(current => ({ ...current, [name]: value }));
  };

  return <React.Fragment>
    <ErrorModal error={error} onClear={clearError} />
    {isLoading && !settings && <LoadingSpinner />}
    {settings && <section className="account-settings">
      <header><span>Account preferences</span><h1>Settings</h1><p>Control who can see your profile and keep your account secure.</p></header>
      <form onSubmit={savePrivacy}>
        <div><span>Privacy</span><h2>Profile visibility</h2><p>A private profile only shows your name, avatar and location to other people.</p></div>
        <label>Who can view my profile<select name="profileVisibility" value={settings.profileVisibility} onChange={privacyChange}><option value="public">Everyone</option><option value="private">Only me</option></select></label>
        <label>Who can view my trail log<select name="trailLogVisibility" value={settings.trailLogVisibility} onChange={privacyChange}><option value="public">Everyone</option><option value="private">Only me</option></select></label>
        <button disabled={isLoading}>Save privacy settings</button>
      </form>
      <form onSubmit={changePassword}>
        <div><span>Security</span><h2>Change password</h2><p>Your new password must contain at least 8 characters.</p></div>
        <label>Current password<input name="currentPassword" type="password" required value={passwords.currentPassword} onChange={passwordChange} /></label>
        <label>New password<input name="newPassword" type="password" minLength="8" required value={passwords.newPassword} onChange={passwordChange} /></label>
        <label>Confirm new password<input name="confirmPassword" type="password" minLength="8" required value={passwords.confirmPassword} onChange={passwordChange} /></label>
        {passwordError && <p className="account-settings__error">{passwordError}</p>}
        <button disabled={isLoading}>Change password</button>
      </form>
    </section>}
  </React.Fragment>;
};
export default AccountSettings;
