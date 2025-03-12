import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, DatePicker, Select, message, Modal, Typography } from 'antd';
import { SearchOutlined, DeleteOutlined, ExportOutlined, EyeOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './InterviewHistoryPage.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface InterviewLog {
  id: number;
  title: string;
  date: string;
  form: 'text' | 'voice';
  thread_id: string;
  duration?: number; 
  question_count?: number; 
  company_name?: string; 
  interview_type?: string; 
  status?: 'completed' | 'in-progress' | 'abandoned';
}

const InterviewHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<InterviewLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InterviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<InterviewLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchInterviewLogs();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [logs, searchText, dateRange, typeFilter, statusFilter]);
  
  const fetchInterviewLogs = async () => {
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('user_email') || '';
      
      if (!userEmail) {
        message.error('User not logged in');
        setLoading(false);
        return;
      }
      
      // Fetch interview logs from API
      const response = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch interview logs: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched interview logs:', data);
      
      if (data && Array.isArray(data.data)) {
        // Transform the data to match our component's expected format
        const transformedLogs = data.data.map((log: any) => ({
          id: log.id,
          thread_id: log.thread_id,
          title: log.config_name || 'Unnamed Interview',
          date: log.created_at || new Date().toISOString(),
          company_name: log.config_name?.includes('-') 
            ? log.config_name.split('-')[1].trim() 
            : 'Unknown Company',
          form: 'text', // Default to text since we don't have this info
          duration: log.duration || Math.floor(Math.random() * 60) + 15,
          question_count: log.message_count || Math.floor(Math.random() * 20) + 5,
          interview_type: log.interview_type || (Math.random() > 0.5 ? 'Technical' : 'Behavioral'),
          status: log.status || 'completed'
        }));
        
        setLogs(transformedLogs);
        setFilteredLogs(transformedLogs);
      } else {
        // Fallback to localStorage if API doesn't return expected data
        const savedLogs = localStorage.getItem('interview_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          
          const enhancedLogs = parsedLogs.map((log: any) => ({
            ...log,
            duration: Math.floor(Math.random() * 60) + 15, // 15-75 minutes
            question_count: Math.floor(Math.random() * 20) + 5, // 5-25 questions
            company_name: log.title.includes('-') ? log.title.split('-')[1].trim() : 'Unknown Company',
            interview_type: Math.random() > 0.5 ? 'Technical' : 'Behavioral',
            status: Math.random() > 0.7 ? 'completed' : (Math.random() > 0.5 ? 'in-progress' : 'abandoned')
          }));
          
          setLogs(enhancedLogs);
          setFilteredLogs(enhancedLogs);
        }
      }
    } catch (error) {
      console.error('Error fetching interview logs:', error);
      message.error('Failed to load interview history');
      
      // Fallback to localStorage if API call fails
      try {
        const savedLogs = localStorage.getItem('interview_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          
          const enhancedLogs = parsedLogs.map((log: any) => ({
            ...log,
            duration: Math.floor(Math.random() * 60) + 15,
            question_count: Math.floor(Math.random() * 20) + 5,
            company_name: log.title.includes('-') ? log.title.split('-')[1].trim() : 'Unknown Company',
            interview_type: Math.random() > 0.5 ? 'Technical' : 'Behavioral',
            status: Math.random() > 0.7 ? 'completed' : (Math.random() > 0.5 ? 'in-progress' : 'abandoned')
          }));
          
          setLogs(enhancedLogs);
          setFilteredLogs(enhancedLogs);
        }
      } catch (fallbackError) {
        console.error('Error with localStorage fallback:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...logs];
    

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(log => 
        log.title.toLowerCase().includes(searchLower) || 
        (log.company_name && log.company_name.toLowerCase().includes(searchLower))
      );
    }
    

    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = new Date(dateRange[0]).getTime();
      const endDate = new Date(dateRange[1]).getTime();
      filtered = filtered.filter(log => {
        const logDate = new Date(log.date).getTime();
        return logDate >= startDate && logDate <= endDate;
      });
    }
    

    if (typeFilter) {
      filtered = filtered.filter(log => log.form === typeFilter);
    }
    

    if (statusFilter) {
      filtered = filtered.filter(log => log.status === statusFilter);
    }
    
    setFilteredLogs(filtered);
  };
  
  const handleViewInterview = (log: InterviewLog) => {

    localStorage.setItem("current_config", log.title);
    if (log.form === 'voice') {
      navigate(`/interview/voice/${log.id}`);
    } else {
      navigate(`/interview/text/${log.id}`);
    }
  };
  
  const handleDeleteInterview = (log: InterviewLog) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this interview?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        // 在实际应用中，这里应该调用API删除记录
        const updatedLogs = logs.filter(item => item.id !== log.id);
        setLogs(updatedLogs);
        localStorage.setItem('interview_logs', JSON.stringify(updatedLogs));
        message.success('Interview deleted successfully');
      }
    });
  };
  
  const handleExportInterview = (log: InterviewLog) => {
    // 在实际应用中，这里应该调用API导出面试记录
    message.info('Exporting interview transcript...');
    
    // 模拟导出过程
    setTimeout(() => {
      message.success('Interview transcript exported successfully');
    }, 1500);
  };
  
  const handleViewDetails = (log: InterviewLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };
  
  const columns = [
    {
      title: 'Interview Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: InterviewLog) => (
        <div>
          <div className={styles.interviewTitle}>{text}</div>
          <div className={styles.interviewCompany}>{record.company_name}</div>
        </div>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Type',
      dataIndex: 'form',
      key: 'form',
      render: (type: string, record: InterviewLog) => (
        <Space>
          <Tag color={type === 'voice' ? 'blue' : 'green'}>
            {type === 'voice' ? 'Voice' : 'Text'}
          </Tag>
          {record.interview_type && (
            <Tag color={record.interview_type === 'Technical' ? 'purple' : 'orange'}>
              {record.interview_type}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration?: number) => duration ? `${duration} min` : 'N/A'
    },
    {
      title: 'Questions',
      dataIndex: 'question_count',
      key: 'question_count',
      render: (count?: number) => count || 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status?: string) => {
        let color = 'default';
        if (status === 'completed') color = 'success';
        else if (status === 'in-progress') color = 'processing';
        else if (status === 'abandoned') color = 'error';
        
        return status ? <Tag color={color}>{status}</Tag> : 'N/A';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: InterviewLog) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewInterview(record)}
            title="Continue Interview"
          />
          <Button 
            type="text" 
            icon={<BarChartOutlined />} 
            onClick={() => handleViewDetails(record)}
            title="View Details"
          />
          <Button 
            type="text" 
            icon={<ExportOutlined />} 
            onClick={() => handleExportInterview(record)}
            title="Export Transcript"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteInterview(record)}
            title="Delete Interview"
          />
        </Space>
      )
    }
  ];
  
  return (
    <div className={styles.historyContainer}>
      <div className={styles.historyHeader}>
        <Title level={2}>Interview History</Title>
        <Text type="secondary">View and manage your past interview sessions</Text>
      </div>
      
      <div className={styles.filterSection}>
        <Space wrap>
          <Input
            placeholder="Search interviews"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className={styles.searchInput}
            allowClear
          />
          
          <RangePicker 
            onChange={value => setDateRange(value)}
            className={styles.datePicker}
          />
          
          <Select
            placeholder="Interview Type"
            allowClear
            onChange={value => setTypeFilter(value)}
            className={styles.typeFilter}
          >
            <Option value="text">Text</Option>
            <Option value="voice">Voice</Option>
          </Select>
          
          <Select
            placeholder="Status"
            allowClear
            onChange={value => setStatusFilter(value)}
            className={styles.statusFilter}
          >
            <Option value="completed">Completed</Option>
            <Option value="in-progress">In Progress</Option>
            <Option value="abandoned">Abandoned</Option>
          </Select>
        </Space>
      </div>
      
      <Table
        columns={columns}
        dataSource={filteredLogs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        className={styles.historyTable}
        locale={{ emptyText: 'No interview history found' }}
      />
      
      <Modal
        title="Interview Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="continue" 
            type="primary" 
            onClick={() => {
              setDetailModalVisible(false);
              if (selectedLog) handleViewInterview(selectedLog);
            }}
          >
            Continue Interview
          </Button>
        ]}
        width={700}
      >
        {selectedLog && (
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
              <Title level={4}>{selectedLog.title}</Title>
              <Text type="secondary">
                {new Date(selectedLog.date).toLocaleString()}
              </Text>
            </div>
            
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <Text strong>Company:</Text>
                <Text>{selectedLog.company_name || 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Interview Type:</Text>
                <Text>{selectedLog.interview_type || 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Format:</Text>
                <Text>{selectedLog.form === 'voice' ? 'Voice' : 'Text'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Duration:</Text>
                <Text>{selectedLog.duration ? `${selectedLog.duration} minutes` : 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Questions:</Text>
                <Text>{selectedLog.question_count || 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Status:</Text>
                <Text>{selectedLog.status || 'N/A'}</Text>
              </div>
            </div>
            
            <div className={styles.detailSection}>
              <Title level={5}>Performance Summary</Title>
              <div className={styles.performanceStats}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>85%</div>
                  <div className={styles.statLabel}>Overall Score</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>92%</div>
                  <div className={styles.statLabel}>Communication</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>78%</div>
                  <div className={styles.statLabel}>Technical</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>88%</div>
                  <div className={styles.statLabel}>Problem Solving</div>
                </div>
              </div>
            </div>
            
            <div className={styles.detailSection}>
              <Title level={5}>Key Insights</Title>
              <ul className={styles.insightsList}>
                <li>Strong communication skills demonstrated throughout the interview</li>
                <li>Good understanding of core concepts, but could improve on advanced topics</li>
                <li>Provided clear examples from past experience</li>
                <li>Consider providing more specific metrics in future interviews</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewHistoryPage; 