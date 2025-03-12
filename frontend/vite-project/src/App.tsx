import { Routes, Route } from 'react-router-dom';
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
import InterviewLayout from './pages/InterviewLayout';
import VoiceInterviewPage from './pages/VoiceInterviewPage';
import OnGoingVoice from './pages/OnGoingVoice';
import InterviewHistoryPage from './pages/InterviewHistoryPage';

function App() {
  return (
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


      <Route path="/interview" element={<InterviewLayout />}>
          {/* Default route for text interview */}
          <Route index element={<InterviewPage />} />
          <Route path="text" element={<InterviewPage />} />
          <Route path="text/:id" element={<InterviewPage />} />
          <Route path="voice" element={<VoiceInterviewPage />} />
          <Route path="voice/:id" element={<VoiceInterviewPage />} />
          <Route path="voice/ongoing" element={<OnGoingVoice />} />
          <Route path="history" element={<InterviewHistoryPage />} />
      </Route>
    </Routes>
  );
}

export default App;