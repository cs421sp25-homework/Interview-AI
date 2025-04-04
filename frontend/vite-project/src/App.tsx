import { Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import About from './pages/About';
import SignUpForm from './pages/SignUpForm';
import PromptPage from './pages/PromptPage';
import UserDashboard from './pages/UserDashboard';
import InterviewPage from './pages/InterviewPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import OAuthSignUpForm from './pages/OAuthSignUpForm';
// import SignUpFormOauth from './pages/SignUpFormOauth';
import 'antd/dist/reset.css';
import VoiceInterviewPage from './pages/VoiceInterviewPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import InterviewLogViewPage from './pages/InterviewLogViewPage';
import { ClerkAuthSync } from './components/ClerkAuthSync';

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_your_fallback_key';

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AuthProvider>
        <ClerkAuthSync />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/signup-oauth" element={<OAuthSignUpForm />} />
          <Route path="/prompts" element={<PromptPage />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/interview/text" element={<InterviewPage />} />
          <Route path="/interview/voice" element={<VoiceInterviewPage />} />
          <Route path="/interview/history" element={<InterviewHistoryPage />} />
          <Route path="/interview/view/:id" element={<InterviewLogViewPage />} />
        </Routes>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;