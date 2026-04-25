import api from './api';
import { NewsItem } from '../types';

export const getNews = async (): Promise<NewsItem[]> => {
  const response = await api.get('/api/news');
  return response.data.map((item: any) => ({
    id: item.id,
    title: item.title,
    date: new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    image: item.image_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=60',
    category: item.category || 'School',
    excerpt: item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content,
  }));
};
