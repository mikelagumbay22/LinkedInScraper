'use client';

import { useEffect, useState, useRef } from 'react';
import { Job } from '@/lib/types';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase';
import AutoJobProcessor from '@/components/AutoJobProcessor';


// Define a type for the location
type Location = {
  name: string;
  geoid: string;
};

export default function Home() {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [method, setMethod] = useState('default');
  const [pageNum, setPageNum] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [locations, setLocations] = useState<Location[]>([]); // State for locations
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [totalJobsSaved, setTotalJobsSaved] = useState(0);

  // Add these refs to control the form
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('locations')
          .select('name, geoid');

        if (error) throw error;

        setLocations(data as Location[] || []); // Cast data to Location[]
        if (data && data.length > 0) {
          setLocation(data[0].name); // Set default location to the first fetched location
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load locations');
      }
    };

    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Find the geoId for the selected location
    const selectedLocation = locations.find(loc => loc.name === location);
    const geoId = selectedLocation ? selectedLocation.geoid : '103644278'; // Default to US if not found
    
    try {
      console.log('Sending request with params:', { keywords, location, method, pageNum, geoId });
      
      const response = await fetch(
        `/api/test?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&method=${method}&pageNum=${pageNum}&geoId=${geoId}`
      );
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        if (data.jobs && data.jobs.length > 0) {
          console.log('First job data:', data.jobs[0]);
          setJobs(data.jobs);
        } else {
          setError('No jobs found in the response');
          setJobs([]);
        }
      } else {
        setError(data.error || 'Failed to fetch jobs');
        setJobs([]);
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('An error occurred while fetching jobs');
      setJobs([]);
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
      const jobsToInsert = jobs.map(job => ({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        posted_at: job.posted_at,
        source: job.source,
        scrapped_at: new Date().toISOString(),
        description: job.description,
        employment_type: job.employment_type,
        salary: job.salary,
        benefits: job.benefits,
        company_size: job.company_size,
        company_industry: job.company_industry,
        company_domain: job.company_domain,
        industry: job.industry,
        is_remote: job.is_remote
      }));

      const { error } = await supabaseClient
        .from('jobs')
        .upsert(jobsToInsert, {
          onConflict: 'url',
          ignoreDuplicates: true
        });

      if (error) throw error;

      // Only show alert if not auto-processing
      if (!isAutoProcessing) {
        alert(`Successfully saved ${jobs.length} jobs to database!`);
      }
    } catch (err) {
      console.error('Error saving jobs:', err);
      setSaveError('Failed to save jobs to database');
    } finally {
      setSaving(false);
    }
  };

  const handleTotalJobsSaved = (total: number) => {
    setTotalJobsSaved(total);
    if (total > 0) {
      alert(`Auto-processing completed! Total jobs saved: ${total}`);
    }
  };

  // Add this function to handle location changes
  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
  };

  // Add this function to trigger search
  const handleSearchTrigger = () => {
    if (searchButtonRef.current) {
      searchButtonRef.current.click();
    }
  };

  // Add this function to trigger save
  const handleSaveTrigger = () => {
    if (saveButtonRef.current) {
      saveButtonRef.current.click();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">LinkedIn Job Scraper</h1>
        <div className="flex items-center gap-4">
          {totalJobsSaved > 0 && (
            <div className="text-sm text-gray-600">
              Total Jobs Saved: {totalJobsSaved}
            </div>
          )}
          <Link href="/saved-jobs" className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded">
            View Saved Jobs
          </Link>
        </div>
      </div>      
  
      <AutoJobProcessor 
        onLocationChange={handleLocationChange}
        onSearchTrigger={handleSearchTrigger}
        onSaveTrigger={handleSaveTrigger}
        jobs={jobs}
        onRunningStateChange={setIsAutoProcessing}
        onTotalJobsSaved={handleTotalJobsSaved}
      />
      
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
              // required
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
              {locations.map((loc) => (
                <option key={loc.geoid} value={loc.name}>{loc.name}</option>
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
            ref={searchButtonRef}
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
              ref={saveButtonRef}
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Manual Save to Database'}
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job, index) => (
              <div key={index} className="border rounded p-4 hover:shadow-md">
                <h3 className="text-lg font-bold">{job.title}</h3>
                <p className="text-gray-700">{job.company}</p>
                <p className="text-gray-600">{job.location}</p>
                {job.employment_type && (
                  <p className="text-sm text-gray-600">Employment Type: {job.employment_type}</p>
                )}
                {job.salary && (
                  <p className="text-sm text-gray-600">Salary: {job.salary}</p>
                )}
                {job.company_industry && (
                  <p className="text-sm text-gray-600">Industry: {job.company_industry}</p>
                )}
                {job.company_size && (
                  <p className="text-sm text-gray-600">Company Size: {job.company_size}</p>
                )}
                {job.company_domain && (
                  <p className="text-sm text-gray-600">Company Domain: {job.company_domain}</p>
                )}
                {job.benefits && (
                  <p className="text-sm text-gray-600">Benefits: {job.benefits}</p>
                )}
                <p className="text-sm text-gray-500 mb-2">
                  Posted: {new Date(job.posted_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Job
                  </a>
                  {job.company_domain && (
                    <a
                      href={`https://${job.company_domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:underline"
                    >
                      Company Website
                    </a>
                  )}
                </div>
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