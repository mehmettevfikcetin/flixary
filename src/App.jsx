import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './Login';
import Home from './Home';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Discover from './pages/Discover';
import MediaDetail from './pages/MediaDetail';
import Settings from './pages/Settings';
import CustomListDetail from './pages/CustomListDetail';
import UserSearch, { UserProfile, UserProfileByUsername } from './pages/UserSearch';
import { ToastContainer } from './components/Toast';
import './App.css';

// Sayfa değiştiğinde en üste scroll
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children, user, loading }) {
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show loading spinner while Firebase auth state is being determined
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="app">
        <Navbar user={user} />
        <main className="main-content">
          <Routes>
            {/* Public Routes - accessible without login */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/search" element={<Search />} />
            <Route path="/movies" element={<Discover type="movie" />} />
            <Route path="/series" element={<Discover type="tv" />} />
            <Route path="/movie/:id" element={<MediaDetail />} />
            <Route path="/tv/:id" element={<MediaDetail />} />
            <Route path="/users" element={<UserSearch />} />
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/u/:username" element={<UserProfileByUsername />} />
            
            {/* Protected Routes - require authentication */}
            <Route path="/profile" element={
              <ProtectedRoute user={user} loading={loading}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/lists" element={
              <ProtectedRoute user={user} loading={loading}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/list/:listId" element={
              <ProtectedRoute user={user} loading={loading}>
                <CustomListDetail />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute user={user} loading={loading}>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;