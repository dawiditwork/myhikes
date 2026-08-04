import React, { useCallback, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Redirect,
  Switch
} from 'react-router-dom';

import Users from './user/pages/Users';
import Community from './user/pages/Community';
import NewPlace from './places/pages/NewPlace';
import UserPlaces from './places/pages/UserPlaces';
import UpdatePlace from './places/pages/UpdatePlace';
import ExplorePlaces from './places/pages/ExplorePlaces';
import PlaceDetails from './places/pages/PlaceDetails';
import FavoritePlaces from './places/pages/FavoritePlaces';
import Auth from './user/pages/Auth';
import VerifyEmail from './user/pages/VerifyEmail';
import UserProfile from './user/pages/UserProfile';
import AccountSettings from './user/pages/AccountSettings';
import Moderation from './user/pages/Moderation';
import MainNavigation from './shared/components/Navigation/MainNavigation';
import Footer from './shared/components/Footer/Footer';
import LegalPage from './shared/pages/LegalPage';
import { AuthContext } from './shared/context/auth-context';
import { useAuth } from './shared/hooks/auth-hook';
import { NotificationContext } from './shared/context/notification-context';
import Toast from './shared/components/UIElements/Toast';

const App = () => {
  const { token, login, logout, userId } = useAuth();
  const [notification, setNotification] = useState(null);
  const showNotification = useCallback((message, type = 'success') => setNotification({ message, type, id: Date.now() }), []);
  const closeNotification = useCallback(() => setNotification(null), []);

  let routes;

  if (token) {
    routes = (
      <Switch>
        <Route path="/" exact>
          <Users />
        </Route>

        <Route path="/explore" exact>
          <ExplorePlaces />
        </Route>

        <Route path="/community" exact>
          <Community />
        </Route>

        <Route path="/users/:userId" exact>
          <UserProfile />
        </Route>

        <Route path="/places/:placeId/details" exact>
          <PlaceDetails />
        </Route>

        <Route path="/favorites" exact>
          <FavoritePlaces />
        </Route>
        <Route path="/settings" exact>
          <AccountSettings />
        </Route>
        <Route path="/moderation" exact>
          <Moderation />
        </Route>

        <Route path="/terms" exact>
          <LegalPage type="terms" />
        </Route>

        <Route path="/privacy" exact>
          <LegalPage type="privacy" />
        </Route>

        <Route path="/:userId/places" exact>
          <UserPlaces />
        </Route>

        <Route path="/places/new" exact>
          <NewPlace />
        </Route>

        <Route path="/places/:placeId" exact>
          <UpdatePlace />
        </Route>

        <Redirect to="/" />
      </Switch>
    );
  } else {
    routes = (
      <Switch>
        <Route path="/" exact>
          <Users />
        </Route>

        <Route path="/explore" exact>
          <ExplorePlaces />
        </Route>

        <Route path="/community" exact>
          <Community />
        </Route>

        <Route path="/users/:userId" exact>
          <UserProfile />
        </Route>

        <Route path="/places/:placeId/details" exact>
          <PlaceDetails />
        </Route>

        <Route path="/:userId/places" exact>
          <UserPlaces />
        </Route>

        <Route path="/auth">
          <Auth />
        </Route>

        <Route path="/verify-email" exact>
          <VerifyEmail />
        </Route>

        <Route path="/terms" exact>
          <LegalPage type="terms" />
        </Route>

        <Route path="/privacy" exact>
          <LegalPage type="privacy" />
        </Route>

        <Redirect to="/auth" />
      </Switch>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        token,
        userId,
        login,
        logout
      }}
    >
      <NotificationContext.Provider value={{ showNotification }}>
        <Router>
          <MainNavigation />
          <Toast notification={notification} onClose={closeNotification} />
          <main>{routes}</main>
          <Footer />
        </Router>
      </NotificationContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;
