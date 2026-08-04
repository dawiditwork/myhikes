import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import Map from '../../shared/components/UIElements/Map';
import Modal from '../../shared/components/UIElements/Modal';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { getAssetUrl } from '../../shared/util/api';
import FavoriteButton from '../components/FavoriteButton';
import PlaceReviews from '../components/PlaceReviews';
import TrailCommunityPanel from '../components/TrailCommunityPanel';
import ReportButton from '../../shared/components/UIElements/ReportButton';
import './PlaceDetails.css';

const PlaceDetails = () => {
  const placeId = useParams().placeId;
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [place, setPlace] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const responseData = await sendRequest(
          `/api/places/${placeId}`
        );
        setPlace(responseData.place);
      } catch (err) {}
    };

    fetchPlace();
  }, [placeId, sendRequest]);

  useEffect(() => {
    document.body.classList.toggle('cinematic', showLightbox);
    return () => document.body.classList.remove('cinematic');
  }, [showLightbox]);

  const images = useMemo(() => {
    if (!place) return [];
    if (Array.isArray(place.images) && place.images.length > 0) {
      return place.images;
    }
    return place.image ? [place.image] : [];
  }, [place]);

  const currentImage = images[activeImageIndex];
  const creatorId = place && place.creator
    ? place.creator.id || place.creator._id || place.creator
    : null;
  const activeWarnings = useMemo(() => {
    if (!place) return [];
    const labels = { closed_section: 'Closed trail section', ice: 'Icy conditions', snow: 'Snow on the trail', mud: 'Muddy trail', parking_issue: 'Parking problems' };
    const priority = { closed_section: 5, ice: 4, snow: 3, parking_issue: 2, mud: 1 };
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const grouped = (place.conditionReports || []).filter(report => new Date(report.createdAt).getTime() >= cutoff).reduce((result, report) => {
      if (!result[report.condition]) result[report.condition] = { condition: report.condition, count: 0, confirmations: 0, latest: report.createdAt };
      result[report.condition].count += 1;
      result[report.condition].confirmations += (report.confirmedBy || []).length;
      if (new Date(report.createdAt) > new Date(result[report.condition].latest)) result[report.condition].latest = report.createdAt;
      return result;
    }, {});
    return Object.values(grouped).map(item => ({ ...item, label: labels[item.condition] })).sort((a, b) => priority[b.condition] - priority[a.condition]);
  }, [place]);

  const changeImage = direction => {
    if (images.length < 2) return;
    setActiveImageIndex(current =>
      (current + direction + images.length) % images.length
    );
  };

  const formatDuration = minutes => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!hours) return `${remainingMinutes} min`;
    return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />

      <Modal
        show={showLightbox}
        onCancel={() => setShowLightbox(false)}
        className="modal--fullscreen"
        contentClass="place-details__lightbox-content"
      >
        <div className="place-details__lightbox">
          <button
            type="button"
            className="place-details__lightbox-close"
            onClick={() => setShowLightbox(false)}
            aria-label="Close gallery"
          >
            &times;
          </button>
          {currentImage && (
            <img
              src={getAssetUrl(currentImage)}
              alt={place ? place.title : 'Place'}
            />
          )}
          {images.length > 1 && (
            <React.Fragment>
              <button
                type="button"
                className="place-details__arrow place-details__arrow--left"
                onClick={() => changeImage(-1)}
                aria-label="Previous image"
              >
                &#8249;
              </button>
              <button
                type="button"
                className="place-details__arrow place-details__arrow--right"
                onClick={() => changeImage(1)}
                aria-label="Next image"
              >
                &#8250;
              </button>
            </React.Fragment>
          )}
        </div>
      </Modal>

      {isLoading && <LoadingSpinner />}

      {!isLoading && place && (
        <section className="place-details">
          <Link to={`/${creatorId}/places`} className="place-details__back">
            &larr; Back to places
          </Link>
          {activeWarnings.length > 0 && <div className={`place-details__warning place-details__warning--${activeWarnings[0].condition}`} role="status">
            <div><span>Current community warning</span><strong>{activeWarnings[0].label}</strong><p>{activeWarnings[0].count} recent {activeWarnings[0].count === 1 ? 'report' : 'reports'} · {activeWarnings[0].confirmations} confirmations</p></div>
            <a href="#trail-conditions">See condition reports ↓</a>
          </div>}

          <div className="place-details__hero">
            <div className="place-details__gallery">
              {currentImage ? (
                <img
                  src={getAssetUrl(currentImage)}
                  alt={`${place.title} ${activeImageIndex + 1}`}
                  onClick={() => setShowLightbox(true)}
                />
              ) : (
                <div className="place-details__placeholder">No image available</div>
              )}

              {images.length > 1 && (
                <React.Fragment>
                  <button
                    type="button"
                    className="place-details__arrow place-details__arrow--left"
                    onClick={() => changeImage(-1)}
                    aria-label="Previous image"
                  >
                    &#8249;
                  </button>
                  <button
                    type="button"
                    className="place-details__arrow place-details__arrow--right"
                    onClick={() => changeImage(1)}
                    aria-label="Next image"
                  >
                    &#8250;
                  </button>
                  <div className="place-details__dots">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        className={index === activeImageIndex ? 'active' : ''}
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </React.Fragment>
              )}
            </div>

            <div className="place-details__summary">
              <span className="place-details__eyebrow">Place details</span>
              <h1>{place.title}</h1>
              <p className="place-details__address">{place.address}</p>
              <p className="place-details__description">{place.description}</p>

              {(place.hikeDuration || place.distanceKm || place.difficulty || place.elevationGain !== undefined) && (
                <div className="place-details__trail-stats">
                  {place.hikeDuration && (
                    <div>
                      <span>Duration</span>
                      <strong>{formatDuration(place.hikeDuration)}</strong>
                    </div>
                  )}
                  {place.distanceKm && (
                    <div>
                      <span>Distance</span>
                      <strong>{place.distanceKm} km</strong>
                    </div>
                  )}
                  {place.difficulty && (
                    <div>
                      <span>Difficulty</span>
                      <strong className={`difficulty difficulty--${place.difficulty}`}>
                        {place.difficulty === 'moderate' ? 'Medium' : place.difficulty}
                      </strong>
                    </div>
                  )}
                  {place.elevationGain !== undefined && (
                    <div>
                      <span>Elevation</span>
                      <strong>{place.elevationGain} m</strong>
                    </div>
                  )}
                </div>
              )}

              {place.trailStatus && (
                <div className={`place-details__status place-details__status--${place.trailStatus}`}>
                  <span aria-hidden="true" />
                  <div>
                    <small>Current trail status</small>
                    <strong>
                      {place.trailStatus === 'caution' ? 'Use caution' :
                        place.trailStatus === 'seasonal' ? 'Seasonal access' :
                          place.trailStatus}
                    </strong>
                  </div>
                </div>
              )}

              {place.parkingAddress && (
                <a
                  className="place-details__parking"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.parkingAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span aria-hidden="true">P</span>
                  <div>
                    <small>Recommended parking</small>
                    <strong>{place.parkingAddress}</strong>
                  </div>
                </a>
              )}

              <FavoriteButton placeId={place.id || place._id} />
              <ReportButton placeId={place.id || place._id} targetType="place" targetId={place.id || place._id} targetLabel={place.title} />

              {place.creator && typeof place.creator === 'object' && (
                <Link
                  to={`/users/${creatorId}`}
                  className="place-details__creator"
                >
                  {place.creator.image && (
                    <img
                      src={getAssetUrl(place.creator.image)}
                      alt={place.creator.name}
                    />
                  )}
                  <span>
                    <small>Shared by</small>
                    <strong>{place.creator.name}</strong>
                  </span>
                </Link>
              )}

              {place.location && (
                <a
                  className="place-details__directions"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions
                </a>
              )}
            </div>
          </div>

          <div id="trail-conditions"><TrailCommunityPanel place={place} onPlaceChange={setPlace} /></div>

          {place.location && (
            <div className="place-details__map-section">
              <div>
                <span className="place-details__eyebrow">Location</span>
                <h2>Find it on the map</h2>
              </div>
              <div className="place-details__map">
                <Map center={place.location} zoom={15} />
              </div>
            </div>
          )}

          <PlaceReviews place={place} onPlaceChange={setPlace} />
        </section>
      )}
    </React.Fragment>
  );
};

export default PlaceDetails;
