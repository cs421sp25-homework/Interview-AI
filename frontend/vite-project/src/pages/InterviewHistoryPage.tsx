import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, DatePicker, Select, message, Modal, Typography } from 'antd';
import { SearchOutlined, DeleteOutlined, ExportOutlined, EyeOutlined, BarChartOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import styles from './InterviewHistoryPage.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 辅助函数用于确保日期时区处理正确
const formatToEasternTime = (dateStr: string) => {
  try {
    // 解析ISO日期字符串，不自动应用时区偏移
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      console.error(`Invalid date: ${dateStr}`);
      return { date: "Invalid date" };
    }
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    return {
      date: dateFormatter.format(date)
    };
  } catch (error) {
    console.error(`Error formatting date: ${dateStr}`, error);
    return { date: "Invalid date" };
  }
};

interface InterviewLog {
  id: number;
  title: string;
  date: string;
  updated_at?: string;
  form: 'text' | 'voice';
  thread_id: string;
  
  question_count?: number; 
  company_name?: string; 
  interview_type?: string;
  log?: any; // Add log property for conversation data
  
  question_type?: string;
  job_description?: string;
  config_company_name?: string;
  interview_name?: string;
}

const InterviewHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<InterviewLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InterviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [selectedLog, setSelectedLog] = useState<InterviewLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [modal, contextHolder] = Modal.useModal();
  
  const navigate = useNavigate();
  
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  
  useEffect(() => {
    try {
      // Check if user is logged in
      const email = localStorage.getItem('user_email');
      if (!email) {
        console.log("User not logged in, redirecting to login page");
        navigate('/login');
        return;
      }
      
      // Continue with existing code
      fetchInterviewLogs();
    } catch (error) {
      console.error('Error in InterviewHistoryPage:', error);
      navigate('/login');
    }
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [logs, searchText, dateRange, typeFilter]);


  const countQuestionsInConversation = (conversation: { text: string; sender: string }[]): number => {
    return conversation
      .filter(msg => msg.sender === "ai") 
      .reduce((total, msg) => total + (msg.text.match(/\?/g) || []).length, 0);
  };
  
  const fetchInterviewLogs = async () => {
    setLoading(true);
    try {

      const userEmail = localStorage.getItem('user_email') || '';
      
      if (!userEmail) {
        message.error('User not logged in');
        setLoading(false);
        return;
      }
      

      const response = await fetch(`${API_BASE_URL}/api/interview_logs/${userEmail}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch interview logs: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched interview logs:', data);
      
      if (data && Array.isArray(data.data)) {
        
        const transformedLogs = data.data.map((log: any) => {
          console.log(`Log ID: ${log.id}, updated_at: ${log.updated_at}, created_at: ${log.created_at}`);
          
          if (log.updated_at) {
            const testDate = new Date(log.updated_at);
            // console.log(`UTC Time: ${testDate.toISOString()}`);
            // console.log(`Local Time: ${testDate.toString()}`);
            // console.log(`ET Display Date: ${new Intl.DateTimeFormat('en-US', {
            //   timeZone: 'America/New_York',
            //   year: 'numeric',
            //   month: 'numeric',
            //   day: 'numeric',
            // }).format(testDate)}`);
          }
          
          return {
            id: log.id,
            thread_id: log.thread_id,
            title: log.config_name || log.interview_name || 'Unnamed Interview',
            date: log.created_at || new Date().toISOString(),
            updated_at: log.updated_at || log.created_at || new Date().toISOString(),
            company_name: log.config_company_name || log.company_name || 'Unknown Company',
            form: log.form || 'text',
            log: typeof log.log === 'string' ? JSON.parse(log.log) : log.log,






            
            question_type: log.question_type || 'Unknown',
            job_description: log.job_description || '',
            interview_name: log.interview_name || '',
            interview_type: log.interview_type || 'Unknown',
            question_count: log.log ? countQuestionsInConversation(typeof log.log === 'string' ? JSON.parse(log.log) : log.log) : 0,
          };
        });
        
        setLogs(transformedLogs);
        setFilteredLogs(transformedLogs);
      } else {
        // Fallback to localStorage if API doesn't return expected data
        const savedLogs = localStorage.getItem('interview_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          
          const enhancedLogs = parsedLogs.map((log: any) => ({
            ...log,
            
            
            question_count: log.conversation ? countQuestionsInConversation(log.conversation) : 0,
            company_name: log.title.includes('-') ? log.title.split('-')[1].trim() : 'Unknown Company',
            question_type: Math.random() > 0.5 ? 'Technical' : 'Behavioral',
            interview_type: Math.random() > 0.8 ? 'Voice' : 'Text',
            updated_at: log.updated_at || log.date || new Date().toISOString(),
            
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
            
            
            question_count: Math.floor(Math.random() * 20) + 5,
            company_name: log.title.includes('-') ? log.title.split('-')[1].trim() : 'Unknown Company',
            question_type: Math.random() > 0.5 ? 'Technical' : 'Behavioral',
            interview_type: Math.random() > 0.8 ? 'Voice' : 'Text',
            updated_at: log.updated_at || log.date || new Date().toISOString(),
            
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
    
    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(log => 
        (log.title && log.title.toLowerCase().includes(searchLower)) ||
        (log.company_name && log.company_name.toLowerCase().includes(searchLower)) ||
        (log.interview_name && log.interview_name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day').valueOf();
      const endDate = dateRange[1].endOf('day').valueOf();
      
      filtered = filtered.filter(log => {
        try {
          const logDateObj = new Date(log.updated_at || log.date);
          const now = new Date();
          
          const isInvalidFutureDate = logDateObj > now && (logDateObj.getTime() - now.getTime()) > 24 * 60 * 60 * 1000;
          
          const finalDate = isInvalidFutureDate ? now.getTime() : logDateObj.getTime();
          
          if (isNaN(finalDate)) {
            return false; 
          }
          
          return finalDate >= startDate && finalDate <= endDate;
        } catch (error) {
          console.error("Error filtering by date:", error);
          return false;
        }
      });
    }
    
    // Apply type filter
    if (typeFilter) {
      if (typeFilter === 'text' || typeFilter === 'voice') {
        filtered = filtered.filter(log => 
          log.interview_type && log.interview_type.toLowerCase() === typeFilter
        );
      } else if (typeFilter === 'technical' || typeFilter === 'behavioral') {
        filtered = filtered.filter(log => 
          log.question_type && log.question_type.toLowerCase() === typeFilter
        );
      }
    }
    
    setFilteredLogs(filtered);
  };
  
  const handleViewInterviewLog = (log: InterviewLog) => {
    navigate(`/interview/view/${log.id}`, { state: { conversation: log.log } });
  };
  
  const { confirm } = Modal;

  const handleDeleteInterview = (log: InterviewLog) => {
    console.log("delete clicked");
  
    modal.confirm({
      title: 'Are you sure you want to delete this interview?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/chat_history/${log.id}`, {
            method: 'DELETE',
          });
  
          if (!response.ok) {
            throw new Error('Failed to delete interview log');
          }
  
          const result = await response.json();
          message.success(result.message || 'Interview deleted successfully');
          setLogs(prevLogs => prevLogs.filter(item => item.id !== log.id));
        } catch (error) {
          console.error('Error deleting interview:', error);
          message.error('Failed to delete interview');
        }
      },
    });
  };
  
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  const handleExportInterview = async (log: InterviewLog) => {
    try {
      console.log("export clicked");
  
      // Get log content as text
      const textLog = typeof log.log === 'string'
        ? log.log
        : JSON.stringify(log.log, null, 2);
  
      console.log("Text to copy:", textLog);
  
      if (!textLog) {
        message.warning("No interview log found to export.");
        return;
      }
  
      // Attempt to copy to clipboard
      await navigator.clipboard.writeText(textLog);
      console.log("Clipboard write successful");
  
      // Check and show Notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Interview log copied to clipboard!');
          console.log("Notification shown: permission already granted");
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          console.log("Notification permission:", permission);
          if (permission === 'granted') {
            new Notification('Interview log copied to clipboard!');
            console.log("Notification shown after requesting permission");
          } else {
            message.success('Interview log copied to clipboard!');
          }
        } else {
          message.success('Interview log copied to clipboard!');
        }
      } else {
        message.success('Interview log copied to clipboard!');
      }
    } catch (err) {
      console.error('Error copying log:', err);
      message.error('Failed to copy interview log to clipboard.');
    }
  };
  
  
  
  const handleViewDetails = async (log: InterviewLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
    
    // Fetch performance data when opening the details modal
    setLoadingPerformance(true);
    try {
      // Fetch scores
      const scoresResponse = await fetch(`${API_BASE_URL}/api/interview_scores/${log.id}`);
      
      if (!scoresResponse.ok) {
        throw new Error(`Failed to fetch performance data: ${scoresResponse.status}`);
      }
      
      const scoresData = await scoresResponse.json();
      
      // Fetch strengths
      const strengthsResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_strengths/${log.id}`);
      let strengths = ["Demonstrated communication skills", "Showed technical knowledge"];
      
      if (strengthsResponse.ok) {
        const strengthsData = await strengthsResponse.json();
        if (strengthsData.strengths && Array.isArray(JSON.parse(strengthsData.strengths))) {
          strengths = JSON.parse(strengthsData.strengths);
        }
      }
      
      // Fetch improvement areas
      const improvementResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_improvement_areas/${log.id}`);
      let improvementAreas = ["Consider providing more specific examples", "Work on structuring responses"];
      
      if (improvementResponse.ok) {
        const improvementData = await improvementResponse.json();
        if (improvementData.improvement_areas && Array.isArray(JSON.parse(improvementData.improvement_areas))) {
          improvementAreas = JSON.parse(improvementData.improvement_areas);
        }
      }
      
      // Fetch specific feedback
      const feedbackResponse = await fetch(`${API_BASE_URL}/api/interview_feedback_specific_feedback/${log.id}`);
      let specificFeedback = "Performance data available for this interview.";
      
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        if (feedbackData.specific_feedback) {
          specificFeedback = feedbackData.specific_feedback;
        }
      }
      
      // Transform the data to match the expected format
      if (scoresData.scores) {
        setPerformanceData({
          scores: {
            confidence: scoresData.scores.confidence || 0.75,
            communication: scoresData.scores.communication || 0.75,
            technical: scoresData.scores.technical || 0.75,
            problem_solving: scoresData.scores.problem_solving || 0.75,
            resume_strength: scoresData.scores["resume strength"] || 0.75, // Note the different key format
            leadership: scoresData.scores.leadership || 0.75
          },
          feedback: {
            key_strengths: strengths,
            improvement_areas: improvementAreas,
            overall_feedback: specificFeedback
          }
        });
      } else {
        throw new Error("Invalid performance data format");
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      message.error('Failed to load performance data');
      // Set default performance data
      setPerformanceData({
        scores: {
          confidence: 0.75,
          communication: 0.75,
          technical: 0.75,
          problem_solving: 0.75,
          resume_strength: 0.75,
          leadership: 0.75
        },
        feedback: {
          key_strengths: [
            "Demonstrated communication skills",
            "Showed technical knowledge"
          ],
          improvement_areas: [
            "Consider providing more specific examples",
            "Work on structuring responses"
          ],
          overall_feedback: "Performance data not available for this interview."
        }
      });
    } finally {
      setLoadingPerformance(false);
    }
  };
  
  const columns = [
    {
      title: 'Interview Config',
      key: 'interview',
      width: '28%',
      render: (text: string, record: InterviewLog) => (
        <div>
          <div className={styles.interviewTitle}>{record.title}</div>
          {record.interview_name && record.interview_name !== record.title && (
            <div className={styles.interviewName}>{record.interview_name}</div>
          )}
        </div>
      )
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      width: '15%',
      render: (company: string) => (
        <div className={styles.companyName}>
          {company || 'N/A'}
        </div>
      )
    },
    {
      title: (
        <div className={styles.columnTitleWithTip}>
          Date
        </div>
      ),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: '15%',
      sorter: (a: InterviewLog, b: InterviewLog) => {
        try {
          const dateA = new Date(a.updated_at || a.date).getTime();
          const dateB = new Date(b.updated_at || b.date).getTime();
          
          // 如果日期无效或是可疑的未来日期，使用当前时间
          const now = Date.now();
          
          // 使用一周为阈值，判断可疑的未来日期
          const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
          const validDateA = isNaN(dateA) || (dateA > now && dateA - now > oneWeekMs) ? now : dateA;
          const validDateB = isNaN(dateB) || (dateB > now && dateB - now > oneWeekMs) ? now : dateB;
          
          return validDateB - validDateA; // 默认最新的排在前面
        } catch (error) {
          console.error("Error sorting dates:", error);
          return 0;
        }
      },
      sortDirections: ['ascend', 'descend', null] as any,
      defaultSortOrder: 'descend' as const,
      render: (date: string) => {
        try {
          // console.log("Rendering date:", date);
          
          const formattedTime = formatToEasternTime(date);
          
          return (
            <div className={styles.dateInfo}>
              <div>{formattedTime.date}</div>
            </div>
          );
        } catch (error) {
          console.error("Error formatting date:", date, error);
          return <div className={styles.dateInfo}>Invalid date</div>;
        }
      }
    },
    {
      title: 'Type',
      key: 'type',
      width: '17%',
      render: (text: string, record: InterviewLog) => (
        <div className={styles.tagContainer}>
          <Space size={8}>
            <Tag color={record.interview_type?.toLowerCase() === 'voice' ? 'blue' : 'green'}>
              {record.interview_type?.toLowerCase() === 'voice' ? 'Voice' : 'Text'}
            </Tag>
            {record.question_type && record.question_type !== 'Unknown' && (
              <Tag color={record.question_type.toLowerCase() === 'technical' ? 'purple' : 'orange'}>
                {record.question_type.charAt(0).toUpperCase() + record.question_type.slice(1).toLowerCase()}
              </Tag>
            )}
          </Space>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '25%',
      render: (_: any, record: InterviewLog) => (
        <Space size="middle" className={styles.actionButtonsContainer}>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.viewButton}`}
            onClick={() => handleViewInterviewLog(record)}
          >
            <EyeOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>View</span>
          </Button>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.detailsButton}`}
            onClick={() => handleViewDetails(record)}
          >
            <BarChartOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Details</span>
          </Button>
          <Button 
            type="link" 
            className={`${styles.actionButtonWithLabel} ${styles.exportButton}`}
            onClick={() => handleExportInterview(record)}
          >
            <ExportOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Export</span>
          </Button>
          <Button 
            type="link" 
            danger 
            className={`${styles.actionButtonWithLabel} ${styles.deleteButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteInterview(record);
            }}
          >
            <DeleteOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Delete</span>
          </Button>
        </Space>
      )
    }
  ];
  
  return (
    <div className={styles.interviewContainer}>
      {contextHolder}
      <div className={styles.interviewHeader}>
        <button 
          className={styles.backButton}
          onClick={handleBack}
        >
          <Home size={18} />
          Back to Dashboard
        </button>
        <h1>Interview History</h1>
        <div className={styles.spacer}></div>
      </div>

      <div className={styles.historyContent}>
        <div className={styles.filterSection}>
          <div className={styles.filterLeft}>
            <Input
              placeholder="Search interviews"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className={styles.searchInput}
              allowClear
            />
          </div>
          
          <div className={styles.filterRight}>
            <Space size={16}>
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
                <Option value="technical">Technical</Option>
                <Option value="behavioral">Behavioral</Option>
                <Option value="voice">Voice</Option>
                <Option value="text">Text</Option>
              </Select>
            </Space>
          </div>
        </div>
        
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: false, 
            showTotal: (total) => `Total ${total} interviews`,
            position: ['bottomCenter']
          }}
          className={styles.historyTable}
          locale={{ emptyText: 'No interview history found' }}
          onChange={(pagination, filters, sorter, extra) => {
            // console.log('Table params changed:', sorter);
            // 可以在这里添加额外的排序逻辑
          }}
        />
      </div>
      
      <Modal
        title="Interview Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setPerformanceData(null); // Clear performance data when closing modal
        }}
        footer={[
          <Button key="back" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="continue" 
            type="primary" 
            onClick={() => {
              setDetailModalVisible(false);
              if (selectedLog) handleViewInterviewLog(selectedLog);
            }}
          >
            View Interview
          </Button>
        ]}
        width={1200}
        className={styles.detailModal}
      >
        {selectedLog && (
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
              <Title level={4}>{selectedLog.title}</Title>
              <Text type="secondary">
                {(() => {
                  try {
                    // console.log("Modal date:", selectedLog.updated_at || selectedLog.date);
                    
                    // 使用工具函数处理时区
                    const dateStr = selectedLog.updated_at || selectedLog.date;
                    const formattedTime = formatToEasternTime(dateStr);
                    
                    // 对于模态框，我们希望月份为完整名称
                    // 重新格式化日期部分为带有完整月份名称的形式
                    const dateObj = new Date(dateStr);
                    if (!isNaN(dateObj.getTime())) {
                      const fullFormatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/New_York',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      });
                      
                      return fullFormatter.format(dateObj);
                    }
                    
                    return formattedTime.date;
                  } catch (error) {
                    console.error("Error formatting detail date:", error);
                    return 'Invalid date';
                  }
                })()}
              </Text>
            </div>
            
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <Text strong>Company:</Text>
                <Text>{selectedLog.company_name || 'N/A'}</Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Question Type:</Text>
                <Text>
                  {selectedLog.question_type ? 
                    (selectedLog.question_type.charAt(0).toUpperCase() + 
                    selectedLog.question_type.slice(1).toLowerCase()) : 'N/A'}
                </Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Format:</Text>
                <Text>
                  {selectedLog.interview_type?.toLowerCase() === 'voice' ? 'Voice' : 'Text'}
                </Text>
              </div>
              
              <div className={styles.detailItem}>
                <Text strong>Interview Name:</Text>
                <Text>{selectedLog.interview_name || 'N/A'}</Text>
              </div>
              
              {selectedLog.job_description && (
                <div className={styles.detailItem}>
                  <Text strong>Job Description Available:</Text>
                  <Text>Yes</Text>
                </div>
              )}
              
              <div className={styles.detailItem}>
                <Text strong>Thread ID:</Text>
                <Text>{selectedLog.thread_id || 'N/A'}</Text>
              </div>
            </div>
            
            {selectedLog.job_description && (
              <div className={styles.detailSection}>
                <Title level={5}>Job Description</Title>
                <Text>{selectedLog.job_description}</Text>
              </div>
            )}
            
            <div className={styles.detailSection}>
              <Title level={5}>Performance Summary</Title>
              {loadingPerformance ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <Text>Loading performance data...</Text>
                </div>
              ) : performanceData ? (
                <>
                  <div className={styles.performanceStats}>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.technical * 100)}%</div>
                      <div className={styles.statLabel}>Technical</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.communication * 100)}%</div>
                      <div className={styles.statLabel}>Communication</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.problem_solving * 100)}%</div>
                      <div className={styles.statLabel}>Problem Solving</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.confidence * 100)}%</div>
                      <div className={styles.statLabel}>Confidence</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.resume_strength * 100)}%</div>
                      <div className={styles.statLabel}>Resume Strength</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{Math.round(performanceData.scores.leadership * 100)}%</div>
                      <div className={styles.statLabel}>Leadership</div>
                    </div>
                  </div>
                </>
              ) : (
                <Text>No performance data available for this interview.</Text>
              )}
            </div>
            
            {performanceData && performanceData.feedback && (
              <>
                <div className={styles.detailSection}>
                  <Title level={5}>Key Strengths</Title>
                  <ul className={styles.insightsList}>
                    {performanceData.feedback.key_strengths.map((strength: string, index: number) => (
                      <li key={`strength-${index}`}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div className={styles.detailSection}>
                  <Title level={5}>Areas for Improvement</Title>
                  <ul className={styles.insightsList}>
                    {performanceData.feedback.improvement_areas.map((area: string, index: number) => (
                      <li key={`improvement-${index}`}>{area}</li>
                    ))}
                  </ul>
                </div>
                
                <div className={styles.detailSection}>
                  <Title level={5}>Overall Feedback</Title>
                  <Text>{performanceData.feedback.overall_feedback}</Text>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewHistoryPage; 