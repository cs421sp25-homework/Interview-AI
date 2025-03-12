import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Flex, Layout, Menu, Button, ConfigProvider, theme, Input, Modal, Form, message, Tag, Space, Select} from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, SoundOutlined, PlusOutlined, SettingOutlined, HistoryOutlined} from '@ant-design/icons';
import { Bot, Plus, X, Play} from 'lucide-react';
import type { ConfigProviderProps } from 'antd';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import './InterviewLayout.css';
import './ConfigModal.css';

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

type SizeType = ConfigProviderProps['componentSize'];


interface Config {
  id: string;
  interview_name: string;
  job_description?: string;
  email: string;
  interview_type: 'voice' | 'text';
  company_name: string;
  question_type: string;
}

const InterviewLayout: React.FC = () => {
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [createConfigModalVisible, setCreateConfigModalVisible] = useState(false);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();
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

  useEffect(() => {
    const savedLogs = localStorage.getItem('interview_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error('Error parsing logs from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('interview_logs', JSON.stringify(logs));
  }, [logs]);

  const fetchConfigurations = async () => {
    try {
      console.log("fetching configurations")
      const userEmail = localStorage.getItem('user_email') || ''; 
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

  const showCreateConfigModal = () => {
    configForm.resetFields();
    setCreateConfigModalVisible(true);
  };

  const handleMoveBack = () => {
    navigate("/dashboard")
  };

  const handleOk = async () => {
    if (!selectedConfigId) {
      message.warning('Please select a configuration');
      return;
    }
    
    // Find the selected configuration
    const selectedConfig = configs.find((config) => config.id === selectedConfigId);
    if (!selectedConfig) {
      message.error('Configuration not found');
      return;
    }
    
    const config_name = selectedConfig.interview_name || "default_config";
    localStorage.setItem("current_config", config_name);
    
    console.log("Modal: current_config set to:", config_name);
    
    // 显示加载状态
    message.loading('Starting interview...', 0.5);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/new_chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: localStorage.getItem('user_email') || '', 
          name: config_name
        }), 
      });

      if (!res.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await res.json();
      
      const newLog = {
        id: logs.length + 1,
        title: selectedConfig.interview_name,
        date: new Date().toISOString(),
        form: selectedConfig.interview_type,
        thread_id: data.thread_id 
      };

      setLogs([...logs, newLog]);
      setActiveConversationId(newLog.id.toString());

      if (selectedConfig.interview_type === 'voice') {
        navigate('/interview/voice/ongoing');
      } else {
        navigate('/interview/text');
      }

      setModalVisible(false);
      setSelectedConfigId(null);
      
      message.success('Interview started successfully!');
    } catch (error) {
      console.error('Error starting interview:', error);
      message.error('Failed to start interview. Please try again.');
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setSelectedConfigId(null);
  };

  const handleCreateConfigCancel = () => {
    setCreateConfigModalVisible(false);
  };

  const handleCreateConfig = async (values: any) => {
    try {
      const userEmail = localStorage.getItem('user_email') || '';
      
      const configData = {
        interview_name: values.interview_name,
        company_name: values.company_name,
        job_description: values.job_description,
        question_type: values.question_type,
        interview_type: values.interview_type,
        email: userEmail
      };
      
      message.loading('Creating configuration...', 0.5);
      
      const response = await axios.post(`${API_BASE_URL}/api/create_interview_config`, configData);
      
      if (response.status === 200) {
        message.success('Interview configuration created successfully!');
        fetchConfigurations();
      } else {
        message.error('Failed to create configuration. Please try again.');
      }
    } catch (error) {
      console.error("Error creating interview config:", error);
      message.error('Failed to create interview configuration. Please try again.');
    }
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ec4899',
          colorLink: '#ec4899',
          colorLinkHover: '#db2777',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider trigger={null} collapsible collapsed={collapsed} className="interview-sider">
          <div className="history-title">
            {collapsed ? 'H' : 'History'}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showModal}
            className="add-button"
          >
            {collapsed ? '' : 'New Interview'}
          </Button>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            className="interview-menu"
            onClick={(info) => {
              const selectedLog = logs.find((log) => log.id.toString() === info.key);
              setActiveConversationId(info.key);

              const config_name = selectedLog?.title || "default_config";
              localStorage.setItem("current_config", config_name);
              console.log("Menu: current_config set to:", config_name);

              if (selectedLog?.form === 'voice') {
                navigate(`/interview/voice/${info.key}`);
              } else {
                navigate(`/interview/text/${info.key}`);
              }
            }}
          />
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
            <div className="header-container">
              <Bot size={32} color="#ec4899" />
              <h1 className="app-title">InterviewAI</h1>
            </div>
            <Button
              type="default"
              icon={<HistoryOutlined />}
              onClick={() => navigate('/interview/history')}
              className="history-button"
              style={{ marginRight: '10px' }}
            >
              Interview History
            </Button>
            <Button
              type="default"
              icon={<SettingOutlined />}
              onClick={() => navigate('/prompts')}
              className="manage-config-button"
              style={{ marginRight: '10px' }}
            >
              Manage Interview Configs
            </Button>
            <Button
              type="primary"
              onClick={handleMoveBack}
              className="back-button"
              style={{ marginRight: '20px' }}
            >
              Back to Dashboard
            </Button>
          </Header>
          <Content
            className="main-content"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>

        <Modal
          title={null}
          open={modalVisible}
          onCancel={handleCancel}
          width={700}
          footer={null}
          className="config-modal"
          closeIcon={null}
        >
          <button className="closeButton" onClick={handleCancel} style={{ top: '15px' }}>
            <X size={20} />
          </button>
          <h2 className="modalTitle">Select a Configuration</h2>
          <p className="modal-instruction">
            Select a configuration and click "Confirm"
          </p>
          
          {configs.length > 0 ? (
            <div className="configList">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`configButton ${selectedConfigId === config.id ? 'configButtonSelected' : ''}`}
                  onClick={() => {
                    setSelectedConfigId(config.id);
                  }}
                >
                  <div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{config.interview_name}</h3>
                    <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                      <p><strong>Company:</strong> {config.company_name}</p>
                      <p><strong>Question Type:</strong> {config.question_type}</p>
                      <p><strong>Interview Type:</strong> {config.interview_type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'gray', margin: '20px 0' }}>
              No configurations found. Please use the "Create Config" button in the top right corner to create a configuration first.
            </p>
          )}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'space-between' }}>
            <button 
              className="buttonPrimary" 
              style={{ flex: 1, margin: 0 }}
              onClick={handleCancel}
            >
              Cancel
            </button>
            
            <button 
              className="buttonPrimary" 
              style={{ 
                flex: 1, 
                margin: 0,
                opacity: selectedConfigId ? 1 : 0.5,
                cursor: selectedConfigId ? 'pointer' : 'not-allowed'
              }}
              onClick={handleOk}
              disabled={!selectedConfigId}
            >
              Confirm
            </button>
          </div>
        </Modal>

        <Modal
          open={createConfigModalVisible}
          onCancel={handleCreateConfigCancel}
          footer={null}
          width={600}
          className="config-modal"
          closeIcon={null}
        >
          <button className="closeButton" onClick={handleCreateConfigCancel}>
            <X size={20} />
          </button>
          <h2 className="modalTitle">Customize Your Interview</h2>
          <Form
            form={configForm}
            layout="vertical"
            initialValues={{
              interview_type: 'text',
              question_type: 'behavioral'
            }}
            onFinish={(values) => {
              // 立即关闭窗口
              setCreateConfigModalVisible(false);
              
              // 然后在后台处理保存逻辑
              handleCreateConfig(values);
            }}
            className="formCard"
          >
            <div className="formGroup">
              <label className="formLabel">
                Interview Name <span className="required">*</span>
              </label>
              <Form.Item
                name="interview_name"
                rules={[{ required: true, message: 'Please enter interview name' }]}
                style={{ marginBottom: '0' }}
              >
                <Input 
                  placeholder="Enter interview session name" 
                  size="large" 
                  className="formInput"
                />
              </Form.Item>
            </div>
            
            <div className="formGroup">
              <label className="formLabel">
                Company Name <span className="required">*</span>
              </label>
              <Form.Item
                name="company_name"
                rules={[{ required: true, message: 'Please enter company name' }]}
                style={{ marginBottom: '0' }}
              >
                <Input 
                  placeholder="Enter the company name" 
                  size="large" 
                  className="formInput"
                />
              </Form.Item>
            </div>
            
            <div className="formGroup">
              <label className="formLabel">
                Job Description <span className="optional">(optional)</span>
              </label>
              <Form.Item
                name="job_description"
                style={{ marginBottom: '0' }}
              >
                <TextArea 
                  placeholder="Enter the job description" 
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  size="large"
                  className="formInput"
                />
              </Form.Item>
            </div>
            
            <div className="formGroup">
              <label className="formLabel">
                Question Type <span className="required">*</span>
              </label>
              <Form.Item
                name="question_type"
                rules={[{ required: true, message: 'Please select question type' }]}
                style={{ marginBottom: '0' }}
              >
                <Select 
                  size="large" 
                  popupClassName="select-dropdown"
                  dropdownStyle={{ zIndex: 1100 }}
                >
                  <Option value="behavioral">Behavioral</Option>
                  <Option value="technical">Technical</Option>
                </Select>
              </Form.Item>
            </div>
            
            <div className="formGroup">
              <label className="formLabel">
                Interview Type <span className="required">*</span>
              </label>
              <Form.Item
                name="interview_type"
                rules={[{ required: true, message: 'Please select interview type' }]}
                style={{ marginBottom: '0' }}
              >
                <Select 
                  size="large" 
                  popupClassName="select-dropdown"
                  dropdownStyle={{ zIndex: 1100 }}
                >
                  <Option value="text">Text</Option>
                  <Option value="voice">Voice</Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item>
              <button 
                type="submit"
                className="buttonPrimary"
              >
                Save Configuration
              </button>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default InterviewLayout;
