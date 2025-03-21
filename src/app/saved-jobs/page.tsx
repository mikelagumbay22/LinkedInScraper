'use client';

import { useEffect, useState } from 'react';
import { DataTable } from './components/data-table';
import { columns } from './components/columns';
import { supabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { CSVExportButton } from './components/csv-export-button';

// Define the Job type
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  posted_at: string;
  scraped_at: string;
};

export default function SavedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const { data } = await supabaseClient.from('jobs').select('*');
        setJobs(data || []); // Handle null case by providing empty array default
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load saved jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabaseClient.from('jobs').delete().eq('id', id);
      if (error) throw error;
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== id));
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Failed to delete job');
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows.length) return;
    
    try {
      const { error } = await supabaseClient
        .from('jobs')
        .delete()
        .in('id', selectedRows);
        
      if (error) throw error;
      
      setJobs((prevJobs) => prevJobs.filter((job) => !selectedRows.includes(job.id)));
      setSelectedRows([]);
    } catch (err) {
      console.error('Error deleting selected jobs:', err);
      alert('Failed to delete selected jobs');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Saved Jobs</h1>
          <div className="flex gap-4">
            <CSVExportButton data={jobs} />
            <button
              onClick={handleDeleteSelected}
              disabled={selectedRows.length === 0}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              Delete Selected ({selectedRows.length})
            </button>
            <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
              Back to Search
            </Link>
          </div>
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
            <Link href="/scraper" className="text-blue-500 hover:underline">
              Go back to search for jobs
            </Link>
          </div>
        )}
        
        {jobs.length > 0 && (
          <>
            <p className="mb-4">Found {jobs.length} saved jobs</p>
            <div className="container mx-auto py-10">
              <DataTable 
                columns={columns(handleDelete)} 
                data={jobs}
                onSelectionChange={setSelectedRows}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
} 