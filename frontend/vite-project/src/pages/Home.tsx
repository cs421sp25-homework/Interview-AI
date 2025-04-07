import { ReactNode } from 'react';
import { Bot, Briefcase, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

interface ButtonProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'ghost';
  onClick?: () => void;
}

const Button = ({ children, className, variant = 'primary', onClick }: ButtonProps) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => {
  return (
    <div className={`${styles.card} ${className || ''}`}>
      {children}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();

  const safeNavigate = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      console.error('Navigation failed:', error);
      alert('Something went wrong navigating to that page. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <Bot className={styles.logoIcon} />
            <span className={styles.logoText}>InterviewAI</span>
          </div>
          <div className={styles.navLinks}>
            <Button variant="ghost">About</Button>
            <Button variant="ghost">Features</Button>
            <Button variant="ghost">Pricing</Button>
            <Button
            onClick={() => navigate('/signup')}
            >Get Started</Button>
            <Button onClick={() => navigate('/login')}>Log In</Button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Ace Your Next Interview with AI</h1>
        <p className={styles.heroText}>
          Practice interviews with our intelligent AI assistant and get real-time feedback
          to improve your performance.
        </p>
        <Button
          className={styles.heroButton}
          onClick={() => safeNavigate('/signup')}
        >
          Start Practicing Now
        </Button>
      </div>

      {/* FEATURES */}
      <div className={styles.features}>
        <div className={styles.featureGrid}>
          <Card>
            <Bot className={styles.featureIcon} />
            <h3 className={styles.featureTitle}>AI-Powered Interviews</h3>
            <p className={styles.featureText}>
              Experience realistic interviews with our advanced AI that adapts to your responses.
            </p>
          </Card>

          <Card>
            <Star className={styles.featureIcon} />
            <h3 className={styles.featureTitle}>Personalized Feedback</h3>
            <p className={styles.featureText}>
              Get detailed feedback on your responses, body language, and communication style.
            </p>
          </Card>

          <Card>
            <Briefcase className={styles.featureIcon} />
            <h3 className={styles.featureTitle}>Industry-Specific</h3>
            <p className={styles.featureText}>
              Practice with questions tailored to your industry and experience level.
            </p>
          </Card>
        </div>
      </div>

      {/* STATS */}
      <div className={styles.stats}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>10,000+</div>
            <div className={styles.statLabel}>Successful Interviews</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>95%</div>
            <div className={styles.statLabel}>Success Rate</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>50+</div>
            <div className={styles.statLabel}>Industry Templates</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Bot className={styles.footerIcon} />
              <span className={styles.footerLogo}>InterviewAI</span>
              <p className={styles.footerText}>
                Empowering job seekers with AI-powered interview preparation.
              </p>
            </div>
            <div className={styles.footerLinks}>
              <h4>Product</h4>
              <ul>
                <li>Features</li>
                <li>Pricing</li>
                <li>Enterprise</li>
              </ul>
            </div>
          </div>
          <div className={styles.copyright}>
            © 2025 InterviewAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
