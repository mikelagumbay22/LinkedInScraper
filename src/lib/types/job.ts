export interface Job {
  id?: string;
  "job-title": string;
  company: string;
  location?: string;
  source: string;
  url: string;
  posted_at: string;
  created_at?: string;
  scrapped_at?: string;
  industry?: string;
  is_remote?: boolean;
  description?: string;
}