import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getConfig } from '../config';

const ChatInterface = ({ mapData }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [chatWidth, setChatWidth] = useState(400); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  // Function to convert custom table format to markdown tables
  const preprocessMarkdown = (content) => {
    // Debug: log the original content to understand the format
    console.log('Original content:', content);
    
    // First, convert <br> tags to proper line breaks
    let processedContent = content.replace(/<br\s*\/?>/gi, '  \n');
    
    // Split content into lines for processing
    const lines = processedContent.split('\n');
    const processedLines = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this is a POD section header (like "POD 1 — West (CA, OR, WA, NV)")
      if (line.match(/^POD\s+\d+\s*[—-]/)) {
        processedLines.push(`### ${line}`);
        i++;
        
        // Look for the table header line (Team Members | Customers...)
        while (i < lines.length && lines[i].trim() === '') {
          i++; // Skip empty lines
        }
        
        if (i < lines.length && lines[i].includes('Team Members') && lines[i].includes('|')) {
          const headerLine = lines[i].trim();
          console.log('Found header line:', headerLine);
          
          // Create markdown table header
          const headers = headerLine.split('|').map(h => h.trim());
          processedLines.push('| ' + headers.join(' | ') + ' |');
          processedLines.push('|' + headers.map(() => ' --- ').join('|') + '|');
          i++;
          
          // Process table rows until we hit empty line or next POD
          while (i < lines.length) {
            const dataLine = lines[i].trim();
            
            // Stop if we hit empty line followed by POD or end of content
            if (dataLine === '') {
              // Check if next non-empty line is a new POD
              let nextNonEmptyIdx = i + 1;
              while (nextNonEmptyIdx < lines.length && lines[nextNonEmptyIdx].trim() === '') {
                nextNonEmptyIdx++;
              }
              if (nextNonEmptyIdx >= lines.length || lines[nextNonEmptyIdx].match(/^POD\s+\d+\s*[—-]/)) {
                processedLines.push(''); // Add empty line to separate sections
                break;
              }
              i++;
              continue;
            }
            
            // If line contains pipe, treat as table row
            if (dataLine.includes('|')) {
              const cells = dataLine.split('|').map(c => c.trim());
              processedLines.push('| ' + cells.join(' | ') + ' |');
            } else if (dataLine.match(/^POD\s+\d+\s*[—-]/)) {
              // Hit next POD section, back up one step
              i--;
              break;
            } else {
              // Regular content line
              processedLines.push(dataLine);
            }
            i++;
          }
        } else {
          // No table found, just add the line
          processedLines.push(line);
          i++;
        }
      } else {
        // Regular line, just add it
        processedLines.push(line);
        i++;
      }
    }
    
    const result = processedLines.join('\n');
    console.log('Processed content:', result);
    return result;
  };

  // Handle mouse events for resizing
  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const container = chatRef.current?.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;
    
    // Set minimum and maximum widths
    const minWidth = 300;
    const maxWidth = containerRect.width * 0.6; // Max 60% of container width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setChatWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch provider status on component mount
  useEffect(() => {
    console.log('ChatInterface mounted, config:', getConfig());
    fetchProviderStatus();
  }, []);

  const fetchProviderStatus = async () => {
    try {
      const backendUrl = getConfig().backendUrl;
      const response = await fetch(`${backendUrl}/api/chat/providers`);
      if (response.ok) {
        const data = await response.json();
        setAvailableProviders(data.available_providers);
      }
    } catch (error) {
      console.error('Error fetching provider status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Call the backend API
      const backendUrl = getConfig().backendUrl;
      console.log('Backend URL:', backendUrl);
      console.log('Sending chat request with data:', {
        userQuery: userMessage,
        teamData: mapData,
        provider: 'azure'
      });
      
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: userMessage,
          teamData: mapData,
          provider: 'azure'  // Always use Azure OpenAI
        })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || 'I apologize, but I received an empty response.',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message to LLM:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please make sure the backend server is running and try again.',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const exampleQuestions = [
    "I'm traveling to Dallas, TX. Who is nearby who I can see in person?",
    "How many team members are located on the West Coast?",
    "Who is located in New York or nearby areas?",
    "What's the distribution of our team across different time zones?"
  ];

  return (
    <div 
      ref={chatRef}
      className="chat-interface" 
      style={{ width: `${chatWidth}px` }}
    >
      {/* Resize Handle */}
      <div 
        className="chat-resize-handle"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: isResizing ? '#6264a7' : 'transparent',
          cursor: 'ew-resize',
          zIndex: 1000,
          borderLeft: '1px solid #e1dfdd'
        }}
      />
      
      <div className="chat-header">
        <h3>Team Location Assistant</h3>
        <div className="chat-controls">
          <div className="provider-indicator">
            {availableProviders.includes('azure') ? (
              <span className="provider-status-good">🤖 Azure OpenAI</span>
            ) : (
              <span className="provider-status-warning">💭 Simulated</span>
            )}
          </div>
          <button onClick={clearChat} className="clear-chat-btn" title="Clear chat">
            🗑️
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>👋 Hi! I'm your Team Location Assistant. I can help you find team members near specific locations or answer questions about your team's geographic distribution.</p>
            
            <div className="example-questions">
              <p><strong>Try asking:</strong></p>
              {exampleQuestions.map((question, index) => (
                <button
                  key={index}
                  className="example-question"
                  onClick={() => setInputMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
              <span className="timestamp">{message.timestamp}</span>
            </div>
            <div className="message-content">
              {message.role === 'assistant' ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {preprocessMarkdown(message.content)}
                </ReactMarkdown>
              ) : (
                message.content.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < message.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-header">
              <strong>Assistant</strong>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about team locations..."
          className="chat-input"
          rows="3"
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          className="send-button"
        >
          {isLoading ? '...' : '➤'}
        </button>
      </div>
      
      {mapData.length === 0 && (
        <div className="no-data-message">
          Search for a team member first to enable location-based chat assistance.
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
