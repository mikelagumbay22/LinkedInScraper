import { Job as ImportedJob } from '@/lib/types/job'; // Import the Job type
import { JobScraper } from '@/lib/scraper';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ensure you import supabase

export async function GET(request: Request) {
  try {
    console.log('Starting test route...');
    const scraper = new JobScraper();
    
    // Get the method from the query parameter
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method') || 'default';
    const keywords = searchParams.get('keywords') || 'Python';
    const location = searchParams.get('location') || 'New York, United States';
    const pageNum = parseInt(searchParams.get('pageNum') || '0', 10); // Ensure pageNum is a number

    // Fetch geoId from Supabase based on the location
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .select('geoid')
      .eq('name', location)
      .single(); // Get a single record

    if (locationError || !locationData) {
      console.error('Error fetching geoId:', locationError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch geoId',
          details: locationError?.message 
        }, 
        { status: 500 }
      );
    }

    const geoId = locationData.geoid; // Use the fetched geoId

    let jobs: ImportedJob[] = []; // Use the imported Job type
    
    const scrapePromise = (async () => {
      if (method === 'default' || method === 'proxy') {
        console.log('Using default method (proxy)');
        jobs = await scraper.scrapeJobs(keywords, location, geoId, pageNum); // Pass geoId and pageNum to the scraper
      } else if (method === 'rss') {
        console.log('Using RSS method');
        jobs = await scraper.scrapeLinkedInRSS();
      } else if (method === 'puppeteer') {
        console.log('Using Puppeteer method');
        jobs = await scraper.scrapeLinkedIn();
      } else if (method === 'simple') {
        console.log('Using simple method');
        jobs = await scraper.scrapeLinkedInSimple();
      }
      return jobs;
    })();

    const scrapeTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping operation timeout')), 25000)
    );

    jobs = await Promise.race([scrapePromise, scrapeTimeoutPromise]) as ImportedJob[];

    // Process jobs to add industry and remote status
    jobs = jobs.map(job => {
      const title = job.title.toLowerCase();
      const location = job.location?.toLowerCase() || '';
      const description = job.description?.toLowerCase() || '';

      // Detect remote status
      const isRemote = 
        title.includes('remote') || 
        title.includes('work from home') ||
        title.includes('wfh') ||
        location.includes('remote') ||
        description.includes('remote') ||
        description.includes('work from home') ||
        description.includes('wfh');

      // Extract industry
      const industry = extractIndustry(description);

      return {
        ...job,
        is_remote: isRemote,
        industry: industry
      };
    });
    
    console.log('Test route completed with', jobs.length, 'jobs');
    return NextResponse.json({
      success: true,
      method,
      keywords,
      location,
      jobs,
      jobCount: jobs.length
    });
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scrape jobs',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Helper function to extract industry from job description
function extractIndustry(description: string): string | undefined {
  const commonIndustries = [
    'technology', 'healthcare', 'finance', 'education', 'retail',
    'manufacturing', 'consulting', 'marketing', 'sales', 'engineering',
    'medical', 'pharmaceutical', 'software', 'hardware', 'telecommunications'
  ];

  for (const industry of commonIndustries) {
    if (description.includes(industry)) {
      return industry.charAt(0).toUpperCase() + industry.slice(1);
    }
  }
  return undefined;
} 