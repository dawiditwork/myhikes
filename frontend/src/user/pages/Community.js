import React, { useEffect, useMemo, useState } from 'react';

import UsersList from '../components/UsersList';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { useHttpClient } from '../../shared/hooks/http-hook';
import './Community.css';

const USERS_PER_PAGE = 8;

const Community = () => {
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [loadedUsers, setLoadedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const responseData = await sendRequest(
          '/api/users'
        );
        setLoadedUsers(responseData.users || []);
      } catch (err) {}
    };

    fetchUsers();
  }, [sendRequest]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return loadedUsers;
    }

    return loadedUsers.filter(user =>
      user.name.toLowerCase().includes(query)
    );
  }, [loadedUsers, searchTerm]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  );

  const visibleUsers = useMemo(() => {
    const firstUserIndex = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(
      firstUserIndex,
      firstUserIndex + USERS_PER_PAGE
    );
  }, [currentPage, filteredUsers]);

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />

      <section className="community-page">
        <header className="community-page__header">
          <div>
            <span>MyHikes community</span>
            <h1>Meet the explorers</h1>
            <p>
              Find people who share interesting places and browse their
              collections.
            </p>
          </div>

          <div className="community-page__count">
            <strong>{loadedUsers.length}</strong>
            <span>members</span>
          </div>
        </header>

        <div className="community-search">
          <span aria-hidden="true">&#128269;</span>
          <input
            type="search"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search by explorer name..."
            aria-label="Search explorers"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {isLoading && (
          <div className="community-page__loading">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && (
          <React.Fragment>
            <UsersList
              items={visibleUsers}
              emptyMessage="No explorers match this search."
            />

            {pageCount > 1 && (
              <nav className="community-pagination" aria-label="Pagination">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(page => page - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {pageCount}
                </span>

                <button
                  type="button"
                  disabled={currentPage === pageCount}
                  onClick={() => setCurrentPage(page => page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </React.Fragment>
        )}
      </section>
    </React.Fragment>
  );
};

export default Community;
