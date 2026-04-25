export interface User {
  name: string;
  level: number;
  xp: number;
  maxXp: number;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  category: string;
  completed: boolean;
}

export interface StudyActivity {
  day: string;
  hours: number;
}

export interface StudyPlan {
  id: string;
  name: string;
  subjects: string[];
  progress: number;
  totalHours: number;
}

export interface GPARecord {
  id: string;
  semester: string;
  gpa: number;
  totalCredits: number;
  courses: string[];
  class: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  rank: number;
  name: string;
  level: number;
  xp: number;
  avatar: string;
  student_id: string;
  title?: string;
  weeklyGain?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  image: string;
  category: string;
  excerpt: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
}

export interface AIConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}
