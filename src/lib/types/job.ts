export interface Job {
  id?: string;
  title: string;
  company: string;
  company_domain?: string;
  company_industry?: string;
  company_size?: string;
  location?: string;
  source: string;
  url: string;
  posted_at: string;
  created_at?: string;
  scrapped_at?: string;
  industry?: string;
  is_remote?: boolean;
  description?: string;
  employment_type?: string;
  salary?: string;
  benefits?: string;
}

export interface RawJobData {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  employmentType: string;
  salary: string;
  benefits: string;
  companySize: string;
  companyIndustry: string;
  companyUrl: string;
  postedTime: string;
  jobType: string;
  experienceLevel: string;
  jobFunction: string;
  jobLevel: string;
  jobSchedule: string;
  jobWorkplace: string;
  jobLocation: string;
  jobDescription: string;
  companyDescription: string;
  companyLogo: string;
  companyFollowers: string;
  companySpecialties: string;
  companyWebsite: string;
  companyHeadquarters: string;
  companyFounded: string;
  companyType: string;
  companyServices: string;
  companyTechnologies: string;
  companyBenefits: string;
  companyCulture: string;
  companyValues: string;
  companyMission: string;
  companyVision: string;
  companyAwards: string;
  companyNews: string;
  companyBlog: string;
  companyCareers: string;
  companyContact: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companySocial: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
    youtube: string;
    website: string;
  };
}

export interface ScrapingResult {
  jobs: Job[];
  rawData: RawJobData[];
}