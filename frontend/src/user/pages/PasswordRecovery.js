import React, { useContext, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Card from '../../shared/components/UIElements/Card';
import Button from '../../shared/components/FormElements/Button';
import { AuthContext } from '../../shared/context/auth-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import '../../shared/components/FormElements/Input.css';
import './Auth.css';

const PasswordRecovery = ({ reset = false }) => {
  const location = useLocation();
  const auth = useContext(AuthContext);
  const token = new URLSearchParams(location.search).get('token') || '';
  const validToken = /^[a-f0-9]{64}$/i.test(token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const submitting = useRef(false);

  const submitHandler = async event => {
    event.preventDefault();
    if (submitting.current || message || (reset && !validToken)) return;
    clearError();
    setValidationError('');
    if (reset && (password.length < 8 || password.length > 128)) {
      setValidationError('Use between 8 and 128 characters for your password.');
      return;
    }
    if (reset && password !== confirmation) {
      setValidationError('Your passwords do not match. Please try again.');
      return;
    }
    submitting.current = true;
    try {
      await sendRequest(
        `/api/users/${reset ? 'reset-password' : 'forgot-password'}`,
        'POST',
        JSON.stringify(reset ? { token, password } : { email: email.trim() }),
        { 'Content-Type': 'application/json' }
      );
      setPassword('');
      setConfirmation('');
      setMessage(reset
        ? 'Your password has been reset. Log in with your new password.'
        : 'If an account exists for this email address, a password reset link has been sent. Check your inbox and spam folder. The link expires in one hour.');
      if (reset && auth.isLoggedIn) auth.logout();
    } catch (err) {
      // The request hook exposes server and connection errors below.
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Card className="authentication password-recovery">
      <h2>{reset ? 'Set a new password' : 'Forgot your password?'}</h2>
      <hr />
      {message ? (
        <div className="authentication__verification" role="status">
          <strong>{reset ? 'Password updated' : 'Check your inbox'}</strong>
          <p>{message}</p>
        </div>
      ) : reset && !validToken ? (
        <div className="authentication__verification" role="alert">
          <strong>Invalid reset link</strong>
          <p>This link is incomplete or invalid. Request a new password reset email below.</p>
        </div>
      ) : (
        <form onSubmit={submitHandler} aria-busy={isLoading}>
          <p className="password-recovery__intro">{reset
            ? 'Choose a new password with 8–128 characters.'
            : 'Enter your account email and we will send you a link to reset your password.'}</p>
          {reset ? (
            <React.Fragment>
              <div className="form-control">
                <label htmlFor="new-password">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
                  value={password} onChange={event => setPassword(event.target.value)} disabled={isLoading} />
              </div>
              <div className="form-control">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
                  value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={isLoading} />
              </div>
            </React.Fragment>
          ) : (
            <div className="form-control">
              <label htmlFor="reset-email">Email address</label>
              <input id="reset-email" type="email" autoComplete="email" required
                value={email} onChange={event => setEmail(event.target.value)} disabled={isLoading} />
            </div>
          )}
          {(validationError || error) && <p className="password-recovery__error" role="alert">{validationError || error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Please wait…' : reset ? 'Save new password' : 'Send reset link'}
          </Button>
        </form>
      )}
      {reset && !message && <p><Link className="authentication__resend" to="/forgot-password">Request a new reset link</Link></p>}
      <Link className="button button--inverse" to="/auth">Back to login</Link>
    </Card>
  );
};

export default PasswordRecovery;
