import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, MessageCircle, Trash2, Filter, ArrowDownAZ, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [category, setCategory] = useState('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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

  const getModelName = (id: string) => {
      switch(id) {
          case 'google': return "Gemini Flash";
          case 'google-pro': return "Gemini Pro";
          case 'openrouter': return "GPT-5";
          default: return "AI";
      }
  };

  const extractModelInfo = (content: string) => {
      const match = content.match(/^{{model:([^}]+)}}/);
      if (match) {
          return { model: match[1], text: content.replace(match[0], '') };
      }
      return { model: null, text: content };
  };

  const groupConversationsByDate = (convos: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {};
    
    convos.forEach(convo => {
      const date = new Date(convo.created_at).toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(convo);
    });
    
    return groups;
  };

  const resumeSession = (convos: Conversation[]) => {
       const formatted = convos.map(c => {
           const { text } = extractModelInfo(c.content);
           return {
               id: c.id,
               role: c.role as 'user' | 'assistant',
               content: text
           };
       });
       navigate('/dashboard/ai-assistant', { state: { initialMessages: formatted } });
       toast.success("Resuming session from " + new Date(convos[0].created_at).toLocaleDateString());
  };

  const toggleExpand = (date: string) => {
      setExpandedDate(expandedDate === date ? null : date);
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

      <div className="flex items-center gap-3 mb-6">
          <Button
            variant="destructive"
            size="sm"
            onClick={clearHistory}
            className="btn-smooth ml-auto"
            disabled={conversations.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : conversations.length === 0 ? (
        <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
              <p className="text-muted-foreground max-w-md">
                Start chatting with CARITAS AI to see your conversation history here.
              </p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, convos]) => (
            <Card key={date} className="glass-card hover:shadow-lg transition-all border-border/50 overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-medium flex items-center gap-2">
                                {date}
                                <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                    {convos.length} messages
                                </span>
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {new Date(convos[0].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(convos[convos.length-1].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => toggleExpand(date)}
                            >
                                {expandedDate === date ? (
                                    <>Minimise <ChevronUp className="h-4 w-4" /></>
                                ) : (
                                    <>Read More <ChevronDown className="h-4 w-4" /></>
                                )}
                            </Button>
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                                onClick={() => resumeSession(convos)}
                            >
                                <Play className="h-4 w-4" /> Resume Chat
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                
                <AnimatePresence>
                    {(expandedDate === date) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CardContent className="pt-4 border-t border-border/50 bg-background/50">
                                <div className="space-y-4 pl-4 border-l-2 border-muted">
                                    {convos.map((convo, index) => {
                                      const { model, text } = extractModelInfo(convo.content);
                                      return (
                                          <div key={convo.id} className="relative group">
                                               <div className={`text-xs font-semibold mb-1 flex items-center gap-2 ${
                                                    convo.role === 'user' ? 'text-primary' : 'text-accent'
                                               }`}>
                                                    {convo.role === 'user' ? 'YOU' : 'AI'}
                                                    {model && <span className="text-[10px] bg-accent/10 px-1 rounded">{getModelName(model)}</span>}
                                                    <span className="text-[10px] text-muted-foreground font-light ml-auto">
                                                        {new Date(convo.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                               </div>
                                               <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-transparent hover:border-border transition-colors">
                                                   {text}
                                               </p>
                                          </div>
                                      );
                                    })}
                                </div>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}