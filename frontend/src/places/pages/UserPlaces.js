import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import PlaceList from '../components/PlaceList';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { useHttpClient } from '../../shared/hooks/http-hook';
import './UserPlaces.css';

const UserPlaces = () => {
  const [loadedPlaces, setLoadedPlaces] = useState([]);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const userId = useParams().userId;

  // fetch miejsc
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const responseData = await sendRequest(
          `/api/places/user/${userId}`
        );
        setLoadedPlaces(responseData.places || []);
      } catch (err) {}
    };
    fetchPlaces();
  }, [sendRequest, userId]);

  // Overlay przy miejscach
  useEffect(() => {
    if (loadedPlaces.length > 0) {
      document.body.classList.add('overlay-active');
    } else {
      document.body.classList.remove('overlay-active');
    }
    return () => document.body.classList.remove('overlay-active');
  }, [loadedPlaces]);

  const placeDeletedHandler = deletedPlaceId => {
    setLoadedPlaces(prev => prev.filter(p => p.id !== deletedPlaceId));
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      {isLoading && (
        <div className="center">
          <LoadingSpinner />
        </div>
      )}
      {!isLoading && loadedPlaces && (
        <div
          className={`user-places-page ${
            loadedPlaces.length === 1 ? 'single-place' : ''
          }`}
        >
          <PlaceList items={loadedPlaces} onDeletePlace={placeDeletedHandler} />
        </div>
      )}
    </React.Fragment>
  );
};

export default UserPlaces;