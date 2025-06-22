// src/app/category/[slug]/types.ts

export interface Question {
    id: string;
    question_text_en: string;
  }
  
  export interface Category {
    id: string;
    name_en: string;
    slug: string;
    description_en: string | null;
  }
  