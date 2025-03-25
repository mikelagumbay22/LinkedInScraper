import { NextResponse } from 'next/server';
import { JobScraper } from '@/lib/scraper';
import { ScrapingResult } from '@/lib/types/job';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get('keywords') || 'Python';
    const location = searchParams.get('location') || 'Colorado, United States';
    const geoId = searchParams.get('geoId') || '103644278';
    const pageNum = parseInt(searchParams.get('pageNum') || '0');

    console.log('Received request with params:', { keywords, location, geoId, pageNum });

    const scraper = new JobScraper();
    const result: ScrapingResult = await scraper.scrapeJobs(keywords, location, geoId, pageNum);

    // Log the result for debugging
    console.log('Scraping result:', {
      jobsCount: result.jobs.length,
      rawDataCount: result.rawData.length,
      firstJob: result.jobs[0],
      firstRawData: result.rawData[0]
    });

    // Return success response with the data
    return NextResponse.json({
      success: true,
      jobs: result.jobs,
      rawData: result.rawData
    });
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      jobs: [],
      rawData: []
    });
  }
} 