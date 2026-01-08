import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, AlertTriangle, Target, Sparkles, 
  Brain, Clock, BookOpen, Heart, RefreshCw, Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tip {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'study' | 'time' | 'focus' | 'health';
}

const categoryIcons: Record<string, React.ElementType> = {
  study: BookOpen,
  time: Clock,
  focus: Brain,
  health: Heart,
};

const priorityColors: Record<string, string> = {
  high: 'border-red-500/50 bg-red-500/10',
  medium: 'border-amber-500/50 bg-amber-500/10',
  low: 'border-green-500/50 bg-green-500/10',
};

export default function Tips() {
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [interventionMessage, setInterventionMessage] = useState<string | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<string[]>([]);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [currentCgpa, setCurrentCgpa] = useState<number | null>(null);
  const [needsIntervention, setNeedsIntervention] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTips();
    }
  }, [user]);

  const fetchTips = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-study-tips', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      setTips(data.tips || []);
      setInterventionMessage(data.interventionMessage);
      setWeeklyGoals(data.weeklyGoals || []);
      setMotivationalMessage(data.motivationalMessage || '');
      setCurrentCgpa(data.currentCgpa);
      setNeedsIntervention(data.needsIntervention || false);
    } catch (error) {
      console.error('Failed to fetch tips:', error);
      toast.error('Failed to load study tips');
      // Set fallback tips
      setTips([
        { title: 'Review Notes Daily', description: 'Spend 15-30 minutes reviewing today\'s notes before bed.', priority: 'high', category: 'study' },
        { title: 'Active Recall Practice', description: 'Test yourself instead of just re-reading. Use flashcards.', priority: 'high', category: 'study' },
        { title: 'Take Regular Breaks', description: 'Use the Pomodoro technique: 25 min work, 5 min break.', priority: 'medium', category: 'focus' },
      ]);
      setMotivationalMessage('Keep pushing forward! Every study session brings you closer to your goals.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTips = async () => {
    setIsRefreshing(true);
    await fetchTips();
    setIsRefreshing(false);
    toast.success('Tips refreshed!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-accent" />
            Study Tips & Guidance
          </h1>
          <p className="text-muted-foreground">AI-powered personalized study recommendations</p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshTips}
          disabled={isRefreshing}
          className="btn-smooth"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Tips
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Intervention Alert */}
          <AnimatePresence>
            {needsIntervention && interventionMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="text-lg">Academic Support Needed</AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-2">Your current CGPA ({currentCgpa?.toFixed(2)}) is below 3.5. Here's personalized guidance:</p>
                    <p className="text-foreground">{interventionMessage}</p>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivational Message */}
          {motivationalMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-accent mb-1">Today's Motivation</h3>
                    <p className="text-muted-foreground">{motivationalMessage}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Study Tips */}
            <div className="lg:col-span-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent" />
                    Personalized Study Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tips.map((tip, index) => {
                    const Icon = categoryIcons[tip.category] || Lightbulb;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-xl border ${priorityColors[tip.priority]} hover-lift`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold">{tip.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                tip.priority === 'high' ? 'bg-red-500/20 text-red-500' :
                                tip.priority === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                                'bg-green-500/20 text-green-500'
                              }`}>
                                {tip.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{tip.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Weekly Goals */}
            <div>
              <Card className="glass-card h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-accent" />
                    Weekly Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weeklyGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Goals will appear based on your activity and CGPA.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {weeklyGoals.map((goal, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-accent">
                            {index + 1}
                          </div>
                          <p className="text-sm">{goal}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* CGPA Status */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Current CGPA</span>
                      <span className={`font-bold ${
                        currentCgpa && currentCgpa >= 3.5 ? 'text-green-500' : 
                        currentCgpa && currentCgpa >= 2.5 ? 'text-amber-500' : 
                        currentCgpa ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {currentCgpa?.toFixed(2) || 'Not recorded'}
                      </span>
                    </div>
                    {currentCgpa && (
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            currentCgpa >= 3.5 ? 'bg-green-500' : 
                            currentCgpa >= 2.5 ? 'bg-amber-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (currentCgpa / 5) * 100)}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentCgpa && currentCgpa >= 3.5 
                        ? '🎉 Great job! Keep up the excellent work!'
                        : currentCgpa && currentCgpa >= 2.5
                        ? '💪 You\'re doing well! Push for that 3.5+'
                        : currentCgpa
                        ? '📚 Focus on improvement - you can do this!'
                        : 'Record your GPA in the GPA Calculator'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
