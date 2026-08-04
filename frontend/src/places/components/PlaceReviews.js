import React, { useContext, useMemo, useState } from 'react';

import { AuthContext } from '../../shared/context/auth-context';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { getAssetUrl } from '../../shared/util/api';
import ReportButton from '../../shared/components/UIElements/ReportButton';
import './PlaceReviews.css';

const PlaceReviews = ({ place, onPlaceChange }) => {
  const auth = useContext(AuthContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [comment, setComment] = useState('');
  const ratings = place.ratings || [];
  const comments = place.comments || [];

  const average = useMemo(() => {
    if (!ratings.length) return 0;
    return ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length;
  }, [ratings]);

  const userRating = ratings.find(rating =>
    (rating.user.id || rating.user._id || rating.user).toString() === auth.userId
  );

  const request = async (url, method, body) => {
    const data = await sendRequest(url, method, body, {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + auth.token
    });
    onPlaceChange(data.place);
  };

  const rateHandler = async value => {
    try {
      await request(
        `/api/places/${place.id}/rating`,
        'PUT',
        JSON.stringify({ value })
      );
    } catch (err) {}
  };

  const submitCommentHandler = async event => {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      await request(
        `/api/places/${place.id}/comments`,
        'POST',
        JSON.stringify({ text: comment })
      );
      setComment('');
    } catch (err) {}
  };

  const deleteCommentHandler = async commentId => {
    try {
      await request(
        `/api/places/${place.id}/comments/${commentId}`,
        'DELETE'
      );
    } catch (err) {}
  };

  return (
    <section className="place-reviews">
      <ErrorModal error={error} onClear={clearError} />
      <div className="place-reviews__heading">
        <div>
          <span>Community reviews</span>
          <h2>Ratings & comments</h2>
        </div>
        <div className="place-reviews__score">
          <strong>{average ? average.toFixed(1) : '—'}</strong>
          <span>{ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}</span>
        </div>
      </div>

      {auth.isLoggedIn ? (
        <div className="place-reviews__rate">
          <span>{userRating ? 'Your rating' : 'Rate this place'}</span>
          <div>
            {[1, 2, 3, 4, 5].map(value => (
              <button
                type="button"
                key={value}
                onClick={() => rateHandler(value)}
                disabled={isLoading}
                className={userRating && value <= userRating.value ? 'active' : ''}
                aria-label={`${value} stars`}
              >★</button>
            ))}
          </div>
        </div>
      ) : (
        <p className="place-reviews__login-note">Log in to rate and comment.</p>
      )}

      {auth.isLoggedIn && (
        <form className="place-reviews__form" onSubmit={submitCommentHandler}>
          <textarea
            value={comment}
            onChange={event => setComment(event.target.value)}
            maxLength="1000"
            placeholder="Share your experience..."
            aria-label="Your comment"
          />
          <button type="submit" disabled={isLoading || !comment.trim()}>
            Add comment
          </button>
        </form>
      )}

      <div className="place-reviews__comments">
        {comments.length === 0 && <p>No comments yet. Be the first to share one.</p>}
        {[...comments].reverse().map(item => {
          const authorId = item.author && (item.author.id || item.author._id || item.author);
          return (
            <article key={item.id || item._id}>
              {item.author && item.author.image && (
                <img src={getAssetUrl(item.author.image)} alt="" />
              )}
              <div>
                <header>
                  <strong>{item.author && item.author.name ? item.author.name : 'User'}</strong>
                  <time>{new Date(item.createdAt).toLocaleDateString()}</time>
                </header>
                <p>{item.text}</p>
              </div>
              {authorId && authorId.toString() === auth.userId && (
                <button
                  type="button"
                  className="place-reviews__delete"
                  onClick={() => deleteCommentHandler(item.id || item._id)}
                  disabled={isLoading}
                >Delete</button>
              )}
              {authorId && authorId.toString() !== auth.userId && <ReportButton placeId={place.id || place._id} targetType="comment" targetId={item.id || item._id} targetLabel={item.text.slice(0, 120)} />}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PlaceReviews;
