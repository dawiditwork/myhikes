import React from 'react';

import UserItem from './UserItem';
import Card from '../../shared/components/UIElements/Card';
import './UsersList.css';

const UsersList = props => {
  if (props.items.length === 0) {
    return (
      <div className="users-list__empty">
        <Card className="users-list__empty-card">
          <h2>{props.emptyMessage || 'No users found.'}</h2>
        </Card>
      </div>
    );
  }

  return (
    <ul className="users-list">
      {props.items.map(user => (
        <UserItem
          key={user.id}
          id={user.id}
          image={user.image}
          name={user.name}
          placeCount={Array.isArray(user.places) ? user.places.length : 0}
        />
      ))}
    </ul>
  );
};

export default UsersList;
