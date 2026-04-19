import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  ChevronDown,
  RefreshCw
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PdfUploader } from '@/components/ai/PdfUploader';
import { PdfLibrary } from '@/components/ai/PdfLibrary';
import { QuickActionsGrid } from '@/components/ai/QuickActionsGrid';
import { usePdfLibrary, PdfFile } from '@/hooks/usePdfLibrary';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type StudyMode = 'chat' | 'teach' | 'test';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('google');
  const [activeTab, setActiveTab] = useState<'learn' | 'test' | 'library'>('learn');

  // Persist general chat history
  const [generalMessages, setGeneralMessages] = useState<Message[]>([]);

  useEffect(() => {
      const state = location.state as { initialMessages?: Message[] } | null;
      if (state?.initialMessages) {
          setMessages(state.initialMessages);
      }
  }, [location.state]);

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
  const [pdfImages, setPdfImages] = useState<string[]>([]);
  const [ocrContext, setOcrContext] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; isScanning: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { pdfs, isLoading: pdfsLoading, isUploading, uploadPdf, deletePdf, extractPdfContent, getPdfVisualContext, refreshPdfs } = usePdfLibrary();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePdfSelect = async (pdf: PdfFile, mode: 'teach' | 'test') => {
    if (!selectedPdf) {
        setGeneralMessages(messages);
    }
    
    setIsExtractingPdf(true);
    setSelectedPdf(pdf);
    setStudyMode(mode);
    setMessages([]);
    
    try {
      // 1. Get initial text and the first 2 images
      const [text, images] = await Promise.all([
        extractPdfContent(pdf),
        getPdfVisualContext(pdf, 1, 2)
      ]);
      
      if (text) {
        setPdfContext(text);
        setPdfImages(images || []);
        
        // Initialize scan progress (extracting page count from text if possible, or just default)
        // Note: The Edge Function returns [Page N] tags, we can use that to estimate total
        const pageCountOffset = text.lastIndexOf('[Page ');
        const estimatedTotal = pageCountOffset !== -1 
          ? parseInt(text.substring(pageCountOffset + 6, text.indexOf(']', pageCountOffset))) 
          : 5;
          
        setScanProgress({ current: Math.min(2, estimatedTotal), total: estimatedTotal, isScanning: true });
        
        toast.success(`PDF loaded! Starting with first 2 pages...`);
        
        const initialMessage = mode === 'teach' 
          ? `I've uploaded a PDF document. Please help me learn and understand the content. Start by giving me an overview of the FIRST 2 PAGES. Then ask me if I'm ready to continue to the next 2 pages.`
          : "I've uploaded a PDF document. Please start testing me on this content. Ask me questions one by one.";
        
        setInput(initialMessage);
        setOcrContext(null); // Reset cache for new batch
        setTimeout(() => sendMessage(text, mode, initialMessage, images || []), 100);
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
      handlePdfSelect(uploaded, 'teach');
      setActiveTab('learn');
    }
  };

  const clearSession = () => {
    setMessages([]);
    if (!selectedPdf) {
        setGeneralMessages([]);
    }
    setSelectedPdf(null);
    setPdfContext(null);
    setPdfImages([]);
    setScanProgress(null);
    setStudyMode('chat');
    toast.success('Session cleared');
  };

  const handleContinueScan = async () => {
    if (!scanProgress || !selectedPdf) return;
    
    const nextStart = scanProgress.current + 1;
    const nextBatchSize = 2; // Reduced for Hyper-Lean mode
    
    setIsExtractingPdf(true);
    try {
      const images = await getPdfVisualContext(selectedPdf, nextStart, nextBatchSize);
      const newCurrent = Math.min(scanProgress.current + nextBatchSize, scanProgress.total);
      
      setScanProgress({ ...scanProgress, current: newCurrent });
      setPdfImages(images || []);
      setOcrContext(null); // Reset cache for new batch
      
      const continueMsg = `I'm ready for the next section. Please scan pages ${nextStart} to ${newCurrent} and explain them.`;
      setInput('');
      await sendMessage(pdfContext || undefined, studyMode, continueMsg, images);
      
      if (newCurrent >= scanProgress.total) {
          toast.success("Full document scanned!");
      }
    } catch (error) {
      console.error("Continue scan error:", error);
      toast.error("Failed to scan next pages");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const switchToGeneralChat = () => {
      if (!selectedPdf) return;
      
      setSelectedPdf(null);
      setPdfContext(null);
      setPdfImages([]);
      setOcrContext(null);
      setStudyMode('chat');
      setMessages(generalMessages);
      setActiveTab('learn');
  };

  const sendMessage = async (contextOverride?: string, modeOverride?: StudyMode, inputOverride?: string, imagesOverride?: string[]) => {
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
      // Get the user's session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        toast.error('Please sign in to use the AI assistant');
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          providerId: selectedModel,
          pdfContext: contextOverride || pdfContext,
          pdfImages: imagesOverride || pdfImages,
          ocrContext: ocrContext, // Use cached OCR if available
          mode: modeOverride || studyMode,
          userId: user?.id,
          scanProgress: scanProgress ? { current: scanProgress.current, total: scanProgress.total } : null
        }),
      });

      // Handle OCR caching from headers
      const xOcr = resp.headers.get('x-ocr-context');
      if (xOcr && !ocrContext) {
        try {
          const decodedOcr = decodeURIComponent(xOcr);
          setOcrContext(decodedOcr);
        } catch (e) {
          console.warn("Failed to decode OCR context header:", e);
        }
      }

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
        const errorData = await resp.json().catch(() => ({}));
        console.error('AI error response:', resp.status, errorData);
        
        // Provide helpful error messages
        if (resp.status === 500 && errorData.error?.includes('OPENROUTER_API_KEY')) {
          throw new Error('AI service configuration error. Please contact support.');
        }
        
        throw new Error(errorData.error || errorData.details || 'Failed to get response');
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

      if (assistantContent && user?.id) {
          const contentWithModel = `{{model:${selectedModel}}}${assistantContent}`;
          await supabase.from('ai_conversations').insert({
              user_id: user.id,
              role: 'assistant',
              content: contentWithModel
          });
      }

    } catch (error) {
      console.error('AI chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response. Please try again.');
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

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
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
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto pr-1">
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
                                onClick={switchToGeneralChat}
                             >
                                <Bot className="h-4 w-4 mr-2" />
                                General Chat
                             </Button>

                             {pdfs.map((pdf) => (
                                <div key={pdf.id} className="group relative pr-1">
                                    {selectedPdf?.id === pdf.id && (
                                      <motion.div 
                                        layoutId="active-pdf-indicator"
                                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent rounded-full z-10"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                      />
                                    )}
                                    <div className="flex items-center gap-1 w-full pl-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`flex-1 justify-start truncate transition-all duration-300 relative group/btn ${
                                              selectedPdf?.id === pdf.id 
                                                ? 'bg-accent/10 border-accent/20 border text-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]' 
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                                            }`}
                                            onClick={() => handlePdfSelect(pdf, 'teach')}
                                        >
                                            <BookOpen className={`h-3.5 w-3.5 mr-2.5 flex-shrink-0 transition-colors ${selectedPdf?.id === pdf.id ? 'text-accent' : 'text-muted-foreground group-hover/btn:text-foreground'}`} />
                                            <span className={`truncate font-medium ${selectedPdf?.id === pdf.id ? 'text-accent' : ''}`}>{pdf.file_name}</span>
                                            {selectedPdf?.id === pdf.id && (
                                                <div className="ml-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this PDF?')) {
                                                    deletePdf(pdf);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePdfUpload(file);
                            }}
                        />
                        <Button 
                            variant="outline" 
                            className="w-full glass-card border-dashed border-2 hover:bg-accent/5 hover:border-accent/50"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            {isUploading ? 'Uploading...' : 'Upload New PDF'}
                        </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="test" className="mt-0 h-full">
                  <div className="space-y-4">
                    {selectedPdf && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                            <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                                <h4 className="font-semibold text-sm mb-1 text-accent flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Active Document
                                </h4>
                                <p className="text-xs text-muted-foreground truncate mb-3 font-mono opacity-80">
                                    {selectedPdf.file_name}
                                </p>
                                <Button 
                                    className="w-full btn-gold gap-2 shadow-lg hover:shadow-xl transition-all" 
                                    onClick={() => handlePdfSelect(selectedPdf, 'test')}
                                >
                                    <ClipboardCheck className="h-4 w-4" />
                                    Start Test Session
                                </Button>
                            </div>
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/50" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-semibold">
                                    <span className="bg-background px-2 text-muted-foreground">Or Upload New</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <PdfUploader onUpload={async (file) => {
                      const uploaded = await uploadPdf(file);
                      if (uploaded) handlePdfSelect(uploaded, 'test');
                    }} isUploading={isUploading} />
                    
                    <div className="text-center text-sm text-muted-foreground px-4">
                      <p>
                          Upload a PDF or select one from the{' '}
                          <button onClick={() => setActiveTab('learn')} className="text-accent hover:underline font-medium">
                              Library
                          </button>
                          {' '}to start a quiz.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

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
                  <h3 className="font-display text-xl font-semibold">Scanning Content...</h3>
                  <p className="text-muted-foreground">Preparing your study session...</p>
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
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}
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

          <div className="border-t border-border/50 p-4 bg-muted/30 flex flex-col gap-3">
            {scanProgress && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-muted-foreground">Document Progress:</span>
                    <span className="text-accent">{scanProgress.current} / {scanProgress.total} pages</span>
                  </div>
                  {scanProgress.current < scanProgress.total && !isLoading && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleContinueScan}
                      className="h-7 text-[10px] uppercase tracking-wider font-bold bg-accent/10 hover:bg-accent/20 text-accent btn-smooth"
                    >
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Scan Next 2
                    </Button>
                  )}
                  {scanProgress.current >= scanProgress.total && !isLoading && studyMode === 'teach' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setStudyMode('test');
                        setActiveTab('test');
                        sendMessage(pdfContext || undefined, 'test', "I've finished reading the document. Please start testing me now!");
                      }}
                      className="h-7 text-[10px] uppercase tracking-wider font-bold bg-gold/10 hover:bg-gold/20 text-gold-foreground btn-smooth"
                    >
                      <ClipboardCheck className="h-3 w-3 mr-1.5" />
                      Start Review Test
                    </Button>
                  )}
                </div>
                <div className="h-1.5 w-full bg-accent/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                    className="h-full bg-gradient-to-r from-accent to-gold shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
                  />
                </div>
              </div>
            )}
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
