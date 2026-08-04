import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { AuthContext } from '../../context/auth-context';
import { API_URL, getAssetUrl } from '../../util/api';
import NotificationsMenu from './NotificationsMenu';
import './NavLinks.css';

const NavLinks = ({ onNavigate }) => {
  const auth = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!auth.userId) {
      setProfile(null);
      return undefined;
    }

    const controller = new AbortController();
    fetch(`${API_URL}/api/users/${auth.userId}/profile`, {
      signal: controller.signal,
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => data && setProfile(data.profile))
      .catch(() => {});

    return () => controller.abort();
  }, [auth.userId, auth.token]);

  useEffect(() => {
    const closeMenu = event => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const navigate = () => {
    setMenuOpen(false);
    if (onNavigate) onNavigate();
  };

  return (
    <ul className="nav-links">
      <li><NavLink to="/" exact className="nav-link" activeClassName="active" onClick={navigate}>Home</NavLink></li>
      <li><NavLink to="/community" className="nav-link" activeClassName="active" onClick={navigate}>Community</NavLink></li>
      <li><NavLink to="/explore" className="nav-link" activeClassName="active" onClick={navigate}>Explore</NavLink></li>

      {auth.isLoggedIn ? (
        <React.Fragment>
          <li className="nav-links__cta-item">
            <NavLink to="/places/new" className="nav-link nav-link--cta" onClick={navigate}>
              <span aria-hidden="true">+</span> Add place
            </NavLink>
          </li>
          <NotificationsMenu onNavigate={onNavigate} />
          <li className="nav-account" ref={accountRef}>
            <button
              type="button"
              className="nav-account__trigger"
              onClick={() => setMenuOpen(open => !open)}
              aria-expanded={menuOpen}
              aria-label="Open account menu"
            >
              {profile && profile.image ? (
                <img src={getAssetUrl(profile.image)} alt="" />
              ) : (
                <span className="nav-account__fallback">
                  {profile && profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
              <span className="nav-account__name">
                {profile && profile.name ? profile.name : 'Account'}
              </span>
              <span className={`nav-account__chevron ${menuOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
            </button>

            {menuOpen && (
              <div className="nav-account__menu">
                <div className="nav-account__menu-header">
                  <strong>{profile && profile.name ? profile.name : 'Your account'}</strong>
                  <span>Explorer</span>
                </div>
                <NavLink to={`/users/${auth.userId}`} onClick={navigate}>Profile</NavLink>
                <NavLink to={`/${auth.userId}/places`} onClick={navigate}>My places</NavLink>
                <NavLink to="/favorites" onClick={navigate}>Favorites</NavLink>
                <NavLink to="/settings" onClick={navigate}>Settings</NavLink>
                {profile && profile.role === 'admin' && (
                  <NavLink to="/moderation" onClick={navigate}>Moderation</NavLink>
                )}
                <button
                  type="button"
                  className="nav-account__logout"
                  onClick={() => {
                    navigate();
                    auth.logout();
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </li>
        </React.Fragment>
      ) : (
        <li className="nav-links__cta-item">
          <NavLink to="/auth" className="nav-link nav-link--cta" onClick={navigate}>Sign in</NavLink>
        </li>
      )}
    </ul>
  );
};

export default NavLinks;
