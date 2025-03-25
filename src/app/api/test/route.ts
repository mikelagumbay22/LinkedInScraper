import { Job as ImportedJob } from '@/lib/types/job'; // Import the Job type
import { JobScraper } from '@/lib/scraper';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ensure you import supabase

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

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
    
    // Set a longer timeout for the scraping operation
    const scrapePromise = (async () => {
      try {
        if (method === 'default' || method === 'proxy') {
          console.log('Using default method (proxy)');
          jobs = await scraper.scrapeJobs(keywords, location, geoId, pageNum);
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
      } catch (error) {
        console.error('Error in scraping method:', error);
        throw error;
      }
    })();

    const scrapeTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping operation timed out after 240 seconds')), 240000)
    );

    try {
      jobs = await Promise.race([scrapePromise, scrapeTimeoutPromise]) as ImportedJob[];
    } catch (error) {
      console.error('Scraping error:', error);
      console.log('Attempting fallback to simple method...');
      try {
        jobs = await scraper.scrapeLinkedInSimple();
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'All scraping methods failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        method,
        keywords,
        location,
        jobs: [],
        jobCount: 0,
        message: 'No jobs found'
      });
    }

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
    return new NextResponse(
      JSON.stringify({
        success: true,
        method,
        keywords,
        location,
        jobs,
        jobCount: jobs.length
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error in test route:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape jobs',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
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