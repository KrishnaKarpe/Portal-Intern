export interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'confirmation' | 'error' | 'success' | 'mode_change';
}

export interface ChatResponse {
  response: string;
  mode: 'ask' | 'agent';
  success: boolean;
  requires_confirmation?: boolean;
  details?: any;
  action_completed?: boolean;
}

export interface ProxyCreationRequest {
  name: string;
  targetUrl: string;
  basePath: string;
  organization: string;
  environment: string;
  token: string;
  description?: string;
}

const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8001';

export const sendChatMessage = async (
  message: string, 
  mode: 'ask' | 'agent' = 'ask',
  context?: any
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${CHATBOT_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        mode,
        user_context: context
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to send message');
    }

    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

export const confirmAction = async (confirmation: {
  action: string;
  details: any;
  user_confirmation: boolean;
}): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${CHATBOT_API_URL}/confirm-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(confirmation),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to confirm action');
    }

    return data;
  } catch (error) {
    console.error('Error confirming action:', error);
    throw error;
  }
};

export const createProxyViaBot = async (proxyData: ProxyCreationRequest): Promise<any> => {
  try {
    const response = await fetch(`${CHATBOT_API_URL}/create-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to create proxy');
    }

    return data;
  } catch (error) {
    console.error('Error creating proxy:', error);
    throw error;
  }
};