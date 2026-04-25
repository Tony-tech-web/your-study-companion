import api from './api';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  created_at: string;
}

export const getChatMessages = async (): Promise<ChatMessage[]> => {
  const response = await api.get('/api/chat');
  return response.data;
};

export const sendChatMessage = async (content: string, receiver_id?: string): Promise<ChatMessage> => {
  const response = await api.post('/api/chat', { content, receiver_id });
  return response.data;
};
