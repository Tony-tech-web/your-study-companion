import api from './api';

export interface AIConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Normalise backend response to always match our interface
const normalise = (item: any): AIConversationEntry => ({
  id: item.id ?? item.message_id ?? String(Date.now() + Math.random()),
  role: item.role as 'user' | 'assistant',
  content: item.content ?? '',
  created_at: item.created_at ?? new Date().toISOString(),
});

export const getAIConversations = async (): Promise<AIConversationEntry[]> => {
  const response = await api.get('/api/ai-conversations');
  const items: any[] = Array.isArray(response.data) ? response.data : [];
  return items.map(normalise);
};

export const saveAIConversation = async (
  role: 'user' | 'assistant',
  content: string
): Promise<AIConversationEntry> => {
  const response = await api.post('/api/ai-conversations', { role, content });
  return normalise(response.data);
};

export const clearAIConversations = async (): Promise<void> => {
  await api.delete('/api/ai-conversations');
};
