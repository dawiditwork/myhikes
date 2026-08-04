import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import Card from '../../shared/components/UIElements/Card';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { useHttpClient } from '../../shared/hooks/http-hook';
import './Auth.css';

const VerifyEmail = () => {
  const location = useLocation();
  const { isLoading, sendRequest } = useHttpClient();
  const [result, setResult] = useState({ type: 'pending', message: '' });

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    const email = query.get('email');
    if (!token || !email) {
      setResult({ type: 'error', message: 'This verification link is incomplete.' });
      return;
    }

    let active = true;
    sendRequest(
      `/api/users/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    )
      .then(data => active && setResult({ type: 'success', message: data.message }))
      .catch(err => active && setResult({ type: 'error', message: err.message }));
    return () => { active = false; };
  }, [location.search, sendRequest]);

  return (
    <Card className="authentication">
      {isLoading && <LoadingSpinner asOverlay />}
      <h2>Email verification</h2>
      <hr />
      {result.type === 'pending' && <p>Verifying your email address...</p>}
      {result.type !== 'pending' && (
        <div className="authentication__verification" role="status">
          <strong>{result.type === 'success' ? 'Email verified' : 'Verification failed'}</strong>
          <p>{result.message}</p>
        </div>
      )}
      <Link className="button button--inverse" to="/auth">Go to login</Link>
    </Card>
  );
};

export default VerifyEmail;
