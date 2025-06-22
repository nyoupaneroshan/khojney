// src/app/types.ts

export interface Category {
    id: string;
    name_en: string;
    name_ne: string | null;
    slug: string;
    description_en: string | null;
    parent_category_id: string | null;
  }
  
  export interface HierarchicalCategory extends Category {
    subCategories: HierarchicalCategory[];
  }