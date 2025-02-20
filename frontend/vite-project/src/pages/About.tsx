import styles from './About.module.css';

const About = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>About InterviewAI</h1>
        <p className={styles.text}>
          InterviewAI is your personal interview preparation assistant, powered by advanced artificial intelligence.
        </p>
        {/* Add more content as needed */}
      </div>
    </div>
  );
};

export default About; 