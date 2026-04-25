import api from './api';
import { User, Task, StudyActivity } from '../types';

export interface FullStats {
  user: User;
  currentGpa: string;
  aiInteractions: number;
  researchMinutes: number;
  studyMinutes: number;
}

export const getFullDashboardStats = async (): Promise<FullStats> => {
  const [statsRes, gpaRes] = await Promise.allSettled([
    api.get('/api/stats/me'),
    api.get('/api/gpa'),
  ]);

  const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
  const gpaRecords = gpaRes.status === 'fulfilled' ? gpaRes.value.data : [];

  const latestGpa = gpaRecords.length > 0
    ? Math.max(...gpaRecords.map((r: any) => parseFloat(r.gpa) || 0)).toFixed(2)
    : '0.00';

  return {
    user: {
      name: stats.profile?.full_name || 'Student',
      level: stats.level || 1,
      xp: stats.xp_points || 0,
      maxXp: (stats.level || 1) * 100 + 100,
    },
    currentGpa: latestGpa,
    aiInteractions: stats.total_ai_interactions || 0,
    researchMinutes: stats.total_research_minutes || 0,
    studyMinutes: stats.total_study_minutes || 0,
  };
};

export const getUserStats = async (): Promise<User> => {
  const response = await api.get('/api/stats/me');
  const data = response.data;
  return {
    name: data.profile?.full_name || 'Student',
    level: data.level || 1,
    xp: data.xp_points || 0,
    maxXp: (data.level || 1) * 100 + 100,
  };
};

export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get('/api/study-plans');
  return response.data.map((plan: any) => {
    const subjects = Array.isArray(plan.subjects) ? plan.subjects : [];
    const firstSubject = subjects[0];
    const category = typeof firstSubject === 'string'
      ? firstSubject
      : typeof firstSubject === 'object' && firstSubject !== null
        ? (firstSubject.name || firstSubject.title || 'General')
        : 'General';
    return {
      id: plan.id,
      title: plan.name,
      dueDate: new Date(plan.created_at).toLocaleDateString(),
      category,
      completed: false,
    };
  });
};

export const getActivity = async (): Promise<StudyActivity[]> => {
  const response = await api.get('/api/activity');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyHours: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  response.data.forEach((entry: any) => {
    const dayName = days[new Date(entry.activity_date).getDay()];
    dailyHours[dayName] += entry.activity_count / 60;
  });
  return Object.entries(dailyHours).map(([day, hours]) => ({ day, hours: Math.round(hours * 10) / 10 }));
};
