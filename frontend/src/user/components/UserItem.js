import React from 'react';
import { Link } from 'react-router-dom';

import Avatar from '../../shared/components/UIElements/Avatar';
import Card from '../../shared/components/UIElements/Card';
import { getAssetUrl } from '../../shared/util/api';
import './UserItem.css';

const UserItem = props => {
  const placeLabel = props.placeCount === 1 ? 'place' : 'places';

  return (
    <li className="user-item">
      <Card className="user-item__content">
        <Link to={`/users/${props.id}`}>
          <div className="user-item__image">
            <Avatar image={getAssetUrl(props.image)} alt={props.name} />
          </div>
          <div className="user-item__info">
            <span className="user-item__label">Explorer</span>
            <h2>{props.name}</h2>
            <p>{props.placeCount} {placeLabel}</p>
          </div>
          <span className="user-item__arrow" aria-hidden="true">&rarr;</span>
        </Link>
      </Card>
    </li>
  );
};

export default UserItem;
