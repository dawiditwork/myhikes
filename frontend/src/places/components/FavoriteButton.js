import React, { useContext, useEffect, useState } from 'react';

import { AuthContext } from '../../shared/context/auth-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import './FavoriteButton.css';

const FavoriteButton = props => {
  const auth = useContext(AuthContext);
  const { sendRequest } = useHttpClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!auth.token) return;

    const loadStatus = async () => {
      try {
        const data = await sendRequest(
          `/api/users/favorites/${props.placeId}`,
          'GET',
          null,
          { Authorization: 'Bearer ' + auth.token }
        );
        setIsFavorite(data.isFavorite);
      } catch (err) {}
    };

    loadStatus();
  }, [auth.token, props.placeId, sendRequest]);

  if (!auth.isLoggedIn) return null;

  const toggleHandler = async () => {
    setIsUpdating(true);
    try {
      const data = await sendRequest(
        `/api/users/favorites/${props.placeId}`,
        isFavorite ? 'DELETE' : 'POST',
        null,
        { Authorization: 'Bearer ' + auth.token }
      );
      setIsFavorite(data.isFavorite);
      if (!data.isFavorite && props.onRemove) props.onRemove(props.placeId);
    } catch (err) {}
    setIsUpdating(false);
  };

  return (
    <button
      type="button"
      className={`favorite-button ${isFavorite ? 'favorite-button--active' : ''}`}
      onClick={toggleHandler}
      disabled={isUpdating}
      aria-pressed={isFavorite}
    >
      <span aria-hidden="true">{isFavorite ? '\u2665' : '\u2661'}</span>
      {isFavorite ? 'Saved' : 'Save'}
    </button>
  );
};

export default FavoriteButton;
