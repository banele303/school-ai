export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface user {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  isApproved?: boolean;
  studentClass?: Class;
  teacherSubjects?: subject[];
}

export interface academicYear {
  _id: string;
  name: string;
  fromYear: Date;
  toYear: Date;
  isCurrent: boolean;
}

export interface Class {
  _id: string;
  name: string;
  academicYear: academicYear;
  classTeacher: user;
  subjects: subject[];
  students: user[];
  capacity: number;
}

export interface subject {
  _id: string;
  name: string;
  code: string;
  teacher?: user[];
  isActive: boolean;
  category?: string; // "maths", "science", "language", "humanities", "life_skills", "arts", "technology", "other"
  grade?: number;
}

// All supported question types
export type QuestionType =
  | "MCQ"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "MATCH_COLUMN"
  | "CALCULATION"
  | "DIAGRAM_LABEL";

export interface question {
  _id: string;
  questionText: string;
  type: QuestionType | string;
  options: string[];
  correctAnswer: string;
  points: number;
  topic?: string;
  difficulty?: string;
  matchPairs?: { left: string; right: string }[];
  diagramUrl?: string;
  bankQuestionId?: string;
}

export interface exam {
  _id: string;
  title: string;
  subject: subject;
  class: Class;
  teacher: user;
  duration: number;
  questions: question[];
  dueDate: Date;
  isActive: boolean;
  examType: "quiz" | "exam";
  maxAttempts?: number;
  instantFeedback?: boolean;
  syllabusTopics?: string[];
  subjectCategory?: string;
  totalPoints?: number;
  templateUsed?: string;
}

export interface Submission {
  _id: string;
  score: number;
  exam: exam;
  answers: { questionId: string; answer: string }[];
  attemptNumber?: number;
  aiFeedback?: string;
}

export interface period {
  _id: string;
  subject: { _id: string; name: string; code: string };
  teacher: { _id: string; name: string };
  startTime: string;
  endTime: string;
}

export interface schedule {
  day: string;
  periods: period[];
}

// Question Bank types
export interface BankQuestion {
  _id: string;
  questionText: string;
  type: QuestionType | string;
  options: string[];
  correctAnswer: string;
  points: number;
  topic?: string;
  subTopic?: string;
  difficulty?: string;
  subject?: string;
  grade?: number;
  matchPairs?: { left: string; right: string }[];
  diagramUrl?: string;
  createdBy: string;
  timesUsed?: number;
  tags: string[];
  isPublished: boolean;
}

// Exam Template types
export interface ExamTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  examType: "quiz" | "exam";
  defaultDuration: number;
  defaultQuestionCount: number;
  questionTypeMix: { type: string; count: number; points: number }[];
  defaultDifficulty: string;
  recommendedFor: string[];
}
