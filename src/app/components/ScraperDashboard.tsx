// 'use client';

// import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
// import { Job } from '@/lib/types/job';
// import JobList from './JobList';

// export default function ScraperDashboard() {
//   const [jobs, setJobs] = useState<Job[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchJobs();
//     // Start scraping on component mount
//     fetch('/api/scrape');
//   }, []);

//   async function fetchJobs() {
//     setLoading(true);
//     const { data, error } = await supabase
//       .from('jobs')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (!error) setJobs(data || []);
//     setLoading(false);
//   }

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Job Scraper Dashboard</h1>
//       {loading ? (
//         <p>Loading...</p>
//       ) : (
//         <JobList jobs={jobs} />
//       )}
//     </div>
//   );
// }
//