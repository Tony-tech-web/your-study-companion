import api from './api';
import { StudyPlan } from '../types';

// Normalize subjects: backend may return strings or objects like {id,name,hours,deadline}
const normalizeSubjects = (raw: any): string[] => {
  const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
  return arr.map((s: any) =>
    typeof s === 'string' ? s : (s?.name || s?.title || String(s) || 'Subject')
  );
};

export const getStudyPlans = async (): Promise<StudyPlan[]> => {
  const response = await api.get('/api/study-plans');
  return response.data.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    subjects: normalizeSubjects(plan.subjects),
    progress: plan.progress || 0,
    totalHours: plan.total_hours || 0,
  }));
};

export const createStudyPlan = async (data: Partial<StudyPlan>): Promise<StudyPlan> => {
  const response = await api.post('/api/study-plans', {
    name: data.name,
    subjects: data.subjects, // send as array; backend stores as JSON
    total_hours: data.totalHours,
  });
  const plan = response.data;
  return {
    id: plan.id,
    name: plan.name,
    subjects: normalizeSubjects(plan.subjects),
    progress: plan.progress || 0,
    totalHours: plan.total_hours || 0,
  };
};

export const deleteStudyPlan = async (id: string): Promise<void> => {
  await api.delete(`/api/study-plans/${id}`);
};
