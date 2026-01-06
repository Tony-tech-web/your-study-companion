import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, MessageCircle, Trash2, Filter, ArrowDownAZ } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

export default function History() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchConversations();
  }, [user, sortOrder]);

  const fetchConversations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: sortOrder === 'oldest' })
      .limit(50);

    if (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load history');
    } else {
      setConversations(data || []);
    }
    
    setIsLoading(false);
  };

  const clearHistory = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to clear history');
    } else {
      setConversations([]);
      toast.success('History cleared');
    }
  };

  const groupConversationsByDate = (convos: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {};
    
    convos.forEach(convo => {
      const date = new Date(convo.created_at).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(convo);
    });
    
    return groups;
  };

  const grouped = groupConversationsByDate(conversations);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <HistoryIcon className="h-8 w-8 text-accent" />
            History
          </h1>
          <p className="text-muted-foreground">View your past AI interactions</p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant={sortOrder === 'newest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOrder('newest')}
                className="btn-smooth"
              >
                <ArrowDownAZ className="h-4 w-4 mr-1" />
                Newest First
              </Button>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40 glass-card">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="study">Study</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {conversations.length} conversations found
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearHistory}
                className="btn-smooth"
                disabled={conversations.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
              <p className="text-muted-foreground max-w-md">
                Start chatting with CARITAS AI to see your conversation history here. Your previous conversations will be automatically saved and organized for easy access.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, convos]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
                  <div className="space-y-2">
                    {convos.map((convo, index) => (
                      <motion.div
                        key={convo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-xl ${
                          convo.role === 'user' 
                            ? 'bg-primary/10 ml-8' 
                            : 'bg-muted/50 mr-8'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            convo.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-accent text-accent-foreground'
                          }`}>
                            {convo.role === 'user' ? 'U' : 'AI'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{convo.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(convo.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}