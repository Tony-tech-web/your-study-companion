import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, BookOpen, Clock, Target, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  createdAt: Date;
}

export default function StudyPlanner() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: '1', name: '', hours: 10, deadline: '' }
  ]);
  const [planName, setPlanName] = useState('');

  const addSubject = () => {
    setSubjects([...subjects, {
      id: Date.now().toString(),
      name: '',
      hours: 10,
      deadline: ''
    }]);
  };

  const updateSubject = (id: string, field: keyof Subject, value: string | number) => {
    setSubjects(subjects.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const removeSubject = (id: string) => {
    if (subjects.length === 1) {
      toast.error('You need at least one subject');
      return;
    }
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const createPlan = () => {
    const validSubjects = subjects.filter(s => s.name.trim());
    if (validSubjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    const newPlan: StudyPlan = {
      id: Date.now().toString(),
      name: planName || `Study Plan ${plans.length + 1}`,
      subjects: validSubjects,
      createdAt: new Date(),
    };

    setPlans([newPlan, ...plans]);
    setPlanName('');
    setSubjects([{ id: '1', name: '', hours: 10, deadline: '' }]);
    toast.success('Study plan created successfully!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-accent" />
            Study Planner
          </h1>
          <p className="text-muted-foreground">Create AI-powered personalized study schedules</p>
        </div>
        <Button onClick={() => setPlanName('New Plan')} className="btn-gold btn-smooth">
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      {/* My Study Plans */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>My Study Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground">No saved plans yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create your first study plan to get started
              </p>
              <Button onClick={createPlan} variant="outline" className="mt-4 btn-smooth">
                Create Your First Plan
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 rounded-xl hover-lift"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.subjects.length} subjects • Created {plan.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Your Subjects */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Your Subjects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
            >
              <div className="md:col-span-5">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Subject Name
                </label>
                <Input
                  placeholder="e.g., Mathematics, Chemistry, History"
                  value={subject.name}
                  onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                  className="glass-card"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Study Hours Needed
                </label>
                <Input
                  type="number"
                  value={subject.hours}
                  onChange={(e) => updateSubject(subject.id, 'hours', parseInt(e.target.value) || 0)}
                  className="glass-card"
                  min={1}
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Exam/Deadline (Optional)
                </label>
                <Input
                  type="date"
                  value={subject.deadline}
                  onChange={(e) => updateSubject(subject.id, 'deadline', e.target.value)}
                  className="glass-card"
                />
              </div>
              <div className="md:col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubject(subject.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            </motion.div>
          ))}

          <Button 
            variant="outline" 
            onClick={addSubject} 
            className="w-full btn-smooth mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>

          <div className="flex justify-end pt-4">
            <Button onClick={createPlan} className="btn-gold btn-smooth">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Study Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}