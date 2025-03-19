'use client';

import { useState } from 'react';
import { Job } from '@/lib/types';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase';

export default function Home() {
  const [keywords, setKeywords] = useState('Python');
  const [location, setLocation] = useState('Las Vegas, Nevada, United States');
  const [method, setMethod] = useState('default');
  const [pageNum, setPageNum] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Updated predefined locations with geoIds
  const predefinedLocations = [
    'Las Vegas, Nevada, United States',
    'San Francisco, California, United States',
    'New York, New York, United States',
    'California, United States',
    'Nevada, United States',
    'Texas, United States',
    'United States',
    'Remote'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `/api/test?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&method=${method}&pageNum=${pageNum}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      } else {
        setError(data.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError('An error occurred while fetching jobs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (jobs.length === 0) {
      setSaveError('No jobs to save');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      // Prepare jobs data for insertion
      const jobsToInsert = jobs.map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        posted_at: job.posted_at,
        source: job.source,
        scrapped_at: new Date().toISOString()
      }));

      // Insert jobs into Supabase
      const { error } = await supabaseClient
        .from('jobs')
        .upsert(jobsToInsert, {
          onConflict: 'url', // Prevent duplicates based on URL
          ignoreDuplicates: true
        });

      if (error) throw error;

      alert(`Successfully saved ${jobs.length} jobs to database!`);
    } catch (err) {
      console.error('Error saving jobs:', err);
      setSaveError('Failed to save jobs to database');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">LinkedIn Job Scraper</h1>
        <Link href="/saved-jobs" className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded">
          View Saved Jobs
        </Link>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium mb-1">
              Keywords
            </label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-1">
              Location
            </label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {predefinedLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
              <option value="custom">Custom Location...</option>
            </select>
            
            {location === 'custom' && (
              <input
                type="text"
                placeholder="Enter custom location"
                className="w-full p-2 border rounded mt-2"
                onChange={(e) => setLocation(e.target.value)}
              />
            )}
          </div>
          
          <div>
            <label htmlFor="method" className="block text-sm font-medium mb-1">
              Scraping Method
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="default">Default (Proxy)</option>
              <option value="rss">RSS Feed</option>
              <option value="puppeteer">Puppeteer</option>
              <option value="simple">Simple</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="pageNum" className="block text-sm font-medium mb-1">
              Page Number
            </label>
            <input
              type="number"
              id="pageNum"
              value={pageNum}
              onChange={(e) => setPageNum(Number(e.target.value))}
              className="w-full p-2 border rounded"
              min="0"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Jobs'}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="w-full max-w-2xl mb-8 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {saveError && (
        <div className="w-full max-w-2xl mb-8 p-4 bg-red-100 text-red-700 rounded">
          {saveError}
        </div>
      )}
      
      {jobs.length > 0 ? (
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Found {jobs.length} jobs</h2>
            <button
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save to Database'}
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job, index) => (
              <div key={index} className="border rounded p-4 hover:shadow-md">
                <h3 className="text-lg font-bold">{job.title}</h3>
                <p className="text-gray-700">{job.company}</p>
                <p className="text-gray-600">{job.location}</p>
                <p className="text-sm text-gray-500 mb-2">
                  Posted: {new Date(job.posted_at).toLocaleDateString()}
                </p>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View Job
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && (
        <div className="text-gray-500">No jobs found. Try searching with different criteria.</div>
      )}
    </main>
  );
}