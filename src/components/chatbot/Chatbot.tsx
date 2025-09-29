import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      message: `Hello! I'm your Apigee AI Assistant with two modes:

🤖 **Agent Mode**: I can create proxies automatically for you (with confirmation)
💡 **Ask Mode**: I'll guide you like GitHub Copilot with suggestions and code

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-hide mode message after 3 seconds
  useEffect(() => {
    if (showModeMessage) {
      const timer = setTimeout(() => {
        setShowModeMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showModeMessage]);

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
        message: 'Sorry, I encountered an error. Please try again.',
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
        ? "🤖 **Agent Mode Activated** - I can now create proxies for you! Just describe what you need and I'll build it (after getting your confirmation)."
        : "💡 **Ask Mode Activated** - I'm now in guidance mode. I'll help you with suggestions, code examples, and best practices!",
      sender: 'bot',
      timestamp: new Date(),
      type: 'mode_change'
    };
    setMessages(prev => [...prev, modeMessage]);
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
          className="rounded-full w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl border-2 border-white/20 backdrop-blur-sm"
        >
          <MessageSquare className="h-7 w-7" />
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className={`fixed bottom-24 right-6 w-[440px] ${
              isMinimized ? 'h-16' : 'h-[700px]'
            } z-40 transition-all duration-300`}
          >
            <Card className="h-full flex flex-col shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              {/* Enhanced Header */}
              <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-t-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-transparent opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      {isAgentMode ? (
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Brain className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                          <HelpCircle className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-lg font-semibold">Apigee AI Assistant</div>
                        <div className="text-xs opacity-90 font-normal">
                          {isAgentMode ? 'Ready to create proxies' : 'Ready to help and guide'}
                        </div>
                      </div>
                    </CardTitle>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isAgentMode ? "destructive" : "secondary"}
                        className="bg-white/20 text-white border-white/30"
                      >
                        {isAgentMode ? "🤖 Agent" : "💡 Ask"}
                      </Badge>
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
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-4 mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm"
                    >
                      <span className={`text-sm transition-all duration-200 ${
                        !isAgentMode 
                          ? "font-semibold text-white" 
                          : "opacity-75 text-blue-100"
                      }`}>
                        💡 Ask Mode
                      </span>
                      <Switch
                        checked={isAgentMode}
                        onCheckedChange={handleModeSwitch}
                        className="data-[state=checked]:bg-white/30"
                      />
                      <span className={`text-sm transition-all duration-200 ${
                        isAgentMode 
                          ? "font-semibold text-white" 
                          : "opacity-75 text-blue-100"
                      }`}>
                        🤖 Agent Mode
                      </span>
                    </motion.div>
                  )}
                </div>
              </CardHeader>
              
              {/* Chat Content */}
              {!isMinimized && (
                <CardContent className="flex-1 flex flex-col p-0 bg-gradient-to-b from-gray-50 to-white">
                  {/* Mode Activation Banner */}
                  <AnimatePresence>
                    {showModeMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3"
                      >
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          {isAgentMode ? (
                            <>
                              <Brain className="h-4 w-4" />
                              <span className="font-medium">Agent Mode Active!</span>
                              <span className="text-blue-600">I can create proxies for you now.</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="h-4 w-4" />
                              <span className="font-medium">Ask Mode Active!</span>
                              <span className="text-blue-600">I'll provide guidance and suggestions.</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
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
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Input Area */}
                  <div className="border-t bg-white p-4">
                    <div className="flex gap-3">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isAgentMode 
                          ? "Describe the proxy you want me to create..."
                          : "Ask me about Apigee best practices..."
                        }
                        disabled={isLoading}
                        className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputMessage.trim()}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl px-4"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      {isAgentMode ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <Zap className="h-3 w-3" />
                          <span>Agent mode - I can create proxies automatically</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <Code className="h-3 w-3" />
                          <span>Ask mode - I'll provide guidance and suggestions</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;