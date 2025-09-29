import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import ChatMessage from './ChatMessage';
import { 
  sendChatMessage, 
  confirmAction, 
  ChatMessage as ChatMessageType, 
  ChatResponse 
} from "@/services/chatbot";
import { 
  Bot, 
  Send, 
  MessageSquare, 
  Brain, 
  HelpCircle,
  Code,
  Zap,
  X,
  Minimize2,
  RefreshCw,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// **What I can help you with:**
// • Create and configure API proxies
// • Apply security policies (OAuth, API Keys, CORS)
// • Design rate limiting and quota policies
// • Troubleshoot proxy issues
// • Provide Apigee best practices
const EnhancedChatbot = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      message: `Hello! I'm your **Apigee AI Assistant** with two modes:

🤖 **Agent Mode**: I can create API proxies automatically for you
💡 **Ask Mode**: I'll provide expert guidance on APigee.

Which mode would you like to use?`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  const [userContext, setUserContext] = useState<any>({});
  const [showModeMessage, setShowModeMessage] = useState(false);
  
  // Resizing state
  const [chatSize, setChatSize] = useState({ width: 420, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'width' | 'height' | 'both' | null>(null);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // Auto-hide mode message after 3 seconds
  useEffect(() => {
    if (showModeMessage) {
      const timer = setTimeout(() => {
        setShowModeMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showModeMessage]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, type: 'width' | 'height' | 'both') => {
    e.preventDefault();
    setIsResizing(true);
    setResizeType(type);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...chatSize };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeType) return;

    const deltaX = resizeStartPos.current.x - e.clientX;
    const deltaY = e.clientY - resizeStartPos.current.y;

    setChatSize(prev => {
      const newSize = { ...prev };
      
      if (resizeType === 'width' || resizeType === 'both') {
        newSize.width = Math.max(350, Math.min(800, resizeStartSize.current.width + deltaX));
      }
      
      if (resizeType === 'height' || resizeType === 'both') {
        newSize.height = Math.max(400, Math.min(800, resizeStartSize.current.height + deltaY));
      }
      
      return newSize;
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeType(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      message: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Immediate scroll after adding user message
    setTimeout(scrollToBottom, 50);

    try {
      const response = await sendChatMessage(
        inputMessage, 
        isAgentMode ? 'agent' : 'ask',
        userContext
      );
      
      const botMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        message: response.response,
        sender: 'bot',
        timestamp: new Date(),
        type: response.requires_confirmation ? 'confirmation' : 'text'
      };

      setMessages(prev => [...prev, botMessage]);

      if (response.requires_confirmation) {
        setPendingConfirmation({
          action: 'create_proxy',
          details: response.details || {}
        });
      }
    } catch (error) {
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        message: 'Sorry, I encountered an error connecting to the AI service. Please check if the FastAPI service is running and try again.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!pendingConfirmation) return;

    try {
      const response = await confirmAction({
        action: pendingConfirmation.action,
        details: pendingConfirmation.details,
        user_confirmation: confirmed
      });

      const botMessage: ChatMessageType = {
        id: Date.now().toString(),
        message: response.response,
        sender: 'bot',
        timestamp: new Date(),
        type: response.action_completed ? 'success' : 'text'
      };

      setMessages(prev => [...prev, botMessage]);
      setPendingConfirmation(null);
    } catch (error) {
      console.error('Confirmation error:', error);
    }
  };

  const handleModeSwitch = (agentMode: boolean) => {
    setIsAgentMode(agentMode);
    setShowModeMessage(true);
    
    const modeMessage: ChatMessageType = {
      id: Date.now().toString(),
      message: agentMode 
        ? `🤖 **Agent Mode Activated!** Ready to automate things!!`
        : `💡 **Ask Mode Activated!** I'll now provide guidance on Apigee.`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'mode_change'
    };
    setMessages(prev => [...prev, modeMessage]);
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      message: `Chat cleared! I'm ready to help you with Apigee again.

Current mode: **${isAgentMode ? 'Agent Mode 🤖' : 'Ask Mode 💡'}**

How can I assist you today?`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
        {messages.length > 1 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {messages.length - 1 > 9 ? '9+' : messages.length - 1}
            </span>
          </div>
        )}
      </motion.div>

      {/* Chat Window - Resizable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className={`fixed bottom-20 right-6 z-40 ${isResizing ? 'select-none' : ''}`}
            style={{
              width: `${chatSize.width}px`,
              height: isMinimized ? '64px' : `${chatSize.height}px`
            }}
          >
            {/* Resize Handles */}
            {!isMinimized && (
              <>
                {/* Left resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/20 transition-colors z-10"
                  onMouseDown={(e) => handleResizeStart(e, 'width')}
                />
                
                {/* Top resize handle */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/20 transition-colors z-10"
                  onMouseDown={(e) => handleResizeStart(e, 'height')}
                />
                
                {/* Corner resize handle */}
                <div
                  className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/30 transition-colors z-10 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, 'both')}
                >
                  <GripVertical className="h-2 w-2 text-gray-400 rotate-45" />
                </div>
              </>
            )}

            <Card className="h-full flex flex-col shadow-2xl border-0 overflow-hidden">
              {/* Header */}
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      {isAgentMode ? (
                        <Brain className="h-5 w-5" />
                      ) : (
                        <HelpCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Apigee AI Assistant</div>
                      <div className="text-xs opacity-90">
                        {isAgentMode ? 'Agent Mode - Can create proxies' : 'Ask Mode - Provides guidance'}
                      </div>
                    </div>
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isAgentMode ? "destructive" : "secondary"}
                      className="bg-white/20 text-white border-white/30"
                    >
                      {isAgentMode ? "🤖" : "💡"}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="text-white hover:bg-white/20 p-1.5"
                      title="Clear Chat"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="text-white hover:bg-white/20 p-1.5"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="text-white hover:bg-white/20 p-1.5"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Mode Switch */}
                {!isMinimized && (
                  <div className="flex items-center justify-center gap-4 mt-3 p-3 bg-white/10 rounded-lg">
                    <span className={`text-sm ${
                      !isAgentMode ? "font-semibold text-white" : "opacity-75"
                    }`}>
                      💡 Ask Mode
                    </span>
                    <Switch
                      checked={isAgentMode}
                      onCheckedChange={handleModeSwitch}
                      className="data-[state=checked]:bg-white/30"
                    />
                    <span className={`text-sm ${
                      isAgentMode ? "font-semibold text-white" : "opacity-75"
                    }`}>
                      🤖 Agent Mode
                    </span>
                  </div>
                )}
              </CardHeader>
              
              {/* Chat Content */}
              {!isMinimized && (
                <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
                  {/* Mode Activation Banner */}
                  <AnimatePresence>
                    {showModeMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-blue-50 border-b border-blue-200 p-3 flex-shrink-0"
                      >
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          {isAgentMode ? (
                            <>
                              <Brain className="h-4 w-4" />
                              <span>Agent Mode Active - I can create proxies for you</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="h-4 w-4" />
                              <span>Ask Mode Active - I'll provide guidance and examples</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages Area - Fixed Scrolling */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    style={{ 
                      minHeight: 0,
                      maxHeight: '100%'
                    }}
                  >
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onConfirm={handleConfirmAction}
                        pendingConfirmation={pendingConfirmation}
                      />
                    ))}
                    
                    {/* Loading Animation */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 justify-start"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-blue-600 animate-pulse" />
                        </div>
                        <div className="bg-white border p-3 rounded-lg shadow-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Input Area - Fixed at Bottom */}
                  <div className="border-t bg-white p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isAgentMode 
                          ? "Describe the proxy you want me to create..."
                          : "Ask me about Apigee best practices..."
                        }
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        {isAgentMode ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <Zap className="h-3 w-3" />
                            <span>Agent mode</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <Code className="h-3 w-3" />
                            <span>Ask mode</span>
                          </>
                        )}
                      </div>
                      <span>Press Enter to send • {chatSize.width}×{chatSize.height}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize cursor overlay */}
      {isResizing && (
        <div 
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ 
            cursor: resizeType === 'width' ? 'ew-resize' : 
                    resizeType === 'height' ? 'ns-resize' : 'nw-resize'
          }}
        />
      )}
    </>
  );
};

export default EnhancedChatbot;