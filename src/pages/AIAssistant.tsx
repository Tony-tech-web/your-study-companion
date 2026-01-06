import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  Loader2, 
  Sparkles, 
  Trash2, 
  BookOpen, 
  ClipboardCheck, 
  Library, 
  Upload, 
  X,
  Zap,
  Brain,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PdfUploader } from '@/components/ai/PdfUploader';
import { PdfLibrary } from '@/components/ai/PdfLibrary';
import { QuickActionsGrid } from '@/components/ai/QuickActionsGrid';
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
  const [selectedModel, setSelectedModel] = useState<string>('google');
  const [activeTab, setActiveTab] = useState<'learn' | 'test' | 'library'>('learn');

  const getModelIcon = (id: string) => {
    switch(id) {
        case 'google': return <Zap className="h-4 w-4 text-yellow-400" />;
        case 'google-pro': return <Brain className="h-4 w-4 text-purple-400" />;
        case 'openrouter': return <Sparkles className="h-4 w-4 text-blue-400" />;
        default: return <Bot className="h-4 w-4" />;
    }
  };

  const getModelName = (id: string) => {
      switch(id) {
          case 'google': return "Gemini Flash";
          case 'google-pro': return "Gemini Pro";
          case 'openrouter': return "GPT-5 (Preview)";
          default: return "AI Assistant";
      }
  };
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
      setActiveTab('learn');
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
          providerId: selectedModel,
          pdfContext: contextOverride || pdfContext,
          mode: modeOverride || studyMode,
          userId: user?.id,
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
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="glass-card gap-2 min-w-[160px] justify-between">
                        <div className="flex items-center gap-2">
                            {getModelIcon(selectedModel)}
                            <span>{getModelName(selectedModel)}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px] glass-card">
                    <DropdownMenuLabel>Select Model</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => setSelectedModel('google')} className="gap-2 cursor-pointer">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 font-medium">
                                <Zap className="h-4 w-4 text-yellow-400" />
                                Gemini Flash
                            </div>
                            <span className="text-xs text-muted-foreground">Fast & efficient</span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setSelectedModel('google-pro')} className="gap-2 cursor-pointer">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 font-medium">
                                <Brain className="h-4 w-4 text-purple-400" />
                                Gemini Pro
                            </div>
                            <span className="text-xs text-muted-foreground">Advanced reasoning</span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setSelectedModel('openrouter')} className="gap-2 cursor-pointer">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 font-medium">
                                <Sparkles className="h-4 w-4 text-blue-400" />
                                GPT-5
                            </div>
                            <span className="text-xs text-muted-foreground">Most powerful</span>
                        </div>
                    </DropdownMenuItem>

                </DropdownMenuContent>
             </DropdownMenu>

          {(messages.length > 0 || selectedPdf) && (
            <Button variant="outline" size="sm" onClick={clearSession} className="glass-card btn-smooth">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>



      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Box 1: Library Navigation */}
          <Card className={`glass-card p-2 ${activeTab === 'library' ? 'border-accent/50 bg-accent/5' : ''}`}>
             <Button
                variant={activeTab === 'library' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('library')}
                className={`w-full justify-start h-12 text-base font-medium ${activeTab === 'library' ? 'bg-accent text-white' : ''}`}
             >
                <Library className="mr-3 h-5 w-5" />
                Full Library
             </Button>
          </Card>

          {/* Box 2: Study Modes */}
          <Card className="glass-card flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab === 'library' ? '' : activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
              <div className="p-3 pb-0">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 pl-1">
                      Study Modes
                  </h3>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="learn" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Learn
                    </TabsTrigger>
                    <TabsTrigger value="test" className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Test
                    </TabsTrigger>
                  </TabsList>
              </div>

              <CardContent className="flex-1 overflow-auto p-3">
                <TabsContent value="learn" className="mt-0 h-full">
                  <div className="space-y-4">
                    <PdfUploader onUpload={handlePdfUpload} isUploading={isUploading} />
                    
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                Your Documents
                            </h4>
                            <span className="text-[10px] text-muted-foreground bg-accent/10 px-2 py-0.5 rounded-full">
                                {pdfs.length}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                             <Button
                                variant={!selectedPdf ? "secondary" : "ghost"}
                                size="sm"
                                className={`justify-start w-full ${!selectedPdf ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => {
                                    clearSession();
                                    setActiveTab('learn');
                                }}
                             >
                                <Bot className="h-4 w-4 mr-2" />
                                General Chat
                             </Button>

                             {pdfs.map((pdf) => (
                                <Button
                                    key={pdf.id}
                                    variant={selectedPdf?.id === pdf.id ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`justify-start w-full group ${selectedPdf?.id === pdf.id ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => handlePdfSelect(pdf, 'teach')}
                                >
                                    <BookOpen className="h-3 w-3 mr-2" />
                                    <span className="truncate">{pdf.file_name}</span>
                                    {selectedPdf?.id === pdf.id && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    )}
                                </Button>
                             ))}
                        </div>
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
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Main Content Area */}
        {activeTab === 'library' ? (
          <Card className="flex-1 flex flex-col overflow-hidden glass-card">
            <QuickActionsGrid
              pdfs={pdfs}
              onClearSession={() => {
                clearSession();
                setActiveTab('learn');
              }}
              onUpload={handlePdfUpload}
              onSelectPdf={(pdf) => {
                handlePdfSelect(pdf, 'teach');
                setActiveTab('learn');
              }}
              onDeletePdf={deletePdf}
              onRefresh={refreshPdfs}
              isRefreshing={pdfsLoading}
              showStartChat={false}
            />
          </Card>
        ) : (
          <Card className="flex-1 flex flex-col overflow-hidden glass-card">
          <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isExtractingPdf ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold">Scanning Document...</h3>
                  <p className="text-muted-foreground">Reading and scanning PDF content...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                    <Bot className="h-10 w-10 text-accent" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold mb-2">
                    Ready for a new session
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Ask me anything or go to the <b>Library</b> tab to select a PDF.
                  </p>
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
      )}
      </div>
    </div>
  );
}
