import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Calendar, Tag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
}

// Sample news data for display
const sampleNews: NewsItem[] = [
  {
    id: '1',
    title: 'Welcome to the New Academic Session',
    content: 'We are pleased to welcome all students to the 2024/2025 academic session. Please ensure you complete your registration before the deadline. The academic calendar has been uploaded to the student portal.',
    category: 'Academic',
    published_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Library Operating Hours Extended',
    content: 'To support your exam preparations, the university library will now be open from 7 AM to 11 PM on weekdays. Weekend hours remain 9 AM to 6 PM. Take advantage of the extended hours for your study sessions.',
    category: 'Facilities',
    published_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Career Fair Coming Next Month',
    content: 'Mark your calendars! The annual Career Fair will be held on the 15th of next month. Over 50 companies will be present for recruitment. Prepare your CVs and dress professionally. Registration opens next week.',
    category: 'Events',
    published_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '4',
    title: 'New AI Study Tools Available',
    content: 'Elizade AI is now available to all registered students. This AI-powered study assistant can help you understand complex topics, summarize materials, and prepare for exams. Access it from your student dashboard.',
    category: 'Technology',
    published_at: new Date(Date.now() - 259200000).toISOString(),
  },
];

export default function SchoolNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('school_news')
      .select('*')
      .order('published_at', { ascending: false });

    if (data && data.length > 0) {
      setNews(data as NewsItem[]);
    } else {
      // Use sample data if no news in database
      setNews(sampleNews);
    }
    setLoading(false);
  };

  const getCategoryColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'academic':
        return 'bg-primary text-primary-foreground';
      case 'events':
        return 'bg-accent text-accent-foreground';
      case 'facilities':
        return 'bg-success text-success-foreground';
      case 'technology':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-accent" />
          School News
        </h1>
        <p className="text-muted-foreground">Stay updated with the latest announcements</p>
      </div>

      <div className="grid gap-6">
        {news.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(item.category)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {item.category || 'General'}
                      </Badge>
                    </div>
                    <CardTitle className="font-display text-xl">{item.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Calendar className="h-4 w-4" />
                    {new Date(item.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{item.content}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {news.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="font-display text-xl font-semibold mb-2">No news yet</h2>
            <p className="text-muted-foreground">Check back later for updates</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
