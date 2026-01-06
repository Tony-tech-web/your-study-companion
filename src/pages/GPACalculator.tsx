import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Plus, Trash2, Download, Upload, BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Course {
  id: string;
  code: string;
  credits: number;
  grade: string;
}

const gradePoints: Record<string, number> = {
  'A': 5.0,
  'B': 4.0,
  'C': 3.0,
  'D': 2.0,
  'E': 1.0,
  'F': 0.0,
};

const gradeOptions = [
  { value: 'A', label: 'A (5.0 points)' },
  { value: 'B', label: 'B (4.0 points)' },
  { value: 'C', label: 'C (3.0 points)' },
  { value: 'D', label: 'D (2.0 points)' },
  { value: 'E', label: 'E (1.0 points)' },
  { value: 'F', label: 'F (0.0 points)' },
];

export default function GPACalculator() {
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', code: '', credits: 3, grade: 'A' },
  ]);
  const [gpa, setGpa] = useState<number | null>(null);

  const addCourse = () => {
    setCourses([...courses, { 
      id: Date.now().toString(), 
      code: '', 
      credits: 3, 
      grade: 'A' 
    }]);
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
    setCourses(courses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
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

  const resetAll = () => {
    setCourses([{ id: '1', code: '', credits: 3, grade: 'A' }]);
    setGpa(null);
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
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  Course Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {courses.length} course{courses.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Course Management */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Course Management</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={exportData} className="btn-smooth">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="btn-smooth">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMultipleCourses(5)} className="btn-smooth">
                    <Plus className="h-4 w-4 mr-2" />
                    Add 5 Courses
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Export your courses to backup or share. Import supports both new and legacy formats.
                </p>
              </div>

              {/* Course Table Header */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                <div className="col-span-5">Course Code</div>
                <div className="col-span-2">Credit Units</div>
                <div className="col-span-4">Grade</div>
                <div className="col-span-1">Action</div>
              </div>

              {/* Course Rows */}
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-5">
                    <Input
                      placeholder="Course Code (e.g. CEE 101)"
                      value={course.code}
                      onChange={(e) => updateCourse(course.id, 'code', e.target.value)}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Credits"
                      value={course.credits}
                      onChange={(e) => updateCourse(course.id, 'credits', parseInt(e.target.value) || 0)}
                      className="glass-card"
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="col-span-4">
                    <Select
                      value={course.grade}
                      onValueChange={(value) => updateCourse(course.id, 'grade', value)}
                    >
                      <SelectTrigger className="glass-card">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCourse(course.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
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
                    Reset All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-muted-foreground">Ready to Calculate?</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Enter your courses and grades, then click "Calculate GPA" to see your results and performance insights.
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