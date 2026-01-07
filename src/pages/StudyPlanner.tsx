import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, BookOpen, Clock, Target, Sparkles, Trash2, Check, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  hours: number;
  deadline?: string;
}

interface StudyPlan {
  id: string;
  name: string;
  subjects: Subject[];
  total_hours: number;
  is_active: boolean;
  created_at: string;
}

export default function StudyPlanner() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: '', hours: 10, deadline: '' }
  ]);
  const [planName, setPlanName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsed = (data || []).map(p => ({
        ...p,
        subjects: p.subjects as unknown as Subject[],
      }));
      setPlans(parsed);
    } catch (error) {
      console.error('Error fetching study plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSubject = () => {
    setSubjects([...subjects, {
      id: Date.now().toString(),
      name: '',
      hours: 10,
      deadline: ''
    }]);
  };

  const updateSubject = (id: string, field: keyof Subject, value: string | number) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSubject = (id: string) => {
    if (subjects.length === 1) {
      toast.error('You need at least one subject');
      return;
    }
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const createPlan = async () => {
    if (!user) return;
    
    const validSubjects = subjects.filter(s => s.name.trim());
    if (validSubjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    setIsSaving(true);
    try {
      const totalHours = validSubjects.reduce((sum, s) => sum + s.hours, 0);
      
      const { error } = await supabase.from('study_plans').insert([{
        user_id: user.id,
        name: planName || `Study Plan ${plans.length + 1}`,
        subjects: validSubjects as any,
        total_hours: totalHours,
        is_active: true,
      }]);

      if (error) throw error;

      // Log activity
      await supabase.from('learning_activity').insert({
        user_id: user.id,
        activity_type: 'study_plan',
        activity_count: 1,
      });

      toast.success('Study plan created successfully!');
      setPlanName('');
      setSubjects([{ id: '1', name: '', hours: 10, deadline: '' }]);
      fetchPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create study plan');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const { error } = await supabase.from('study_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plan deleted');
      fetchPlans();
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const toggleActive = async (plan: StudyPlan) => {
    try {
      const { error } = await supabase
        .from('study_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);
      
      if (error) throw error;
      fetchPlans();
    } catch (error) {
      toast.error('Failed to update plan');
    }
  };

  const loadPlanForEdit = (plan: StudyPlan) => {
    setPlanName(plan.name);
    setSubjects(plan.subjects);
    toast.success('Plan loaded for editing');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-accent" />
            Study Planner
          </h1>
          <p className="text-muted-foreground">Create personalized study schedules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Plan */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-accent" />
              Create Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Plan Name</label>
              <Input
                placeholder="e.g., Exam Week, Finals Prep"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="glass-card"
              />
            </div>

            {/* Subjects */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">Subjects</label>
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-2 items-end"
                >
                  <div className="col-span-5">
                    <Input
                      placeholder="Subject name"
                      value={subject.name}
                      onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={subject.hours}
                      onChange={(e) => updateSubject(subject.id, 'hours', parseInt(e.target.value) || 0)}
                      className="glass-card"
                      min={1}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="date"
                      value={subject.deadline}
                      onChange={(e) => updateSubject(subject.id, 'deadline', e.target.value)}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSubject(subject.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              <Button variant="outline" onClick={addSubject} className="w-full btn-smooth">
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </div>

            <div className="pt-4 border-t border-border/50">
              <Button onClick={createPlan} disabled={isSaving} className="w-full btn-gold btn-smooth">
                <Sparkles className="h-4 w-4 mr-2" />
                {isSaving ? 'Creating...' : 'Create Study Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Plans */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              My Study Plans
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">
                {plans.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-muted-foreground">No saved plans yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Create your first study plan!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-card p-4 rounded-xl hover-lift ${plan.is_active ? 'border-accent/50' : 'opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{plan.name}</h3>
                          {plan.is_active && (
                            <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full">Active</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.subjects.length} subject{plan.subjects.length !== 1 ? 's' : ''} • {plan.total_hours}h total
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.subjects.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {s.name}
                            </span>
                          ))}
                          {plan.subjects.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{plan.subjects.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(plan)}
                          className={plan.is_active ? 'text-accent' : 'text-muted-foreground'}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => loadPlanForEdit(plan)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePlan(plan.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
