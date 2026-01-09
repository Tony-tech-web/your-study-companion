import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  Brain, 
  HelpCircle, 
  BookOpen,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudyToolsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfId?: string;
  pdfName?: string;
  pdfContent?: string;
}

type ToolType = 'notes' | 'flashcards' | 'quiz' | 'summary';

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export function StudyToolsModal({ 
  open, 
  onOpenChange, 
  pdfId, 
  pdfName,
  pdfContent 
}: StudyToolsModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const tools = [
    { 
      id: 'notes' as ToolType, 
      title: 'Generate Notes', 
      description: 'Create organized study notes',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'flashcards' as ToolType, 
      title: 'Create Flashcards', 
      description: 'Auto-generate flashcards for review',
      icon: Brain,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'quiz' as ToolType, 
      title: 'Practice Quiz', 
      description: 'Test your knowledge',
      icon: HelpCircle,
      color: 'from-orange-500 to-red-500'
    },
    { 
      id: 'summary' as ToolType, 
      title: 'Key Concepts', 
      description: 'Extract important concepts',
      icon: BookOpen,
      color: 'from-green-500 to-emerald-500'
    },
  ];

  const handleGenerateTool = async (toolType: ToolType) => {
    if (!pdfContent && !pdfId) {
      toast.error('No document content available');
      return;
    }

    setSelectedTool(toolType);
    setIsGenerating(true);
    setGeneratedContent(null);
    setCurrentFlashcardIndex(0);
    setShowFlashcardAnswer(false);
    setSelectedAnswers({});
    setShowQuizResults(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-study-tools', {
        body: {
          toolType,
          content: pdfContent || 'Sample content for demonstration',
          pdfId,
        },
      });

      if (error) throw error;

      setGeneratedContent(data);
      toast.success(`${tools.find(t => t.id === toolType)?.title} generated!`);
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content. Please try again.');
      setSelectedTool(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    setSelectedTool(null);
    setGeneratedContent(null);
    setCurrentFlashcardIndex(0);
    setShowFlashcardAnswer(false);
    setSelectedAnswers({});
    setShowQuizResults(false);
  };

  const renderFlashcards = (flashcards: Flashcard[]) => {
    const currentCard = flashcards[currentFlashcardIndex];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentFlashcardIndex + 1} / {flashcards.length}
          </span>
        </div>

        <motion.div
          key={currentFlashcardIndex}
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          className="min-h-[200px] p-6 glass-card rounded-xl cursor-pointer"
          onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
        >
          <div className="text-center">
            <p className="text-xs text-accent mb-2 uppercase tracking-wide">
              {showFlashcardAnswer ? 'Answer' : 'Question'}
            </p>
            <p className="text-lg font-medium">
              {showFlashcardAnswer ? currentCard.back : currentCard.front}
            </p>
            {!showFlashcardAnswer && (
              <p className="text-xs text-muted-foreground mt-4">Click to reveal answer</p>
            )}
          </div>
        </motion.div>

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentFlashcardIndex(Math.max(0, currentFlashcardIndex - 1));
              setShowFlashcardAnswer(false);
            }}
            disabled={currentFlashcardIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentFlashcardIndex(Math.min(flashcards.length - 1, currentFlashcardIndex + 1));
              setShowFlashcardAnswer(false);
            }}
            disabled={currentFlashcardIndex === flashcards.length - 1}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderQuiz = (questions: QuizQuestion[]) => {
    if (showQuizResults) {
      const score = questions.reduce((acc, q, idx) => {
        return acc + (selectedAnswers[idx] === q.correct ? 1 : 0);
      }, 0);
      
      return (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          
          <div className="text-center p-6 glass-card rounded-xl">
            <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
            <p className="text-4xl font-display text-accent mb-2">
              {score}/{questions.length}
            </p>
            <p className="text-muted-foreground">
              {score === questions.length ? 'Perfect score! 🎉' : 
               score >= questions.length / 2 ? 'Good job! Keep practicing! 📚' : 
               'Keep studying, you\'ll improve! 💪'}
            </p>
          </div>

          <Button className="w-full btn-gold" onClick={() => {
            setSelectedAnswers({});
            setShowQuizResults(false);
          }}>
            Retry Quiz
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="glass-card p-4 rounded-xl">
                <p className="font-medium mb-3">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedAnswers[qIdx] === oIdx
                          ? 'bg-accent/20 border-accent border'
                          : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <span className="text-sm">{option}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Button 
          className="w-full btn-gold" 
          onClick={() => setShowQuizResults(true)}
          disabled={Object.keys(selectedAnswers).length < questions.length}
        >
          Submit Quiz ({Object.keys(selectedAnswers).length}/{questions.length} answered)
        </Button>
      </div>
    );
  };

  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
          <p className="text-muted-foreground">Generating {selectedTool}...</p>
        </div>
      );
    }

    if (selectedTool && generatedContent) {
      switch (selectedTool) {
        case 'flashcards':
          return renderFlashcards(generatedContent.flashcards || []);
        case 'quiz':
          return renderQuiz(generatedContent.questions || []);
        case 'notes':
        case 'summary':
          return (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <ScrollArea className="h-[400px]">
                <div className="prose prose-sm dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">
                    {generatedContent.content || generatedContent.notes || generatedContent.summary}
                  </div>
                </div>
              </ScrollArea>
            </div>
          );
      }
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleGenerateTool(tool.id)}
              className="glass-card p-4 rounded-xl hover-lift text-left group"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{tool.title}</h3>
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Study Tools
            {pdfName && (
              <span className="text-sm font-normal text-muted-foreground ml-2 truncate max-w-[200px]">
                - {pdfName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
