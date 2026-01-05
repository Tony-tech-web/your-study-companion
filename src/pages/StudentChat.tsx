import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Loader2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

export default function StudentChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Check if message already exists to prevent duplicates
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Fetch sender name if not cached (deferred)
          if (!profiles[newMessage.sender_id]) {
            setTimeout(() => {
              supabase
                .from('profiles')
                .select('full_name, email_username')
                .eq('user_id', newMessage.sender_id)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) {
                    setProfiles((prev) => ({
                      ...prev,
                      [newMessage.sender_id]: data.full_name || data.email_username || 'Student',
                    }));
                  }
                });
            }, 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profiles]);

  const fetchMessages = async () => {
    const { data: messagesData, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      toast.error('Failed to load messages');
      setLoading(false);
      return;
    }

    if (messagesData) {
      // Fetch all unique sender profiles
      const senderIds = [...new Set(messagesData.map((m) => m.sender_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email_username')
        .in('user_id', senderIds);

      if (profilesData) {
        const profileMap: Record<string, string> = {};
        profilesData.forEach((p) => {
          profileMap[p.user_id] = p.full_name || p.email_username || 'Student';
        });
        setProfiles(profileMap);
      }

      setMessages(messagesData as ChatMessage[]);
    }

    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || sending) return;

    setSending(true);
    const content = input.trim();
    setInput('');

    const { error } = await supabase.from('chat_messages').insert({
      sender_id: user.id,
      content,
    });

    if (error) {
      toast.error('Failed to send message');
      setInput(content);
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-accent" />
            Student Chat
          </h1>
          <p className="text-muted-foreground">Connect with fellow students</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="text-sm">Community Chat</span>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="font-display text-xl font-semibold mb-2">No messages yet</h2>
                <p className="text-muted-foreground">Be the first to start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  const senderName = profiles[message.sender_id] || 'Student';

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!isOwn && (
                          <p className="text-xs text-muted-foreground mb-1 ml-2">
                            {senderName}
                          </p>
                        )}
                        <div
                          className={
                            isOwn ? 'chat-message-user' : 'chat-message-assistant'
                          }
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 px-2">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-4 bg-muted/30">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="input-focus-ring"
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="btn-gold px-6"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
