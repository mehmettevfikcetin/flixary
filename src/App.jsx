import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './components/Navbar';
import Login from './Login';
import Home from './Home';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Discover from './pages/Discover';
import MediaDetail from './pages/MediaDetail';
import './App.css';

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

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // Giriş yapılmamışsa Login sayfasına yönlendir
  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app">
        <Navbar user={user} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/lists" element={<Profile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/movies" element={<Discover type="movie" />} />
            <Route path="/series" element={<Discover type="tv" />} />
            <Route path="/movie/:id" element={<MediaDetail />} />
            <Route path="/tv/:id" element={<MediaDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;