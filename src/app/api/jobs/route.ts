import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({ 
        success: false, 
        error: "Company parameter is required" 
      }, { status: 400 });
    }

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('title, company, location, posted_at, url, id')
      .eq('company', company);

    if (error) throw error;

    const jobsWithUrls = jobs?.map(job => ({
      ...job,
      url: job.url || `https://www.linkedin.com/jobs/view/${job.id}`
    }));

    return NextResponse.json({ 
      success: true, 
      data: jobsWithUrls 
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    }, { status: 500 });
  }
} 