import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  User, 
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatMessage as ChatMessageType } from "@/services/chatbot";

interface ChatMessageProps {
  message: ChatMessageType;
  onConfirm: (confirmed: boolean) => void;
  pendingConfirmation: any;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onConfirm, 
  pendingConfirmation 
}) => {
  const isUser = message.sender === 'user';
  
  const getMessageIcon = () => {
    switch (message.type) {
      case 'confirmation':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'mode_change':
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      default:
        return <Bot className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMessageBubbleStyle = () => {
    if (isUser) {
      return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto shadow-lg';
    }

    switch (message.type) {
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border border-red-200 shadow-sm';
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border border-green-200 shadow-sm';
      case 'confirmation':
        return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200 shadow-sm';
      case 'mode_change':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200 shadow-sm';
      default:
        return 'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow';
    }
  };

  const getAvatarStyle = () => {
    if (isUser) {
      return 'bg-gradient-to-br from-blue-600 to-blue-700 text-white';
    }

    switch (message.type) {
      case 'confirmation':
        return 'bg-gradient-to-br from-amber-100 to-amber-200';
      case 'success':
        return 'bg-gradient-to-br from-green-100 to-green-200';
      case 'error':
        return 'bg-gradient-to-br from-red-100 to-red-200';
      case 'mode_change':
        return 'bg-gradient-to-br from-purple-100 to-purple-200';
      default:
        return 'bg-gradient-to-br from-blue-100 to-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Bot Avatar */}
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${getAvatarStyle()}`}>
          {getMessageIcon()}
        </div>
      )}
      
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        <div className={`p-4 rounded-2xl ${getMessageBubbleStyle()}`}>
          {/* Message Content */}
          <div className="text-sm leading-relaxed">
            {message.message.split('\n').map((line, index) => {
              if (line.trim() === '') return <br key={index} />;
              
              // Handle markdown-style formatting
              const formattedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
                
              return (
                <div 
                  key={index} 
                  dangerouslySetInnerHTML={{ __html: formattedLine }}
                  className="mb-1 last:mb-0"
                />
              );
            })}
          </div>
          
          {/* Confirmation Buttons */}
          {message.type === 'confirmation' && pendingConfirmation && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 mt-4 pt-3 border-t border-amber-200"
            >
              <Button
                size="sm"
                onClick={() => onConfirm(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Yes, Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirm(false)}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                Cancel
              </Button>
            </motion.div>
          )}
          
          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-black/10">
            <Clock className="h-3 w-3 opacity-50" />
            <span className="text-xs opacity-70">
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </div>
      
      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;