import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, Sparkles, Trash2, BookOpen, ClipboardCheck, Library, Upload, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ModelSelector, AIModel } from '@/components/ai/ModelSelector';
import { PdfUploader } from '@/components/ai/PdfUploader';
import { PdfLibrary } from '@/components/ai/PdfLibrary';
import { usePdfLibrary, PdfFile } from '@/hooks/usePdfLibrary';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type StudyMode = 'chat' | 'teach' | 'test';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-flash');
  const [activeTab, setActiveTab] = useState<'learn' | 'test' | 'library'>('learn');
  const [studyMode, setStudyMode] = useState<StudyMode>('chat');
  const [selectedPdf, setSelectedPdf] = useState<PdfFile | null>(null);
  const [pdfContext, setPdfContext] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { pdfs, isLoading: pdfsLoading, isUploading, uploadPdf, deletePdf, extractPdfContent, refreshPdfs } = usePdfLibrary();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePdfSelect = async (pdf: PdfFile, mode: 'teach' | 'test') => {
    setIsExtractingPdf(true);
    setSelectedPdf(pdf);
    setStudyMode(mode);
    setMessages([]);
    
    try {
      const text = await extractPdfContent(pdf);
      if (text) {
        setPdfContext(text);
        toast.success(`PDF loaded! Starting ${mode === 'teach' ? 'learning' : 'test'} session...`);
        
        // Auto-send first message to start the session
        const initialMessage = mode === 'teach' 
          ? "I've uploaded a PDF document. Please help me learn and understand the content. Start by giving me an overview of what this document covers."
          : "I've uploaded a PDF document. Please start testing me on this content. Ask me questions one by one.";
        
        setInput(initialMessage);
        setTimeout(() => sendMessage(text, mode, initialMessage), 100);
      }
    } catch (error) {
      console.error('Error selecting PDF:', error);
      toast.error('Failed to load PDF content');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    const uploaded = await uploadPdf(file);
    if (uploaded) {
      // Auto-select for learning
      handlePdfSelect(uploaded, 'teach');
    }
  };

  const clearSession = () => {
    setMessages([]);
    setSelectedPdf(null);
    setPdfContext(null);
    setStudyMode('chat');
    toast.success('Session cleared');
  };

  const sendMessage = async (contextOverride?: string, modeOverride?: StudyMode, inputOverride?: string) => {
    const messageText = inputOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          pdfContext: contextOverride || pdfContext,
          mode: modeOverride || studyMode,
        }),
      });

      if (resp.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        toast.error('AI usage limit reached. Please try again later.');
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error('Failed to get response');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (nextChunk: string) => {
        assistantContent += nextChunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [
            ...prev,
            { id: Date.now().toString(), role: 'assistant', content: assistantContent },
          ];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      toast.error('Failed to get AI response. Please try again.');
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-accent" />
            AI Study Assistant
          </h1>
          <p className="text-muted-foreground">Upload PDFs, learn with AI, and test your knowledge</p>
        </div>
        <div className="flex items-center gap-3">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={isLoading} />
          {(messages.length > 0 || selectedPdf) && (
            <Button variant="outline" size="sm" onClick={clearSession} className="glass-card btn-smooth">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active PDF Badge */}
      {selectedPdf && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="glass-card inline-flex items-center gap-2 px-4 py-2 rounded-full">
            <BookOpen className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{selectedPdf.file_name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
              {studyMode === 'teach' ? 'Learning Mode' : 'Test Mode'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              onClick={clearSession}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <Card className="glass-card h-full overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 m-2 mr-4">
                <TabsTrigger value="learn" className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Learn
                </TabsTrigger>
                <TabsTrigger value="test" className="flex items-center gap-1">
                  <ClipboardCheck className="h-4 w-4" />
                  Test
                </TabsTrigger>
                <TabsTrigger value="library" className="flex items-center gap-1">
                  <Library className="h-4 w-4" />
                  Library
                </TabsTrigger>
              </TabsList>

              <CardContent className="flex-1 overflow-auto p-3">
                <TabsContent value="learn" className="mt-0 h-full">
                  <div className="space-y-4">
                    <PdfUploader onUpload={handlePdfUpload} isUploading={isUploading} />
                    <div className="text-center text-sm text-muted-foreground">
                      <p>Upload a PDF and I'll help you learn the content through interactive teaching.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="test" className="mt-0 h-full">
                  <div className="space-y-4">
                    <PdfUploader onUpload={async (file) => {
                      const uploaded = await uploadPdf(file);
                      if (uploaded) handlePdfSelect(uploaded, 'test');
                    }} isUploading={isUploading} />
                    <div className="text-center text-sm text-muted-foreground">
                      <p>Upload a PDF and I'll quiz you with questions from the content.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="library" className="mt-0 h-full">
                  <PdfLibrary
                    pdfs={pdfs}
                    isLoading={pdfsLoading}
                    onSelect={handlePdfSelect}
                    onDelete={deletePdf}
                    selectedPdfId={selectedPdf?.id}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden glass-card">
          <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isExtractingPdf ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold">Analyzing PDF...</h3>
                  <p className="text-muted-foreground">Extracting content from your document</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                    <Bot className="h-10 w-10 text-accent" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold mb-2">
                    Ready to Help You Learn!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Upload a PDF to start learning, or ask me anything about your studies.
                  </p>
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="justify-start glass-card btn-smooth"
                      onClick={() => setInput('Explain the concept of photosynthesis in simple terms')}
                    >
                      💡 Explain photosynthesis simply
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start glass-card btn-smooth"
                      onClick={() => setInput('Help me understand calculus derivatives')}
                    >
                      📐 Explain calculus derivatives
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start glass-card btn-smooth"
                      onClick={() => setInput('Create a study plan for my upcoming exams')}
                    >
                      📚 Create a study plan
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          message.role === 'user'
                            ? 'chat-message-user'
                            : 'chat-message-assistant'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="chat-message-assistant flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="border-t border-border/50 p-4 bg-muted/30">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  studyMode === 'test'
                    ? 'Type your answer...'
                    : studyMode === 'teach'
                    ? 'Ask questions about the content...'
                    : 'Ask me anything about your studies...'
                }
                className="resize-none min-h-[60px] input-focus-ring glass-card"
                rows={2}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="btn-gold px-6 btn-smooth"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
