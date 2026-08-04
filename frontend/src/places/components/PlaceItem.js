import React, { useState, useContext, useMemo, useEffect } from 'react';

import Card from '../../shared/components/UIElements/Card';
import Button from '../../shared/components/FormElements/Button';
import Modal from '../../shared/components/UIElements/Modal';
import Map from '../../shared/components/UIElements/Map';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { AuthContext } from '../../shared/context/auth-context';
import { NotificationContext } from '../../shared/context/notification-context';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { getAssetUrl } from '../../shared/util/api';
import FavoriteButton from './FavoriteButton';
import './PlaceItem.css';

const PlaceItem = props => {
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const auth = useContext(AuthContext);
  const notifications = useContext(NotificationContext);

  const [showMap, setShowMap] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // slider
  const [activeIndex, setActiveIndex] = useState(0);

  // lightbox
  const [showLightbox, setShowLightbox] = useState(false);


  const images = useMemo(() => {
    if (props.images && Array.isArray(props.images) && props.images.length > 0) {
      return props.images;
    }
    if (props.image) return [props.image];
    return [];
  }, [props.images, props.image]);

  const total = images.length;
  const currentImage = total > 0 ? images[activeIndex] : null;

  const nextImage = () => {
    if (total <= 1) return;
    setActiveIndex(prev => (prev + 1) % total);
  };

  const prevImage = () => {
    if (total <= 1) return;
    setActiveIndex(prev => (prev - 1 + total) % total);
  };

  const openMapHandler = () => setShowMap(true);
  const closeMapHandler = () => setShowMap(false);

  const showDeleteWarningHandler = () => setShowConfirmModal(true);
  const cancelDeleteHandler = () => setShowConfirmModal(false);

  const confirmDeleteHandler = async () => {
    setShowConfirmModal(false);
    try {
      await sendRequest(
        `/api/places/${props.id}`,
        'DELETE',
        null,
        { Authorization: 'Bearer ' + auth.token }
      );
      props.onDelete(props.id);
      notifications.showNotification('Place deleted.');
    } catch (err) {}
  };

  const openLightbox = () => {
    if (!currentImage) return;
    setShowLightbox(true);
  };

  const closeLightbox = () => setShowLightbox(false);
  
  useEffect(() => {
  if (showLightbox) {
    document.body.classList.add('cinematic');
  } else {
    document.body.classList.remove('cinematic');
  }

  return () => document.body.classList.remove('cinematic');
}, [showLightbox]);

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />

      {/* LIGHTBOX (FULLSCREEN) */}
      <Modal
            show={showLightbox}
            onCancel={closeLightbox}
            className="modal--fullscreen"   // 🔥 KLUCZ
            contentClass="place-item__lightbox-content"
      >
        <div className="place-item__lightbox">
          <button
            type="button"
            className="place-item__lightbox-close"
            onClick={closeLightbox}
            aria-label="Close"
          >
            &times;
          </button>

          {currentImage && (
            <img
              className="place-item__lightbox-img"
              src={getAssetUrl(currentImage)}
              alt={props.title}
            />
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                className="place-item__arrow place-item__arrow--left place-item__arrow--lightbox"
                onClick={prevImage}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                className="place-item__arrow place-item__arrow--right place-item__arrow--lightbox"
                onClick={nextImage}
                aria-label="Next image"
              >
                ›
              </button>

              <div className="place-item__dots place-item__dots--lightbox">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`place-item__dot ${i === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal mapy */}
      <Modal
        show={showMap}
        onCancel={closeMapHandler}
        header={props.address}
        contentClass="place-item__modal-content"
        footerClass="place-item__modal-actions"
        footer={<Button onClick={closeMapHandler}>CLOSE</Button>}
      >
        <div className="map-container">
          <Map center={props.coordinates} zoom={16} />
        </div>
      </Modal>

      {/* Modal potwierdzenia usunięcia */}
      <Modal
        show={showConfirmModal}
        onCancel={cancelDeleteHandler}
        header="Delete this place?"
        className="place-item__delete-modal"
        footerClass="place-item__modal-actions"
        footer={
          <React.Fragment>
            <Button inverse onClick={cancelDeleteHandler}>CANCEL</Button>
            <Button danger onClick={confirmDeleteHandler}>DELETE</Button>
          </React.Fragment>
        }
      >
        <p>
          <strong>{props.title}</strong> will be permanently removed together with its photos. This action cannot be undone.
        </p>
      </Modal>

      {/* Karta miejsca */}
      <li className="place-item">
        <Card className="place-item__content">
          {isLoading && <LoadingSpinner asOverlay />}

          {/* ZDJĘCIE + SLIDER */}
          <div className="place-item__image">
            {currentImage ? (
              <img
                src={getAssetUrl(currentImage)}
                alt={props.title}
                onClick={openLightbox}
                className="place-item__clickable-img"
              />
            ) : (
              <div className="place-item__no-image">No image available</div>
            )}

            {total > 1 && (
              <>
                <button
                  type="button"
                  className="place-item__arrow place-item__arrow--left"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="place-item__arrow place-item__arrow--right"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  ›
                </button>

                <div className="place-item__dots">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`place-item__dot ${i === activeIndex ? 'active' : ''}`}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="place-item__info">
            <h2>{props.title}</h2>
            <h3>{props.address}</h3>
            <p>{props.description}</p>
          </div>

          <div className="place-item__actions">
            <FavoriteButton placeId={props.id} onRemove={props.onFavoriteRemove} />

            <Button className="place-action place-action--primary" to={`/places/${props.id}/details`}>
              View details <span aria-hidden="true">&rarr;</span>
            </Button>

            <Button className="place-action place-action--map" inverse onClick={openMapHandler}>
              <span aria-hidden="true">&#9906;</span> View on map
            </Button>

            {auth.userId === props.creatorId && (
              <Button className="place-action place-action--edit" to={`/places/${props.id}`}>Edit</Button>
            )}

            {auth.userId === props.creatorId && (
              <Button className="place-action place-action--delete" danger onClick={showDeleteWarningHandler}>Delete place</Button>
            )}
          </div>
        </Card>
      </li>
    </React.Fragment>
  );
};

export default PlaceItem;
