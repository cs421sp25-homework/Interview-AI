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
// import OnGoingVoice from './pages/OnGoingVoice';
import VoiceInterviewPage from './pages/VoiceInterviewPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import InterviewLogViewPage from './pages/InterviewLogViewPage';
import FavoriteQuestionsPage from './pages/FavoriteQuestionsPage';
import VoiceInterviewLogPage from './pages/VoiceInterviewLogPage';

import EloScorePage from './pages/EloScorePage';
import FlashcardsPage from './pages/FlashcardsPage';
import FlashcardsSelectionPage from './pages/FlashcardsSelectionPage';
import GraphPage from './pages/GraphPage';
import WeakestQuestionsPage from './pages/WeakestQuestionsPage';

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

      <Route path="/interview/text" element={<InterviewPage />} />
      <Route path="/interview/voice" element={<VoiceInterviewPage />} />
      <Route path="/interview/history" element={<InterviewHistoryPage />} />
      <Route path="/interview/view/:id" element={<InterviewLogViewPage />} />
      <Route path="/favorites" element={<FavoriteQuestionsPage />} />
      <Route path="/voice/interview/view/:id" element={<VoiceInterviewLogPage />} />
      <Route path="/elo" element={<EloScorePage />} />
      <Route path="/flashcards" element={<FlashcardsSelectionPage />} />
      <Route path="/flashcards/favorites" element={<FlashcardsPage mode="favorites" />} />
      <Route path="/flashcards/weakest" element={<FlashcardsPage mode="weakest" />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/weakest" element={<WeakestQuestionsPage />} />
    </Routes>
  );
}

export default App;