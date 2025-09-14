import React, { useState, useEffect, useRef } from 'react';
import './ChatBot.scss';

const ChatBot = () => {
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
    };

    const getInitialMessages = () => {
        const savedMessages = localStorage.getItem('chatbot-messages');
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                return parsed.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            } catch (error) {
                console.error('Error parsing saved messages:', error);
            }
        }
        return [];
    };

    const [messages, setMessages] = useState(getInitialMessages);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sessionId, setSessionId] = useState('abc123');
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [sessionHistory, setSessionHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
    const [isPageLoaded, setIsPageLoaded] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isRefreshingSidebar, setIsRefreshingSidebar] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        setIsPageLoaded(true);
    }, []);

    useEffect(() => {
        localStorage.setItem('chatbot-messages', JSON.stringify(messages));
    }, [messages]);

    const fetchSessionHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch(`https://assignment-voosh-backend.vercel.app/api/chat/session/${sessionId}/history`);
            if (response.ok) {
                const data = await response.json();
                const history = data.history || data;
                setSessionHistory(history);
            } else {
                console.error('Failed to fetch session history:', response.status);
            }
        } catch (error) {
            console.error('Error fetching session history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Refresh sidebar after each chat interaction
    const refreshSidebar = async () => {
        if (sessionId) {
            setIsRefreshingSidebar(true);
            try {
                const response = await fetch(`https://assignment-voosh-backend.vercel.app/api/chat/session/${sessionId}/history`);
                if (response.ok) {
                    const data = await response.json();
                    const history = data.history || data;
                    setSessionHistory(history);
                }
            } catch (error) {
                console.error('Error refreshing sidebar:', error);
            } finally {
                setIsRefreshingSidebar(false);
            }
        }
    };

    const deleteSession = async () => {
        try {
            const response = await fetch(`https://assignment-voosh-backend.vercel.app/api/chat/session/${sessionId}/clear`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessages([]);
                setSessionHistory([]);
                setInputMessage('');
                setIsTyping(false);
                setIsStreaming(false);
                setSessionId('abc' + Math.random().toString(36).substr(2, 9));
                localStorage.removeItem('chatbot-messages');
                console.log('Session deleted successfully');
            } else {
                console.error('Failed to delete session:', response.status);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    useEffect(() => {
        if (sessionId) {
            fetchSessionHistory();
        }
    }, [sessionId]);

    useEffect(() => {
        if (sessionHistory.length > 0) {
            const historyMessages = sessionHistory.map((item, index) => ({
                id: generateUniqueId(),
                text: item.content,
                sender: item.role === 'user' ? 'user' : 'bot',
                timestamp: new Date()
            }));

            setMessages(historyMessages);

            setSelectedHistoryItem(null);
        }
    }, [sessionHistory]);

    const handleHistoryItemClick = (item, index) => {
        setSelectedHistoryItem(index);

        const historyMessages = sessionHistory.map((historyItem, idx) => ({
            id: generateUniqueId(),
            text: historyItem.content,
            sender: historyItem.role === 'user' ? 'user' : 'bot',
            timestamp: new Date()
        }));

        setMessages(historyMessages);

        setTimeout(() => {
            const messageElements = document.querySelectorAll('.message');
            if (messageElements[index]) {
                messageElements[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                messageElements[index].classList.add('message--highlighted');
                setTimeout(() => {
                    messageElements[index].classList.remove('message--highlighted');
                }, 2000);
            }
        }, 100);
    };

    const streamResponse = async (userMessage) => {
        setIsStreaming(true);
        setIsTyping(true);

        const responseId = generateUniqueId();
        let streamedText = '';

        setMessages(prev => [...prev, {
            id: responseId,
            text: '',
            sender: 'bot',
            timestamp: new Date(),
            isStreaming: true
        }]);

        try {
            setConnectionStatus('connecting');
            const response = await fetch('https://assignment-voosh-backend.vercel.app/api/chat/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setConnectionStatus('connected');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            let jsonString = line.trim();
                            if (jsonString.startsWith('data: ')) {
                                jsonString = jsonString.substring(6);
                            }

                            const data = JSON.parse(jsonString);

                            if (data.type === 'stream_start') {
                                console.log('Stream started:', data);
                                if (data.sessionId) {
                                    setSessionId(data.sessionId);
                                }
                            } else if (data.type === 'stream_chunk') {
                                streamedText += data.content;

                                setMessages(prev => prev.map(msg =>
                                    msg.id === responseId
                                        ? { ...msg, text: streamedText }
                                        : msg
                                ));
                            } else if (data.type === 'stream_end') {
                                console.log('Stream ended:', data);
                                setMessages(prev => prev.map(msg =>
                                    msg.id === responseId
                                        ? { ...msg, isStreaming: false }
                                        : msg
                                ));
                                setIsStreaming(false);
                                setIsTyping(false);
                                refreshSidebar();
                                return;
                            }
                        } catch (parseError) {
                            console.error('Error parsing stream data:', parseError, 'Line:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error streaming response:', error);
            setConnectionStatus('error');

            setMessages(prev => prev.map(msg =>
                msg.id === responseId
                    ? {
                        ...msg,
                        text: `Sorry, I encountered an error while processing your request: ${error.message}. Please check if the API server is running on http://localhost:5000 and try again.`,
                        isStreaming: false
                    }
                    : msg
            ));

            setIsStreaming(false);
            setIsTyping(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!inputMessage.trim() || isStreaming) return;

        const userMessage = {
            id: generateUniqueId(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const messageToSend = inputMessage;
        setInputMessage('');

        setTimeout(() => {
            refreshSidebar();
        }, 500);

        await streamResponse(messageToSend);
    };

    const handleNewChat = () => {
        setMessages([]);
        setInputMessage('');
        setIsTyping(false);
        setIsStreaming(false);
        setSessionHistory([]);
        setSelectedHistoryItem(null);
        setSessionId('abc' + Math.random().toString(36).substr(2, 9));
        localStorage.removeItem('chatbot-messages');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };



    return (
        <div className={`NewsGpt-app ${isPageLoaded ? 'app--loaded' : 'app--loading'}`}>
            <div className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
                <div className="sidebar__header">
                    <button className="sidebar__new-chat" onClick={handleNewChat}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        New chat
                    </button>
                    <button
                        className={`sidebar__refresh ${isRefreshingSidebar ? 'sidebar__refresh--spinning' : ''}`}
                        onClick={refreshSidebar}
                        disabled={isRefreshingSidebar || isLoadingHistory}
                        title="Refresh session history"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9 0 0,0 5.64,5.64L1,10m22,4l-4.64,4.36A9,9 0 0,1 3.51,15"></path>
                        </svg>
                        {isRefreshingSidebar ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                <div className="sidebar__conversations">
                    <div className="conversation-item conversation-item--active">
                        <div className="conversation-item__icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <span className="conversation-item__title">Current Chat</span>
                        <button
                            className="conversation-item__delete"
                            onClick={deleteSession}
                            title="Delete session"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            </svg>
                        </button>
                    </div>

                    {isLoadingHistory ? (
                        <div className="conversation-item conversation-item--loading">
                            <div className="conversation-item__loading">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className="conversation-item__title">Loading history...</span>
                        </div>
                    ) : (
                        sessionHistory.length > 0 && (
                            <div className="sidebar__history-section">
                                <div className="sidebar__history-title">Session History</div>
                                {sessionHistory
                                    .map((item, index) => ({ ...item, originalIndex: index }))
                                    .filter(item => item.role === 'user')
                                    .map((item, userIndex) => (
                                        <div
                                            key={`user-history-${userIndex}-${item.content?.substring(0, 10)}`}
                                            className={`conversation-item conversation-item--history ${selectedHistoryItem === item.originalIndex ? 'conversation-item--selected' : ''}`}
                                            onClick={() => handleHistoryItemClick(item, item.originalIndex)}
                                        >
                                            <div className="conversation-item__icon">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                    <circle cx="12" cy="7" r="4" />
                                                </svg>
                                            </div>
                                            <div className="conversation-item__content">
                                                <span className="conversation-item__title">
                                                    {item.content ? item.content.substring(0, 30) + (item.content.length > 30 ? '...' : '') : `Message ${userIndex + 1}`}
                                                </span>
                                                <span className="conversation-item__role">
                                                    You
                                                </span>
                                            </div>
                                            {selectedHistoryItem === item.originalIndex && (
                                                <div className="conversation-item__selected-indicator">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20,6 9,17 4,12"></polyline>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        )
                    )}
                </div>


            </div>

            <div className="chat-area">
                <div className="chat-header">
                    <button
                        className="chat-header__menu-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div className="chat-header__title-section">
                        <h1 className="chat-header__title">NewsGpt</h1>
                        <div className="chat-header__session-info">
                            <div className="session-info">
                                <span className="session-info__label">Session:</span>
                                <span className="session-info__id">{sessionId}</span>
                                <button
                                    className="session-info__copy"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(sessionId);
                                            setShowCopyToast(true);
                                            setTimeout(() => setShowCopyToast(false), 2000);
                                        } catch (error) {
                                            console.error('Failed to copy session ID:', error);
                                        }
                                    }}
                                    title="Copy session ID"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                            <div className={`connection-status connection-status--${connectionStatus}`}>
                                <div className="connection-status__indicator"></div>
                                <span className="connection-status__text">
                                    {connectionStatus === 'connected' ? 'Connected' :
                                        connectionStatus === 'connecting' ? 'Connecting...' :
                                            connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="chat-header__actions">
                        <button className="chat-header__action-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="welcome-screen">
                            <div className="welcome-screen__icon">
                                <div className="welcome-icon-animation">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    <div className="welcome-icon-glow"></div>
                                </div>
                            </div>
                            <h2 className="welcome-screen__title">Search to know what's happening in the world?</h2>
                            <div className="welcome-screen__subtitle">
                                Ask me anything about current events, news, or trending topics
                            </div>

                        </div>
                    ) : (
                        <div className="messages">
                            {messages.map((message, index) => (
                                <div
                                    key={message.id}
                                    className={`message message--${message.sender} message--animate`}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className="message__avatar">
                                        {message.sender === 'user' ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="message__content">
                                        <div className="message__text">
                                            {message.text}
                                            {message.isStreaming && (
                                                <span className="message__cursor">|</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isTyping && !isStreaming && (
                                <div className="message message--bot">
                                    <div className="message__avatar">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <div className="message__content">
                                        <div className="message__typing">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isStreaming && (
                                <div className="message message--bot">
                                    <div className="message__avatar">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <div className="message__content">
                                        <div className="message__status">
                                            <div className="message__status-text">Connecting to NewsGpt...</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <div className="input-area">
                    <div className="input-container">
                        <div className="input-wrapper">
                            <textarea
                                ref={inputRef}
                                className="message-input"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Message NewsGpt..."
                                rows="1"
                                disabled={isStreaming}
                            />
                            <button
                                type="button"
                                className="send-button"
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isStreaming}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13" />
                                    <polygon points="22,2 15,22 11,13 2,9" />
                                </svg>
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {showCopyToast && (
                <div className="copy-toast">
                    <div className="copy-toast__content">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        Session ID copied!
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBot;

