import React, { useState } from 'react';
import { Bot, Plus, Trash2, Save, MessageSquare, Sparkles, Settings } from 'lucide-react';
import styles from './PromptPage.module.css';

interface Prompt {
  id: number;
  text: string;
}

interface Settings {
  followUp: boolean;
  technical: boolean;
  behavioral: boolean;
  feedback: boolean;
}

const PromptPage = () => {
  const [activeTab, setActiveTab] = useState('custom');
  const [customPrompts, setCustomPrompts] = useState<Prompt[]>([
    { id: 1, text: 'Tell me about your experience with project management.' },
    { id: 2, text: 'How do you handle difficult team dynamics?' }
  ]);
  const [newPrompt, setNewPrompt] = useState('');
  const [settings, setSettings] = useState<Settings>({
    followUp: true,
    technical: true,
    behavioral: true,
    feedback: true
  });

  const handleAddPrompt = () => {
    if (newPrompt.trim()) {
      setCustomPrompts([
        ...customPrompts,
        { id: Date.now(), text: newPrompt.trim() }
      ]);
      setNewPrompt('');
    }
  };

  const handleDeletePrompt = (id: number) => {
    setCustomPrompts(customPrompts.filter(prompt => prompt.id !== id));
  };

  const promptTemplates = [
    {
      title: 'Technical Interview',
      description: 'Focus on technical skills and problem-solving abilities',
      prompts: [
        'Explain a challenging technical problem you solved',
        'Walk me through your development process',
        'How do you ensure code quality?'
      ]
    },
    {
      title: 'Leadership Interview',
      description: 'Assess leadership and management capabilities',
      prompts: [
        'Describe your leadership style',
        'How do you motivate your team?',
        'Tell me about a successful project you led'
      ]
    },
    {
      title: 'Behavioral Interview',
      description: 'Evaluate past experiences and behavior patterns',
      prompts: [
        'Tell me about a time you failed',
        'How do you handle conflicts?',
        'Describe a successful collaboration'
      ]
    }
  ];

  return (
    <div>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <Bot size={32} color="#ec4899" />
            <span className={styles.logoText}>InterviewAI</span>
          </div>
        </div>
      </nav>

      <div className={styles.promptContainer}>
        <div className={styles.promptHeader}>
          <h1>Customize Your Interview</h1>
          <p>Create and manage interview prompts to personalize your practice session</p>
        </div>

        <div className={styles.promptTabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'custom' ? styles.active : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            <MessageSquare size={20} />
            Custom Prompts
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'templates' ? styles.active : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <Sparkles size={20} />
            Templates
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Settings
          </button>
        </div>

        {activeTab === 'custom' && (
          <div className={styles.promptCard}>
            <div style={{ marginBottom: '2rem' }}>
              <textarea
                className={styles.promptInput}
                placeholder="Enter your custom interview prompt..."
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                rows={3}
              />
              <button className={styles.buttonPrimary} onClick={handleAddPrompt}>
                <Plus size={20} />
                Add Prompt
              </button>
            </div>

            <div className={styles.promptList}>
              {customPrompts.map(prompt => (
                <div key={prompt.id} className={styles.promptItem}>
                  <div>{prompt.text}</div>
                  <div className={styles.promptActions}>
                    <button className={styles.iconButton} onClick={() => handleDeletePrompt(prompt.id)}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className={styles.promptCard}>
            <h2>Interview Templates</h2>
            <p>Select a template to load pre-defined interview prompts</p>
            
            <div className={styles.promptTemplates}>
              {promptTemplates.map((template, index) => (
                <div key={index} className={styles.templateCard}>
                  <h3>{template.title}</h3>
                  <p>{template.description}</p>
                  <button className={styles.buttonPrimary} style={{ marginTop: '1rem' }}>
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.promptCard}>
            <h2>Interview Settings</h2>
            <p>Customize your interview experience</p>

            <div className={styles.settingsGrid}>
              <div className={styles.settingItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>Follow-up Questions</h3>
                    <p>Allow AI to ask follow-up questions</p>
                  </div>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={settings.followUp}
                      onChange={() => setSettings({ ...settings, followUp: !settings.followUp })}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>

              <div className={styles.settingItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>Technical Questions</h3>
                    <p>Include technical assessment questions</p>
                  </div>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={settings.technical}
                      onChange={() => setSettings({ ...settings, technical: !settings.technical })}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>

              <div className={styles.settingItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>Behavioral Questions</h3>
                    <p>Include behavioral assessment questions</p>
                  </div>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={settings.behavioral}
                      onChange={() => setSettings({ ...settings, behavioral: !settings.behavioral })}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>

              <div className={styles.settingItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>Real-time Feedback</h3>
                    <p>Receive feedback during the interview</p>
                  </div>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={settings.feedback}
                      onChange={() => setSettings({ ...settings, feedback: !settings.feedback })}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptPage;