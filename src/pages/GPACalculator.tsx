import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Plus, Trash2, Download, Upload, BookOpen, TrendingUp, Save, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Course {
  id: string;
  code: string;
  credits: number;
  grade: string;
}

interface GpaRecord {
  id: string;
  semester: string;
  gpa: number;
  total_credits: number;
  gpa_class: string;
  created_at: string;
}

const gradePoints: Record<string, number> = {
  'A': 5.0, 'B': 4.0, 'C': 3.0, 'D': 2.0, 'E': 1.0, 'F': 0.0,
};

const gradeOptions = [
  { value: 'A', label: 'A (5.0 points)' },
  { value: 'B', label: 'B (4.0 points)' },
  { value: 'C', label: 'C (3.0 points)' },
  { value: 'D', label: 'D (2.0 points)' },
  { value: 'E', label: 'E (1.0 points)' },
  { value: 'F', label: 'F (0.0 points)' },
];

const getGpaColor = (gpa: number) => {
  if (gpa >= 4.5) return 'text-green-500';
  if (gpa >= 3.5) return 'text-blue-500';
  if (gpa >= 2.5) return 'text-yellow-500';
  if (gpa >= 1.5) return 'text-orange-500';
  return 'text-red-500';
};

const getGpaClass = (gpa: number) => {
  if (gpa >= 4.5) return 'First Class';
  if (gpa >= 3.5) return 'Second Class Upper';
  if (gpa >= 2.5) return 'Second Class Lower';
  if (gpa >= 1.5) return 'Third Class';
  return 'Pass';
};

export default function GPACalculator() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', code: '', credits: 3, grade: 'A' },
  ]);
  const [gpa, setGpa] = useState<number | null>(null);
  const [semester, setSemester] = useState('');
  const [savedRecords, setSavedRecords] = useState<GpaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSavedRecords();
  }, [user]);

  const fetchSavedRecords = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gpa_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedRecords(data || []);
    } catch (error) {
      console.error('Error fetching GPA records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCourse = () => {
    setCourses([...courses, { id: Date.now().toString(), code: '', credits: 3, grade: 'A' }]);
  };

  const addMultipleCourses = (count: number) => {
    const newCourses = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      code: '',
      credits: 3,
      grade: 'A' as string,
    }));
    setCourses([...courses, ...newCourses]);
  };

  const removeCourse = (id: string) => {
    if (courses.length === 1) {
      toast.error('You need at least one course');
      return;
    }
    setCourses(courses.filter(c => c.id !== id));
  };

  const updateCourse = (id: string, field: keyof Course, value: string | number) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const calculateGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach(course => {
      if (course.credits > 0 && course.grade) {
        totalPoints += gradePoints[course.grade] * course.credits;
        totalCredits += course.credits;
      }
    });

    if (totalCredits === 0) {
      toast.error('Please add at least one course with credits');
      return;
    }

    const calculatedGpa = totalPoints / totalCredits;
    setGpa(calculatedGpa);
    toast.success(`Your GPA is ${calculatedGpa.toFixed(2)}`);
  };

  const saveGpaRecord = async () => {
    if (!user || gpa === null) {
      toast.error('Please calculate GPA first');
      return;
    }

    setIsSaving(true);
    try {
      const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
      const gpaClass = getGpaClass(gpa);

      const { error } = await supabase.from('gpa_records').insert([{
        user_id: user.id,
        semester: semester || `Semester ${savedRecords.length + 1}`,
        courses: courses as any,
        gpa: gpa,
        total_credits: totalCredits,
        gpa_class: gpaClass,
      }]);

      if (error) throw error;

      // Log activity
      await supabase.from('learning_activity').insert({
        user_id: user.id,
        activity_type: 'gpa_calc',
        activity_count: 1,
      });

      toast.success('GPA record saved!');
      fetchSavedRecords();
      setSemester('');
    } catch (error) {
      console.error('Error saving GPA:', error);
      toast.error('Failed to save GPA record');
    } finally {
      setIsSaving(false);
    }
  };

  const loadRecord = (record: any) => {
    const coursesData = record.courses as Course[];
    setCourses(coursesData);
    setGpa(record.gpa);
    setSemester(record.semester || '');
    toast.success('Record loaded');
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase.from('gpa_records').delete().eq('id', id);
      if (error) throw error;
      toast.success('Record deleted');
      fetchSavedRecords();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const resetAll = () => {
    setCourses([{ id: '1', code: '', credits: 3, grade: 'A' }]);
    setGpa(null);
    setSemester('');
    toast.success('All courses cleared');
  };

  const exportData = () => {
    const data = JSON.stringify(courses, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gpa-courses.json';
    a.click();
    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-accent" />
            GPA Calculator
          </h1>
          <p className="text-muted-foreground">Calculate and track your academic performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  Course Details
                </CardTitle>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                  {courses.length} course{courses.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Semester Input */}
              <div className="glass-card p-4 rounded-xl">
                <label className="text-sm font-medium mb-2 block">Semester Name (Optional)</label>
                <Input
                  placeholder="e.g., Fall 2026, Year 1 Semester 1"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="glass-card"
                />
              </div>

              {/* Course Management */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={exportData} className="btn-smooth">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMultipleCourses(5)} className="btn-smooth">
                    <Plus className="h-4 w-4 mr-2" />
                    Add 5 Courses
                  </Button>
                </div>
              </div>

              {/* Course Table Header */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                <div className="col-span-5">Course Code</div>
                <div className="col-span-2">Credits</div>
                <div className="col-span-4">Grade</div>
                <div className="col-span-1"></div>
              </div>

              {/* Course Rows */}
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-5">
                    <Input
                      placeholder="e.g., CEE 101"
                      value={course.code}
                      onChange={(e) => updateCourse(course.id, 'code', e.target.value)}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={course.credits}
                      onChange={(e) => updateCourse(course.id, 'credits', parseInt(e.target.value) || 0)}
                      className="glass-card"
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="col-span-4">
                    <Select value={course.grade} onValueChange={(value) => updateCourse(course.id, 'grade', value)}>
                      <SelectTrigger className="glass-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => removeCourse(course.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Button variant="outline" onClick={addCourse} className="btn-smooth">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
                <div className="flex gap-2">
                  <Button onClick={calculateGPA} className="btn-gold btn-smooth">
                    Calculate GPA
                  </Button>
                  <Button variant="outline" onClick={resetAll} className="btn-smooth">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Records */}
          {savedRecords.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-accent" />
                  Saved Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedRecords.map((record) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 glass-card rounded-xl hover-lift cursor-pointer"
                      onClick={() => loadRecord(record)}
                    >
                      <div>
                        <p className="font-medium">{record.semester}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.total_credits} credits • {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getGpaColor(record.gpa)}`}>
                            {record.gpa.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{record.gpa_class}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* GPA Results */}
        <div>
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                GPA Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gpa !== null ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto mb-4">
                    <span className={`text-4xl font-bold ${getGpaColor(gpa)}`}>
                      {gpa.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-lg font-semibold">{getGpaClass(gpa)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {courses.length} course{courses.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <p>Total Credits: {courses.reduce((sum, c) => sum + c.credits, 0)}</p>
                  </div>
                  
                  <Button onClick={saveGpaRecord} disabled={isSaving} className="w-full mt-4 btn-smooth">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Record'}
                  </Button>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-muted-foreground">Ready to Calculate?</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Enter your courses and grades to see results.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
