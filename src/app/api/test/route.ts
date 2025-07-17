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
    const debug = searchParams.get('debug') === 'true'; // Add debug parameter

    // Fetch geoId from Supabase based on the location
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .select('geoid')
      .eq('name', location)
      .limit(1); // Get only one record

    if (locationError) {
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

    let geoId: string;
    if (!locationData || locationData.length === 0) {
      console.error('No location found for:', location);
      // Use a default geoId for California
      geoId = '102095887';
      console.log('Using default geoId for California:', geoId);
    } else {
      geoId = locationData[0].geoid; // Use the first record
      console.log('Found geoId for', location, ':', geoId);
    }

    let jobs: ImportedJob[] = []; // Use the imported Job type
    
    // Set a longer timeout for the scraping operation
    const scrapePromise = (async () => {
      try {
        console.log('Trying LinkedIn workarounds...');
        
        // Try RSS feed first (most reliable without login)
        console.log('Trying RSS feed method...');
        jobs = await scraper.scrapeLinkedInRSSFeed(keywords, location);
        if (jobs.length > 0) {
          console.log('RSS feed method successful, found', jobs.length, 'jobs');
          return jobs;
        }
        
        // Try LinkedIn API method
        console.log('Trying LinkedIn API method...');
        jobs = await scraper.scrapeLinkedInAPI(keywords, location, geoId);
        if (jobs.length > 0) {
          console.log('LinkedIn API method successful, found', jobs.length, 'jobs');
          return jobs;
        }
        
        // Try Puppeteer without login as last resort
        console.log('Trying Puppeteer without login...');
        jobs = await scraper.scrapeLinkedIn();
        if (jobs.length > 0) {
          console.log('Puppeteer method successful, found', jobs.length, 'jobs');
          return jobs;
        }
        
        console.log('All methods failed to find jobs');
        
        // Try Indeed as fallback (much easier to scrape)
        console.log('Trying Indeed as fallback...');
        try {
          jobs = await scraper.scrapeIndeed();
          if (jobs.length > 0) {
            console.log('Indeed method successful, found', jobs.length, 'jobs');
            return jobs;
          }
        } catch (indeedError) {
          console.log('Indeed scraping also failed:', indeedError);
        }
        
        return [];
      } catch (error) {
        console.error('Error in scraping methods:', error);
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
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'LinkedIn scraping failed. This is likely due to LinkedIn anti-bot measures (login or CAPTCHA required).',
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

    // Debug mode: return raw HTML content
    if (debug) {
      try {
        const targetUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&geoId=${geoId}&f_TPR=r86400&position=1&pageNum=${pageNum}`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        
        const html = await response.text();
        
        return NextResponse.json({
          success: true,
          debug: true,
          htmlLength: html.length,
          htmlSample: html.substring(0, 2000),
          proxyUrl,
          targetUrl
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          debug: true,
          error: error instanceof Error ? error.message : 'Debug failed'
        });
      }
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