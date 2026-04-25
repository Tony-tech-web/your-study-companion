import api from './api';
import { GPARecord } from '../types';

export const getGPARecords = async (): Promise<GPARecord[]> => {
  const response = await api.get('/api/gpa');
  return response.data.map((record: any) => ({
    id: record.id,
    semester: record.semester,
    gpa: record.gpa,
    totalCredits: record.total_credits,
    courses: Array.isArray(record.courses) ? record.courses : JSON.parse(record.courses || '[]'),
    class: record.gpa_class,
  }));
};

export const createGPARecord = async (data: Partial<GPARecord>): Promise<GPARecord> => {
  const response = await api.post('/api/gpa', {
    semester: data.semester,
    gpa: data.gpa,
    total_credits: data.totalCredits,
    courses: data.courses ?? [], // send as array; backend stores as JSON
    gpa_class: data.class,
  });
  const record = response.data;
  return {
    id: record.id,
    semester: record.semester,
    gpa: record.gpa,
    totalCredits: record.total_credits,
    courses: Array.isArray(record.courses) ? record.courses : JSON.parse(record.courses || '[]'),
    class: record.gpa_class,
  };
};

export const deleteGPARecord = async (id: string): Promise<void> => {
  await api.delete(`/api/gpa/${id}`);
};
