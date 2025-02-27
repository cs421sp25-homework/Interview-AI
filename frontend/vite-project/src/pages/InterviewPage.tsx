import React, { useState } from 'react';
import { Bot, Mic, MicOff, Send } from 'lucide-react';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Menu, Button, theme } from 'antd';
import styles from './InterviewPage.module.css';
import { ConfigProvider } from 'antd';


const { Header, Sider, Content } = Layout;

const InterviewPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  
  const logs = [
    { id: 1, title: 'Interview 1 - John Doe', date: '2025-02-26' },
    { id: 2, title: 'Interview 2 - Jane Smith', date: '2025-02-25' },
  ];

  // Chat messages (the interview content)
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'ai' }>>([
    {
      text: "Hello! I'm Sarah, your interviewer today. Shall we begin with you introducing yourself?",
      sender: 'ai',
    },
  ]);

  // User input and microphone recording state
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  
  const menuItems = logs.map((log) => ({
    key: log.id.toString(),
    icon: <UserOutlined />,
    label: `${log.date}`,
  }));

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { text: input, sender: 'user' }]);
    const userInput = input;
    setInput('');
    try {
      const res = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, threadId: 'default_thread' }),
      });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { text: data.response, sender: 'ai' }]);
    } catch (error) {
      console.error('Error processing chat:', error);
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      
      <Sider trigger={null} collapsible collapsed={collapsed} style={{ background: '#ec4899' }}>
        <div
          style={{
            margin: '16px',
            textAlign: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          History
        </div>
        <ConfigProvider
          theme={{
          components: {
          Menu: {
            itemColor: "white", 
            itemSelectedColor: "white", 
            itemSelectedBg: "#c12767", 
            itemHoverBg: "#d0487e", 
            itemDisabledColor: "rgba(255, 255, 255, 0.5)", 
            itemHoverColor: "rgba(255, 255, 255, 0.7)", 
            
          },
            },
        }}
          >
        <Menu
          mode="inline"
          defaultSelectedKeys={['1']}
          items={menuItems}
          style={{ background: '#ec4899' }}
        />
      </ConfigProvider>
      </Sider>
      <Layout>
        {/* Header with collapse button and centered InterviewAI logo/text */}
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Bot size={32} color="#ec4899" />
            <h1 style={{ margin: 0, color: '#ec4899', fontSize: '24px' }}>InterviewAI</h1>
          </div>
        </Header>

        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 112px)', 
          }}
        >
          
          <div style={{ flex: 1, overflowY: 'auto' }} className={styles.chatContainer}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.sender === 'ai' ? styles.aiMessage : styles.userMessage
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your response..."
              className={styles.input}
            />
            <button
              className={styles.micButton}
              onClick={() => setIsRecording(!isRecording)}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button className={styles.sendButton} onClick={handleSend}>
              <Send size={20} />
            </button>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default InterviewPage;