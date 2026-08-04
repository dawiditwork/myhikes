import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Link } from 'react-router-dom';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import Modal from '../../shared/components/UIElements/Modal';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { getAssetUrl } from '../../shared/util/api';
import './ExplorePlaces.css';

const distanceBetween = (from, to) => {
  const toRadians = value => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ExplorePlaces = () => {
  const { isLoading, error, sendRequest, clearError } = useHttpClient();

  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [maxDuration, setMaxDuration] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState('50');
  const [locationState, setLocationState] = useState('idle');
  const [showLightbox, setShowLightbox] = useState(false);

  const mapElementRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const clustererRef = useRef(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const responseData = await sendRequest(
          '/api/places'
        );

        setPlaces(responseData.places || []);
      } catch (err) {}
    };

    fetchPlaces();
  }, [sendRequest]);

  useEffect(() => {
    if (showLightbox) {
      document.body.classList.add('cinematic');
    } else {
      document.body.classList.remove('cinematic');
    }

    return () => {
      document.body.classList.remove('cinematic');
    };
  }, [showLightbox]);

  const getPlaceImages = place => {
    if (Array.isArray(place.images) && place.images.length > 0) {
      return place.images;
    }

    if (place.image) {
      return [place.image];
    }

    return [];
  };

  const getCreatorId = place => {
    return place.creator?.id || place.creator?._id;
  };

  const filteredPlaces = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const difficultyRank = { easy: 1, moderate: 2, hard: 3, expert: 4 };
    const averageRating = place => (place.ratings || []).length
      ? place.ratings.reduce((sum, rating) => sum + rating.value, 0) / place.ratings.length
      : null;
    const createdAtValue = place => {
      if (place.createdAt) return new Date(place.createdAt).getTime();
      const id = String(place.id || place._id || '');
      return /^[a-f\d]{24}$/i.test(id) ? parseInt(id.slice(0, 8), 16) * 1000 : null;
    };
    const compareOptional = (left, right, direction = 1) => {
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      return (left - right) * direction;
    };
    const newestFirst = (a, b) => compareOptional(createdAtValue(a), createdAtValue(b), -1);
    return places.map(place => ({
      ...place,
      distanceFromUser: userLocation && place.location ? distanceBetween(userLocation, place.location) : null
    })).filter(place => {
      const searchableText = [
        place.title,
        place.address,
        place.description,
        place.creator?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesDifficulty = difficultyFilter === 'all' ||
        place.difficulty === difficultyFilter;
      const matchesStatus = statusFilter === 'all' ||
        place.trailStatus === statusFilter;
      const matchesDuration = !maxDuration ||
        (place.hikeDuration && place.hikeDuration <= Number(maxDuration));
      const matchesRadius = !userLocation || place.distanceFromUser <= Number(radiusKm);

      return matchesSearch && matchesDifficulty && matchesStatus && matchesDuration && matchesRadius;
    }).sort((a, b) => {
      if (sortBy === 'rating_high') return compareOptional(averageRating(a), averageRating(b), -1) || newestFirst(a, b);
      if (sortBy === 'rating_low') return compareOptional(averageRating(a), averageRating(b), 1) || newestFirst(a, b);
      if (sortBy === 'duration_short') return compareOptional(a.hikeDuration, b.hikeDuration, 1) || newestFirst(a, b);
      if (sortBy === 'duration_long') return compareOptional(a.hikeDuration, b.hikeDuration, -1) || newestFirst(a, b);
      if (sortBy === 'difficulty_easy') return compareOptional(difficultyRank[a.difficulty], difficultyRank[b.difficulty], 1) || newestFirst(a, b);
      if (sortBy === 'difficulty_hard') return compareOptional(difficultyRank[a.difficulty], difficultyRank[b.difficulty], -1) || newestFirst(a, b);
      if (sortBy === 'distance') return (a.distanceFromUser || Infinity) - (b.distanceFromUser || Infinity);
      if (sortBy === 'oldest') return compareOptional(createdAtValue(a), createdAtValue(b), 1);
      return newestFirst(a, b);
    });
  }, [places, searchTerm, difficultyFilter, statusFilter, maxDuration, sortBy, userLocation, radiusKm]);

  const useLocationHandler = () => {
    if (!navigator.geolocation) { setLocationState('unsupported'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      position => {
        const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(nextLocation);
        setLocationState('ready');
        setSortBy('distance');
        setSelectedPlace(null);
        if (mapInstanceRef.current) { mapInstanceRef.current.panTo(nextLocation); mapInstanceRef.current.setZoom(9); }
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const clearLocationHandler = () => {
    setUserLocation(null);
    setLocationState('idle');
    setSortBy('newest');
    setSelectedPlace(null);
  };

  useEffect(() => {
  if (!window.google || !mapElementRef.current) {
    return;
  }

  if (!mapInstanceRef.current) {
    mapInstanceRef.current = new window.google.maps.Map(
      mapElementRef.current,
      {
        center: { lat: 50.8748, lng: 20.6328 },
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      }
    );
  }

  // Usuń poprzedni clusterer i markery po zmianie filtrów.
  if (clustererRef.current) {
    clustererRef.current.clearMarkers();
    clustererRef.current.setMap(null);
    clustererRef.current = null;
  }

  markersRef.current.forEach(({ marker }) => {
    marker.setMap(null);
  });

  markersRef.current = [];

  const map = mapInstanceRef.current;

  if (filteredPlaces.length === 0) {
    return;
  }

  const bounds = new window.google.maps.LatLngBounds();

  filteredPlaces.forEach(place => {
    if (
      !place.location ||
      typeof place.location.lat !== 'number' ||
      typeof place.location.lng !== 'number'
    ) {
      return;
    }

    const position = {
      lat: place.location.lat,
      lng: place.location.lng
    };

    // Nie przekazujemy tutaj map — markerami zarządza clusterer.
    const marker = new window.google.maps.Marker({
      position,
      title: place.title
    });

    const placeId = place.id || place._id;

    marker.addListener('click', () => {
      setSelectedPlace(place);
      setActiveImageIndex(0);
      setShowLightbox(false);

      markersRef.current.forEach(
        ({ marker: currentMarker, placeId: currentPlaceId }) => {
          const isSelected = currentPlaceId === placeId;

          currentMarker.setIcon(
            isSelected
              ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 11,
                  fillColor: '#0f766e',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3
                }
              : null
          );

          currentMarker.setZIndex(isSelected ? 999 : undefined);
        }
      );

      map.panTo(position);
      map.setZoom(12);
    });

    markersRef.current.push({
      marker,
      placeId
    });

    bounds.extend(position);
  });

  const markers = markersRef.current.map(({ marker }) => marker);

  if (markers.length > 0) {
    const renderer = {
      render: ({ count, position }) =>
        new window.google.maps.Marker({
          position,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 22,
            fillColor: '#0f766e',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 4
          },
          label: {
            text: String(count),
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '700'
          },
          zIndex:
            (window.google.maps.Marker.MAX_ZINDEX || 1000000) +
            count
        })
    };

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer
    });
  }

  if (markers.length === 1) {
    map.setCenter(bounds.getCenter());
    map.setZoom(13);
  } else if (markers.length > 1) {
    map.fitBounds(bounds);
  }

}, [filteredPlaces]);

  useEffect(() => {
    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current.setMap(null);
        clustererRef.current = null;
      }

      markersRef.current.forEach(({ marker }) => {
        marker.setMap(null);
      });

      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  const selectedImages = selectedPlace
    ? getPlaceImages(selectedPlace)
    : [];

  const selectedImage =
    selectedImages.length > 0
      ? selectedImages[activeImageIndex]
      : null;

  const nextSelectedImage = () => {
    if (selectedImages.length <= 1) {
      return;
    }

    setActiveImageIndex(prevIndex => {
      return (prevIndex + 1) % selectedImages.length;
    });
  };

  const prevSelectedImage = () => {
    if (selectedImages.length <= 1) {
      return;
    }

    setActiveImageIndex(prevIndex => {
      return (
        (prevIndex - 1 + selectedImages.length) %
        selectedImages.length
      );
    });
  };

  const searchChangeHandler = event => {
    setSearchTerm(event.target.value);
    setSelectedPlace(null);
    setActiveImageIndex(0);
    setShowLightbox(false);
  };

  const clearSearchHandler = () => {
    setSearchTerm('');
    setSelectedPlace(null);
    setActiveImageIndex(0);
    setShowLightbox(false);
  };

  const clearFiltersHandler = () => {
    setDifficultyFilter('all');
    setStatusFilter('all');
    setMaxDuration('');
    setSelectedPlace(null);
    setActiveImageIndex(0);
  };

  const openLightboxHandler = () => {
    if (!selectedImage) {
      return;
    }

    setShowLightbox(true);
  };

  const closeLightboxHandler = () => {
    setShowLightbox(false);
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />

      <Modal
        show={showLightbox}
        onCancel={closeLightboxHandler}
        className="modal--fullscreen"
        contentClass="explore__lightbox-content"
      >
        <div className="explore__lightbox">
          <button
            type="button"
            className="explore__lightbox-close"
            onClick={closeLightboxHandler}
            aria-label="Close gallery"
          >
            &times;
          </button>

          {selectedImage && selectedPlace && (
            <img
              src={getAssetUrl(selectedImage)}
              alt={`${selectedPlace.title} ${activeImageIndex + 1}`}
              className="explore__lightbox-image"
            />
          )}

          {selectedImages.length > 1 && (
            <React.Fragment>
              <button
                type="button"
                className="explore__lightbox-arrow explore__lightbox-arrow--left"
                onClick={prevSelectedImage}
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                className="explore__lightbox-arrow explore__lightbox-arrow--right"
                onClick={nextSelectedImage}
                aria-label="Next image"
              >
                ›
              </button>

              <div className="explore__lightbox-dots">
                {selectedImages.map((image, index) => (
                  <button
                    key={`lightbox-${image}-${index}`}
                    type="button"
                    className={`explore__gallery-dot ${
                      index === activeImageIndex ? 'active' : ''
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
      </Modal>

      <section className="explore">
        <div className="explore__header">
          <div>
            <span className="explore__eyebrow">
              Discover new places
            </span>

            <h1>Explore the map</h1>

            <p>
              Browse places shared by the community and click a marker
              to see more details.
            </p>
          </div>

          <div className="explore__count">
            <strong>{filteredPlaces.length}</strong>
            <span>
              {filteredPlaces.length === 1 ? 'place' : 'places'}
            </span>
          </div>
        </div>

        <div className="explore__search">
          <span
            className="explore__search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            type="search"
            value={searchTerm}
            onChange={searchChangeHandler}
            placeholder="Search by place, address or creator..."
            aria-label="Search places"
          />

          {searchTerm && (
            <button
              type="button"
              className="explore__search-clear"
              onClick={clearSearchHandler}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}

          <span className="explore__search-results">
            {filteredPlaces.length}{' '}
            {filteredPlaces.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        <div className="explore__filters" aria-label="Filter places">
          <label>
            <span>Difficulty</span>
            <select value={difficultyFilter} onChange={event => setDifficultyFilter(event.target.value)}>
              <option value="all">All levels</option>
              <option value="easy">Easy</option>
              <option value="moderate">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label>
            <span>Trail status</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">Any status</option>
              <option value="open">Open</option>
              <option value="caution">Use caution</option>
              <option value="closed">Closed</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </label>
          <label>
            <span>Maximum duration</span>
            <select value={maxDuration} onChange={event => setMaxDuration(event.target.value)}>
              <option value="">Any duration</option>
              <option value="120">Up to 2 hours</option>
              <option value="240">Up to 4 hours</option>
              <option value="480">Up to 8 hours</option>
            </select>
          </label>
          <label><span>Sort by</span><select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="rating_high">Best rating</option><option value="rating_low">Lowest rating</option><option value="duration_short">Shortest time</option><option value="duration_long">Longest time</option><option value="difficulty_easy">Easiest first</option><option value="difficulty_hard">Hardest first</option>{userLocation && <option value="distance">Nearest first</option>}</select></label>
          {(difficultyFilter !== 'all' || statusFilter !== 'all' || maxDuration) && (
            <button type="button" onClick={clearFiltersHandler}>Clear filters</button>
          )}
        </div>

        <div className="explore__nearby">
          <div><span>Nearby trails</span><strong>{userLocation ? `Showing trails within ${radiusKm} km` : 'Find hikes close to your current position'}</strong>{locationState === 'denied' && <small>Location access was denied. Enable it in your browser settings and try again.</small>}{locationState === 'unsupported' && <small>Your browser does not support location access.</small>}</div>
          {userLocation && <label>Radius<select value={radiusKm} onChange={event => setRadiusKm(event.target.value)}><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option><option value="200">200 km</option></select></label>}
          <button type="button" disabled={locationState === 'loading'} onClick={userLocation ? clearLocationHandler : useLocationHandler}>{locationState === 'loading' ? 'Locating…' : userLocation ? 'Clear location' : 'Use my location'}</button>
        </div>

        <div className="explore__layout">
          <div className="explore__map-wrapper">
            <div
              ref={mapElementRef}
              className="explore__map"
            />

            {isLoading && <LoadingSpinner asOverlay />}

            {!isLoading && filteredPlaces.length === 0 && (
              <div className="explore__no-results">
                <div>
                  <span role="img" aria-label="Search">
                    🔎
                  </span>
                </div>

                <h2>No places found</h2>

                <p>
                  Try another title, address, description or creator
                  name.
                </p>
              </div>
            )}

          </div>

          <aside className="explore__sidebar">
            <div className="explore__results-list" aria-label="Filtered trails">
              <div className="explore__results-heading"><strong>Trails</strong><span>{filteredPlaces.length}</span></div>
              {filteredPlaces.map(place => {
                const listImages = getPlaceImages(place);
                const average = (place.ratings || []).length ? (place.ratings.reduce((sum, rating) => sum + rating.value, 0) / place.ratings.length).toFixed(1) : null;
                return <button key={place.id || place._id} type="button" className={selectedPlace && (selectedPlace.id || selectedPlace._id) === (place.id || place._id) ? 'active' : ''} onClick={() => { setSelectedPlace(place); setActiveImageIndex(0); setShowLightbox(false); }}>
                  {listImages[0] ? <img src={getAssetUrl(listImages[0])} alt="" /> : <span className="explore__result-placeholder" />}
                  <span><strong>{place.title}</strong><small>{place.distanceKm ? `${place.distanceKm} km trail` : 'Trail distance unknown'}{place.distanceFromUser != null ? ` · ${place.distanceFromUser.toFixed(1)} km away` : ''}{average ? ` · ★ ${average}` : ''}</small></span>
                </button>;
              })}
            </div>
            {selectedPlace ? (
              <article
                key={selectedPlace.id}
                className="explore__card explore__card--animated"
>
                <div className="explore__gallery">
                  {selectedImage ? (
                    <img
                      src={getAssetUrl(selectedImage)}
                      alt={`${selectedPlace.title} ${
                        activeImageIndex + 1
                      }`}
                      className="explore__card-image explore__card-image--clickable"
                      onClick={openLightboxHandler}
                    />
                  ) : (
                    <div className="explore__card-placeholder">
                      No image available
                    </div>
                  )}

                  {selectedImages.length > 1 && (
                    <React.Fragment>
                      <button
                        type="button"
                        className="explore__gallery-arrow explore__gallery-arrow--left"
                        onClick={prevSelectedImage}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        className="explore__gallery-arrow explore__gallery-arrow--right"
                        onClick={nextSelectedImage}
                        aria-label="Next image"
                      >
                        ›
                      </button>

                      <div className="explore__gallery-dots">
                        {selectedImages.map((image, index) => (
                          <button
                            key={`${image}-${index}`}
                            type="button"
                            className={`explore__gallery-dot ${
                              index === activeImageIndex ? 'active' : ''
                            }`}
                            onClick={() =>
                              setActiveImageIndex(index)
                            }
                            aria-label={`Go to image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </React.Fragment>
                  )}
                </div>

                <div className="explore__card-content">
                  <span className="explore__card-label">
                    Selected place
                  </span>

                  <h2>{selectedPlace.title}</h2>

                  <p className="explore__address">
                    <span role="img" aria-label="Location">
                      📍
                    </span>{' '}
                    {selectedPlace.address}
                  </p>

                  <p className="explore__description">
                    {selectedPlace.description}
                  </p>

                  <div className="explore__meta">
                    <span>
                      <span role="img" aria-label="Photos">
                        📸
                      </span>{' '}
                      {selectedImages.length}{' '}
                      {selectedImages.length === 1
                        ? 'photo'
                        : 'photos'}
                    </span>
                    {selectedPlace.difficulty && (
                      <span>{selectedPlace.difficulty === 'moderate' ? 'Medium' : selectedPlace.difficulty}</span>
                    )}
                    {selectedPlace.hikeDuration && (
                      <span>{Math.round(selectedPlace.hikeDuration / 60 * 10) / 10} h</span>
                    )}
                    {selectedPlace.elevationGain !== undefined && (
                      <span>+{selectedPlace.elevationGain} m</span>
                    )}
                    {selectedPlace.trailStatus && (
                      <span className={`explore__status explore__status--${selectedPlace.trailStatus}`}>
                        {selectedPlace.trailStatus}
                      </span>
                    )}
                    {selectedPlace.distanceFromUser != null && <span>{selectedPlace.distanceFromUser.toFixed(1)} km from you</span>}
                  </div>

                  {selectedPlace.creator && (
                    <div className="explore__creator">
                      {selectedPlace.creator.image && (
                        <img
                          src={getAssetUrl(selectedPlace.creator.image)}
                          alt={selectedPlace.creator.name}
                        />
                      )}

                      <div>
                        <span>Shared by</span>
                        <strong>
                          {selectedPlace.creator.name}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="explore__actions">
                    <Link
                      to={`/places/${
                        selectedPlace.id || selectedPlace._id
                      }/details`}
                      className="explore__button"
                    >
                      View full details
                    </Link>

                    {selectedPlace.location && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.location.lat},${selectedPlace.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explore__button explore__button--secondary"
                      >
                        Get directions
                      </a>
                    )}

                    {getCreatorId(selectedPlace) && (
                      <Link
                        to={`/${getCreatorId(
                          selectedPlace
                        )}/places`}
                        className="explore__button"
                      >
                        View creator places
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ) : (
              <div className="explore__empty">
                <div className="explore__empty-icon">
                  <span role="img" aria-label="Map marker">
                    📍
                  </span>
                </div>

                <h2>Select a marker</h2>

                <p>
                  Click any marker on the map to preview the place and
                  its creator.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </React.Fragment>
  );
};

export default ExplorePlaces;
