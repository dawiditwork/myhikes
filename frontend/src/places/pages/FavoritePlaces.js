import React, { useContext, useEffect, useState } from 'react';

import PlaceList from '../components/PlaceList';
import Card from '../../shared/components/UIElements/Card';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { AuthContext } from '../../shared/context/auth-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import './FavoritePlaces.css';

const FavoritePlaces = () => {
  const auth = useContext(AuthContext);
  const [favorites, setFavorites] = useState([]);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const data = await sendRequest(
          '/api/users/favorites',
          'GET',
          null,
          { Authorization: 'Bearer ' + auth.token }
        );
        setFavorites(data.favorites || []);
      } catch (err) {}
    };
    loadFavorites();
  }, [auth.token, sendRequest]);

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      {isLoading && <LoadingSpinner />}
      {!isLoading && (
        <section className="favorite-places">
          <header>
            <span>Your collection</span>
            <h1>Favorite places</h1>
            <p>Keep the places you want to visit close at hand.</p>
          </header>
          {favorites.length > 0 ? (
            <PlaceList
              items={favorites}
              onFavoriteRemove={placeId =>
                setFavorites(current => current.filter(place => place.id !== placeId))
              }
            />
          ) : (
            <Card className="favorite-places__empty">
              <h2>No favorites yet</h2>
              <p>Use the Save button on any place to add it here.</p>
            </Card>
          )}
        </section>
      )}
    </React.Fragment>
  );
};

export default FavoritePlaces;
