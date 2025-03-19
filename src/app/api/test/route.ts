import { Job as ImportedJob } from '@/lib/types/job'; // Import the Job type
import { JobScraper } from '@/lib/scraper';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('Starting test route...');
    const scraper = new JobScraper();
    
    // Get the method from the query parameter
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method') || 'default';
    const keywords = searchParams.get('keywords') || 'Developer';
    const location = searchParams.get('location') || 'California, United States';
    const pageNum = parseInt(searchParams.get('pageNum') || '0', 10); // Ensure pageNum is a number
    const geoId = '103644278'; // Set the geoId as needed

    let jobs: ImportedJob[] = []; // Use the imported Job type
    
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
    
    console.log('Test route completed with', jobs.length, 'jobs');
    return NextResponse.json({ success: true, method, keywords, location, jobs });
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json({ success: false, error: 'Failed to scrape jobs' }, { status: 500 });
  }
} 