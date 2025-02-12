import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import axios from 'axios';
import './App.css';

type Profile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  website: string;
};

const App = () => {
  const [count, setCount] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/profile');
        setProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    
    fetchProfile();
  }, []);

  return (
    <div className="container">
      {/* Animated Hello World */}
      <div className="hello-section">
        <div className="hello-world">
          <span>H</span>
          <span>e</span>
          <span>l</span>
          <span>l</span>
          <span>o</span>
          <span>&nbsp;</span>
          <span>W</span>
          <span>o</span>
          <span>r</span>
          <span>l</span>
          <span>d</span>
          <span>!</span>
        </div>
      </div>


      {/* Counter Section */}
      <div className="counter-section">
        <div className="counter-display">{count}</div>
        <div className="counter-controls">
          <button 
            onClick={() => setCount(prev => prev - 1)}
            className="counter-button decrease"
          >
            -
          </button>
          <button 
            onClick={() => setCount(prev => prev + 1)}
            className="counter-button increase"
          >
            +
          </button>
        </div>
        <div className="counter-info">
          Edit <code>src/App.tsx</code> and save to test HMR
        </div>
      </div>

      {/* Profile Section */}
      {profile && (
        <div className="profile-section">
          <h2 className="profile-title">Backend Profile Test</h2>
          <div className="profile-cards">
            <div className="profile-card">
              <div className="card-label">Name</div>
              <div className="card-value">{profile.name}</div>
            </div>
            
            <div className="profile-card">
              <div className="card-label">Email</div>
              <div className="card-value">{profile.email}</div>
            </div>
            
            {profile.phone && (
              <div className="profile-card">
                <div className="card-label">Phone</div>
                <div className="card-value">{profile.phone}</div>
              </div>
            )}
            
            {profile.website && (
              <div className="profile-card">
                <div className="card-label">Website</div>
                <div className="card-value">{profile.website}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Explore more by clicking on the logos above</p>
      </footer>
    </div>
  );
};

export default App;