export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  posted_at: string;
  scrapped_at?: string;
  created_at?: string;
  description?: string;
} 