'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { Job } from '@/lib/types';
import Link from 'next/link';

export default function SavedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        
        const { data, error } = await supabaseClient
          .from('jobs')
          .select('*')
          .order('posted_at', { ascending: false });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        setJobs(data || []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load saved jobs');
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobs();
  }, []);

  const deleteJob = async (id: string) => {
    try {
      const { error } = await supabaseClient
        .from('jobs')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setJobs(jobs.filter(job => job.id !== id));
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Failed to delete job');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Saved Jobs</h1>
          <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
            Back to Search
          </Link>
        </div>
        
        {loading && <p className="text-center py-8">Loading saved jobs...</p>}
        
        {error && (
          <div className="w-full p-4 bg-red-100 text-red-700 rounded mb-8">
            {error}
          </div>
        )}
        
        {!loading && jobs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No saved jobs found.</p>
            <Link href="/" className="text-blue-500 hover:underline">
              Go back to search for jobs
            </Link>
          </div>
        )}
        
        {jobs.length > 0 && (
          <>
            <p className="mb-4">Found {jobs.length} saved jobs</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded p-4 hover:shadow-md">
                  <h3 className="text-lg font-bold">{job.title}</h3>
                  <p className="text-gray-700">{job.company}</p>
                  <p className="text-gray-600">{job.location}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    Posted: {new Date(job.created_at || job.posted_at).toLocaleDateString()}
                  </p>
                  <div className="flex justify-between mt-4">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Job
                    </a>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
} 