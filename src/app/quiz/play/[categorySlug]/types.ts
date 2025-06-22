// src/app/quiz/play/[categorySlug]/types.ts

export interface Option {
    id: string;
    question_id: string;
    option_text_en: string;
    is_correct: boolean;
  }
  
  export interface Question {
    id: string;
    question_text_en: string;
    options: Option[];
  }
  
  export interface Category {
    id: string;
    name_en: string;
    slug: string;
  } 

export interface QuizMode {
  id: string;
  name_en: string;
  description_en: string | null;
  mode_type: 'fixed_question_count' | 'time_based' | 'sudden_death' | 'unlimited';
  config: Record<string, any> | null;
  is_premium: boolean;
  is_active: boolean;
}