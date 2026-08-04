import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import UsersList from '../components/UsersList';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { getAssetUrl } from '../../shared/util/api';
import './Users.css';

const Users = () => {
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [loadedUsers, setLoadedUsers] = useState([]);
  const [loadedPlaces, setLoadedPlaces] = useState([]);

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        const usersResponse = await sendRequest(
          '/api/users'
        );
        setLoadedUsers(usersResponse.users || []);

        const placesResponse = await sendRequest(
          '/api/places'
        );
        setLoadedPlaces(placesResponse.places || []);
      } catch (err) {}
    };

    fetchHomepageData();
  }, [sendRequest]);

  const activeUsers = useMemo(() => {
    return [...loadedUsers]
      .filter(user => Array.isArray(user.places) && user.places.length > 0)
      .sort((first, second) => second.places.length - first.places.length)
      .slice(0, 4);
  }, [loadedUsers]);

  const featuredPlaces = useMemo(() => {
    return loadedPlaces.slice(0, 3);
  }, [loadedPlaces]);

  const getPlaceImage = place => {
    if (Array.isArray(place.images) && place.images.length > 0) {
      return place.images[0];
    }

    return place.image || null;
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />

      <div className="home-page">
        <section className="home-hero">
          <div className="home-hero__content">
            <span className="home-eyebrow">
              Places recommended by the community
            </span>
            <h1>Find an idea for your next adventure.</h1>
            <p>
              Discover inspiring places, browse them on the map and see
              where other explorers have already been.
            </p>

            <div className="home-hero__actions">
              <Link to="/explore" className="home-button">
                Explore the map
              </Link>
              <Link
                to="/community"
                className="home-button home-button--secondary"
              >
                Meet the community
              </Link>
            </div>
          </div>

          <div className="home-hero__visual">
            <span
              className="home-hero__pin"
              role="img"
              aria-label="Map pin"
            >
              &#128205;
            </span>
            <div>
              <strong>{loadedPlaces.length}</strong>
              <span>shared places</span>
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="home-loading">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && (
          <React.Fragment>
            <section className="home-section">
              <div className="home-section__heading">
                <div>
                  <span className="home-eyebrow">Get inspired</span>
                  <h2>Recently shared places</h2>
                </div>
                <Link to="/explore">View all places &rarr;</Link>
              </div>

              {featuredPlaces.length > 0 ? (
                <div className="home-places">
                  {featuredPlaces.map(place => {
                    const image = getPlaceImage(place);

                    return (
                      <article className="home-place" key={place.id || place._id}>
                        {image ? (
                          <img
                            src={getAssetUrl(image)}
                            alt={place.title}
                          />
                        ) : (
                          <div className="home-place__placeholder">
                            No photo
                          </div>
                        )}

                        <div className="home-place__content">
                          <span>{place.address}</span>
                          <h3>{place.title}</h3>
                          <p>
                            {place.description ||
                              'A place shared by the MyHikes community.'}
                          </p>
                          <Link
                            to={`/places/${place.id || place._id}/details`}
                          >
                            View details &rarr;
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="home-empty">
                  <h3>No places have been shared yet.</h3>
                  <p>Be the first explorer to add one.</p>
                </div>
              )}
            </section>

            <section className="home-section home-section--community">
              <div className="home-section__heading">
                <div>
                  <span className="home-eyebrow">Community</span>
                  <h2>Active explorers</h2>
                </div>
                <Link to="/community">View everyone &rarr;</Link>
              </div>

              <UsersList
                items={activeUsers}
                emptyMessage="No active explorers yet."
              />
            </section>
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
  );
};

export default Users;
