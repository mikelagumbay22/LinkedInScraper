import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Job } from '@/lib/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Add the URL simplification function
function simplifyLinkedInJobUrl(url: string): string {
  try {
    // Extract job ID from the URL
    const matches = url.match(/\/view\/.*?-(\d+)\?/);
    if (matches && matches[1]) {
      return `https://www.linkedin.com/jobs/view/${matches[1]}/`;
    }
    return url; // Return original URL if pattern doesn't match
  } catch (error) {
    console.error('Error simplifying LinkedIn URL:', error);
    return url; // Return original URL if there's an error
  }
}

export async function POST(request: Request) {
  try {
    const { jobs } = await request.json() as { jobs: Job[] };
    
    if (!jobs?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'No jobs provided' 
      }, { status: 400 });
    }

    let savedCount = 0;
    let duplicates = 0;

    for (const job of jobs) {
      // Simplify the URL before checking for duplicates or saving
      const simplifiedUrl = simplifyLinkedInJobUrl(job.url);

      // Check for existing job with the simplified URL
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .eq('url', simplifiedUrl)
        .single();

      if (!existing) {
        // Save new job with simplified URL
        const { error } = await supabase
          .from('jobs')
          .insert([{
            title: job.title,
            company: job.company,
            location: job.location,
            url: simplifiedUrl, // Use the simplified URL
            source: job.source || 'linkedin',
            posted_at: job.posted_at || new Date().toISOString(),
            created_at: new Date().toISOString()
          }]);

        if (!error) {
          savedCount++;
        }
      } else {
        duplicates++;
      }
    }

    return NextResponse.json({
      success: true,
      savedCount,
      duplicates
    });

  } catch (error) {
    console.error('Error saving jobs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save jobs' 
    }, { status: 500 });
  }
} 