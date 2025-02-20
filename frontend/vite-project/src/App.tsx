import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import SignUpForm from './pages/SignUpForm';
import PromptPage from './pages/PromptPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/signup" element={<SignUpForm />} />
      <Route path="/prompts" element={<PromptPage />} />
    </Routes>
  );
}

export default App;