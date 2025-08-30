import React, { useState, useRef, useEffect } from 'react';
import { getConfig } from '../config';

const ChatInterface = ({ mapData }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('azure');
  const [providerStatus, setProviderStatus] = useState({});
  const [availableProviders, setAvailableProviders] = useState([]);
  const messagesEndRef = useRef(null);

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
        setProviderStatus(data.provider_status);
        setAvailableProviders(data.available_providers);
        
        // Set default provider to azure (since it's the only one)
        setSelectedProvider('azure');
      }
    } catch (error) {
      console.error('Error fetching provider status:', error);
    }
  };

  const llmProviders = [
    { id: 'azure', name: 'Azure OpenAI', placeholder: 'Ask about team locations...' }
  ];

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
    <div className="chat-interface">
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
            
            {/* Provider Status */}
            <div className="provider-status">
              <p><strong>Azure OpenAI Status:</strong></p>
              {availableProviders.includes('azure') ? (
                <div className="status-good">
                  ✅ Azure OpenAI configured and ready
                </div>
              ) : (
                <div className="status-warning">
                  ⚠️ Azure OpenAI not configured. Using simulated responses. 
                  <br />Add Azure OpenAI credentials to .env file for enhanced AI responses.
                </div>
              )}
            </div>
            
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
              {message.content.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
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
