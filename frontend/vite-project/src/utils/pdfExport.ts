/**
 * PDF Export Utilities
 */

// Simple utility to convert interview data to PDF using browser printing
export const exportToPDF = (data: any): void => {
  try {
    console.log("Starting PDF export with data:", data);
    
    // Validate data
    if (!data || !data.interview) {
      console.error("Invalid data for PDF export", data);
      throw new Error('Invalid data for PDF export');
    }
    
    // 确保conversation是数组
    let conversation = [];
    if (data.conversation) {
      conversation = Array.isArray(data.conversation) ? data.conversation : [];
    }
    
    // Create a styled document for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window. Please check if pop-ups are blocked in your browser settings.');
    }

    console.log("Creating HTML content for PDF");
    
    // Format date for display
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Invalid date';
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      } catch (e) {
        return 'Invalid date';
      }
    };
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Interview Report - ${data.interview.title || 'Unnamed Interview'}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
              line-height: 1.6;
              padding: 20px;
              max-width: 1000px;
              margin: 0 auto;
              color: rgba(0, 0, 0, 0.85);
            }
            h1 {
              color: #f759ab;
              margin-bottom: 16px;
              font-weight: 500;
            }
            h2 {
              color: #333;
              margin-top: 24px;
              margin-bottom: 16px;
              font-weight: 500;
            }
            h3 {
              font-weight: 500;
              margin-top: 16px;
              margin-bottom: 8px;
            }
            .meta {
              color: rgba(0, 0, 0, 0.45);
              margin-bottom: 24px;
              font-size: 14px;
            }
            .meta p {
              margin: 5px 0;
            }
            .section {
              margin-bottom: 32px;
              border-bottom: 1px solid #f0f0f0;
              padding-bottom: 16px;
            }
            .conversation {
              margin-top: 32px;
            }
            .message {
              padding: 12px;
              margin-bottom: 16px;
              border-radius: 6px;
            }
            .ai {
              background-color: #f5f5f5;
            }
            .user {
              background-color: #e6f7ff;
            }
            .message-sender {
              font-weight: 500;
              margin-bottom: 8px;
            }
            .message-time {
              color: rgba(0, 0, 0, 0.45);
              font-size: 12px;
              margin-left: 8px;
              font-weight: normal;
            }
            .scores-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 24px;
            }
            .score-item {
              background: #f9f9f9;
              padding: 16px;
              border-radius: 6px;
              text-align: center;
            }
            .score-label {
              color: #f759ab;
              margin-bottom: 8px;
              font-weight: 500;
            }
            .score-value {
              font-size: 24px;
              font-weight: 500;
              color: #eb2f96;
            }
            .insights-list {
              padding-left: 20px;
              margin-top: 12px;
              margin-bottom: 24px;
            }
            .insights-list li {
              margin-bottom: 8px;
            }
            .job-description {
              background-color: #fafafa;
              padding: 16px;
              border-radius: 6px;
              margin-top: 16px;
            }
            .print-instructions {
              margin: 32px 0;
              padding: 16px;
              background-color: #fffbe6;
              border: 1px solid #ffe58f;
              border-radius: 6px;
            }
            .print-btn {
              display: block;
              margin: 32px auto;
              padding: 12px 24px;
              background: #1890ff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 500;
              transition: background-color 0.3s;
            }
            .print-btn:hover {
              background: #40a9ff;
            }
            .footer {
              margin-top: 48px;
              text-align: center;
              color: rgba(0, 0, 0, 0.45);
              font-size: 14px;
              padding-top: 16px;
              border-top: 1px solid #f0f0f0;
            }
            .header-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .header-item {
              margin-bottom: 12px;
            }
            .header-label {
              font-weight: 500;
              margin-right: 8px;
            }
            @media print {
              body {
                padding: 0;
                font-size: 12px;
              }
              .no-print {
                display: none;
              }
              .scores-container {
                grid-template-columns: repeat(2, 1fr);
              }
              h1 {
                font-size: 20px;
              }
              h2 {
                font-size: 16px;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="section">
            <h1>${data.interview.title || 'Unnamed Interview'}</h1>
            <p class="meta">Generated on ${new Date().toLocaleString()}</p>
            
            <div class="header-details">
              <div class="header-item">
                <span class="header-label">Company:</span>
                <span>${data.interview.company || 'N/A'}</span>
              </div>
              <div class="header-item">
                <span class="header-label">Date:</span>
                <span>${formatDate(data.interview.date || new Date())}</span>
              </div>
              <div class="header-item">
                <span class="header-label">Type:</span>
                <span>${data.interview.type || 'N/A'}</span>
              </div>
              <div class="header-item">
                <span class="header-label">Question Type:</span>
                <span>${data.interview.questionType || 'N/A'}</span>
              </div>
              <div class="header-item">
                <span class="header-label">Interview Name:</span>
                <span>${data.interview.interviewName || 'N/A'}</span>
              </div>
              <div class="header-item">
                <span class="header-label">Thread ID:</span>
                <span>${data.interview.threadId || 'N/A'}</span>
              </div>
            </div>
            
            ${data.interview.job_description ? `
              <h3>Job Description</h3>
              <div class="job-description">
                ${data.interview.job_description}
              </div>
            ` : ''}
          </div>
          
          ${data.performance && data.performance.scores ? `
            <div class="section">
              <h2>Performance Summary</h2>
              <div class="scores-container">
                <div class="score-item">
                  <div class="score-label">Technical</div>
                  <div class="score-value">${Math.round((data.performance.scores?.technical || 0) * 100)}%</div>
                </div>
                <div class="score-item">
                  <div class="score-label">Communication</div>
                  <div class="score-value">${Math.round((data.performance.scores?.communication || 0) * 100)}%</div>
                </div>
                <div class="score-item">
                  <div class="score-label">Problem Solving</div>
                  <div class="score-value">${Math.round((data.performance.scores?.problem_solving || 0) * 100)}%</div>
                </div>
                <div class="score-item">
                  <div class="score-label">Confidence</div>
                  <div class="score-value">${Math.round((data.performance.scores?.confidence || 0) * 100)}%</div>
                </div>
                <div class="score-item">
                  <div class="score-label">Resume Strength</div>
                  <div class="score-value">${Math.round((data.performance.scores?.resume_strength || 0) * 100)}%</div>
                </div>
                <div class="score-item">
                  <div class="score-label">Leadership</div>
                  <div class="score-value">${Math.round((data.performance.scores?.leadership || 0) * 100)}%</div>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${data.feedback ? `
            <div class="section">
              <h2>Performance Insights</h2>
              
              ${data.feedback.key_strengths && data.feedback.key_strengths.length > 0 ? `
                <h3>Key Strengths</h3>
                <ul class="insights-list">
                  ${data.feedback.key_strengths.map((strength: string) => `
                    <li>${strength}</li>
                  `).join('')}
                </ul>
              ` : ''}
              
              ${data.feedback.improvement_areas && data.feedback.improvement_areas.length > 0 ? `
                <h3>Areas for Improvement</h3>
                <ul class="insights-list">
                  ${data.feedback.improvement_areas.map((area: string) => `
                    <li>${area}</li>
                  `).join('')}
                </ul>
              ` : ''}
              
              ${data.feedback.overall_feedback ? `
                <h3>Overall Feedback</h3>
                <p>${data.feedback.overall_feedback}</p>
              ` : ''}
            </div>
          ` : ''}
          
          <div class="section conversation">
            <h2>Conversation</h2>
            ${conversation.length > 0 ? 
              conversation.map((msg: any, index: number) => {
                if (!msg) return '';
                const sender = msg.sender || 'unknown';
                const text = msg.text || '(Empty message)';
                return `
                  <div class="message ${sender}">
                    <div class="message-sender">
                      ${sender === 'ai' ? 'AI' : 'You'} 
                      <span class="message-time">Message ${index + 1}</span>
                    </div>
                    <div>${text.replace(/\n/g, '<br/>')}</div>
                  </div>
                `;
              }).join('') :
              '<p>No conversation data available.</p>'
            }
          </div>
          
          <div class="print-instructions no-print">
            <h3>How to save as PDF:</h3>
            <ol>
              <li>Click the "Generate PDF" button below</li>
              <li>In the print dialog that appears, select "Save as PDF" as the destination/printer</li>
              <li>Click "Save" to download the PDF file</li>
              <li>If no print dialog appears, try pressing Ctrl+P (or Cmd+P on Mac)</li>
            </ol>
            <p><strong>Note:</strong> Make sure pop-ups are enabled in your browser for this site.</p>
          </div>
          
          <button onclick="window.print(); return false;" class="print-btn no-print">
            Generate PDF
          </button>
          
          <script>
            // Auto-focus and show print dialog after a short delay
            setTimeout(function() {
              document.querySelector('.print-btn').focus();
            }, 500);
            
            // Auto-print for convenience
            setTimeout(function() {
              window.print();
            }, 1000);
          </script>
          
          <div class="footer no-print">
            Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    console.log("Writing HTML content to print window");
    
    // Write content to the new window
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Focus the window
    printWindow.focus();
    
    console.log("PDF export completed successfully");
  } catch (error) {
    console.error('Error preparing print view:', error);
    throw error;
  }
}; 