import { NextResponse } from 'next/server';
import cron from 'node-cron';
import { JobScraper } from '../../../lib/scraper';
import { supabase } from '../../../lib/supabase';

const scraper = new JobScraper();

export async function GET() {
  // Schedule scraping every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const [indeedJobs, linkedInJobs] = await Promise.all([
        scraper.scrapeIndeed(),
        scraper.scrapeLinkedIn()
      ]);

      const allJobs = [...indeedJobs, ...linkedInJobs];

      if (allJobs.length > 0) {
        const { error } = await supabase
          .from('jobs')
          .insert(allJobs);

        if (error) throw error;
        console.log(`Saved ${allJobs.length} jobs`);
      }
    } catch (error) {
      console.error('Scraping error:', error);
    }
  });

  return NextResponse.json({ message: 'Scraping scheduled' });
}