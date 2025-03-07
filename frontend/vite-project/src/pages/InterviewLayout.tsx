import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Flex, Layout, Menu, Button, ConfigProvider, theme, Input, Modal, Form, message, Tag, Space} from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, SoundOutlined, PlusOutlined} from '@ant-design/icons';
import { Bot} from 'lucide-react';
import type { ConfigProviderProps } from 'antd';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const { Header, Sider, Content } = Layout;

type SizeType = ConfigProviderProps['componentSize'];

// Define a type for configuration
interface Config {
  id: string;
  name: string;
  description?: string;
  email: string;
  interview_type: 'voice' | 'text';
}

const InterviewLayout: React.FC = () => {
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  
  const [size, setSize] = useState<SizeType>('large');

  const [logs, setLogs] = useState([
    { id: 1, title: 'Interview 1 - John Doe', date: '2025-02-26', form: 'text' },
    { id: 2, title: 'Interview 2 - Jane Smith', date: '2025-02-25', form: 'voice' },
  ]);

  const fetchConfigurations = async () => {
    try {
      console.log("fetching configurations")
      const userEmail = localStorage.getItem('user_email') || 'ericeason2003@gmail.com'; // Assuming email is stored in localStorage
      console.log("userEmail: ", userEmail)
      const response = await axios.get(`${API_BASE_URL}/api/config/${userEmail}`);
      
      if (response.status !== 200) {
        throw new Error('Failed to fetch configurations');
      }
      
      const data = response.data;
      setConfigs(data.data || []);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      message.error('Failed to load configurations');
    }
  };

  const showModal = () => {
    fetchConfigurations();
    setModalVisible(true);
  };

  const handleOk = () => {
    if (!selectedConfigId) {
      message.warning('Please select a configuration');
      return;
    }
    
    
    console.log('Selected configuration ID:', selectedConfigId);
    
    const selectedConfig = configs.find((config) => config.id === selectedConfigId);
    if (!selectedConfig) {
      message.error('Configuration not found');
      return;
    }

    const newLog = {
      id: logs.length + 1,
      title: selectedConfig.name,
      date: new Date().toISOString(),
      form: selectedConfig.interview_type,
    };

    setLogs([...logs, newLog]);

    setActiveConversationId(newLog.id.toString());

    if (selectedConfig.interview_type === 'voice') {
      navigate('/interview/voice/ongoing');
    } else {
      navigate('/interview/text');
    }


    
    // Close the modal
    setModalVisible(false);
    setSelectedConfigId(null);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setSelectedConfigId(null);
  };

  const handleMenuClick = (e: { key: string }) => {
    setSelectedConfigId(e.key);
  };

  const menuItems = logs.map((log) => ({
    key: log.id.toString(),
    icon: log.form === 'voice' ? <SoundOutlined /> : <UserOutlined />,
    label: `${log.title} - ${log.date}`,
  }));

  const computedSelectedKey =
  logs.find((log) => location.pathname.includes(log.form === 'voice' ? 'voice' : 'text'))?.id.toString() || '1';


  const selectedKey = activeConversationId || computedSelectedKey;


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
                itemColor: 'white',
                itemSelectedColor: 'white',
                itemSelectedBg: '#c12767',
                itemHoverBg: '#d0487e',
                itemDisabledColor: 'rgba(255, 255, 255, 0.5)',
                itemHoverColor: 'rgba(255, 255, 255, 0.7)',
              },
              Button: {
                colorPrimary: 'rgba(255, 255, 255, 0.28)', 
                colorPrimaryHover: 'rgba(255, 255, 255, 0.18)', 
                colorPrimaryText: 'black',
                colorPrimaryActive: 'rgba(255, 255, 255, 0.5)', 
                textHoverBg: 'rgba(255, 255, 255, 0.5)', 
                colorText: 'black'
              }
            },
          }}
        >

          
          <Flex vertical gap="big" style={{ width: '80%', margin: '0 auto', alignItems: 'center',}}>
                <Button type="primary" block onClick={showModal}>
                    Add
                </Button>
          </Flex>

          

          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ background: '#ec4899' }}
            onClick={(info) => {
              const selectedLog = logs.find((log) => log.id.toString() === info.key);
              setActiveConversationId(info.key);
              if (selectedLog?.form === 'voice') {
                navigate('/interview/voice');
              } else {
                navigate('/interview/text');
              }
            }}
          />
        </ConfigProvider>

        <ConfigProvider
          theme={{
            components: {
              Button: {
                colorPrimary: 'rgba(209, 123, 123, 0.82)',
                colorPrimaryHover: 'rgba(209, 123, 123, 1.0)',
                colorPrimaryActive: 'rgba(209, 123, 123, 0.82)',
              },
            },
          }}
        >
        <Modal
          title="Select a Configuration"
          open={modalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          okButtonProps={{ disabled: !selectedConfigId }}
        >
          {configs.length > 0 ? (
            <Space wrap>
              {configs.map((config) => (
                <Button
                  key={config.id}
                  type={selectedConfigId === config.id ? "primary" : "default"}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 12px',
                    fontSize: '14px',
                    margin: '4px'
                  }}
                  onClick={() => setSelectedConfigId(config.id)}
                >
                  {config.name || `Configuration ${config.id}`}
                </Button>
              ))}
            </Space>
          ) : (
            <p style={{ textAlign: 'center', color: 'gray' }}>
              No configurations found. Create a configuration first.
            </p>
          )}
        </Modal>
        </ConfigProvider>
        
      </Sider>
      <Layout>
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
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default InterviewLayout;
