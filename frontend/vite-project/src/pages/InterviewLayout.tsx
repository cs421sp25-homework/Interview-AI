import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Flex, Layout, Menu, Button, ConfigProvider, theme } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, SoundOutlined, PlusOutlined} from '@ant-design/icons';
import { Bot } from 'lucide-react';
import type { ConfigProviderProps } from 'antd';

const { Header, Sider, Content } = Layout;

type SizeType = ConfigProviderProps['componentSize'];

const InterviewLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  
  const [size, setSize] = useState<SizeType>('large');

  const logs = [
    { id: 1, title: 'Interview 1 - John Doe', date: '2025-02-26', form: 'text' },
    { id: 2, title: 'Interview 2 - Jane Smith', date: '2025-02-25', form: 'voice' },
  ];

  // Map logs to Menu items. (Customize the icon as needed)
  const menuItems = logs.map((log) => ({
    key: log.id.toString(),
    icon: log.form === 'voice' ? <SoundOutlined /> : <UserOutlined />,
    label: `${log.title} - ${log.date}`,
  }));

  // Optionally, set the selected key based on the current URL
  const selectedKey =
    logs.find((log) =>
      location.pathname.includes(log.form === 'voice' ? 'voice' : 'text')
    )?.id.toString() || '1';

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
                <Button type="primary" block>
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
              if (selectedLog?.form === 'voice') {
                navigate('/interview/voice');
              } else {
                navigate('/interview/text');
              }
            }}
          />
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
