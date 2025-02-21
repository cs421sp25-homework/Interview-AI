import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import SignUpForm from './pages/SignUpForm';
import PromptPage from './pages/PromptPage';
import UserDashboard from './pages/UserDashboard';
import InterviewPage from './pages/InterviewPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/signup" element={<SignUpForm />} />
      <Route path="/prompts" element={<PromptPage />} />
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/interview" element={<InterviewPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;