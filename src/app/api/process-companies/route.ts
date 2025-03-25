import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('Starting company processing...');

    // Step 1: Extract unique companies from jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('company');

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    // Get unique companies
    const uniqueCompanies = [...new Set(jobs.map(job => job.company))];
    console.log(`Found ${uniqueCompanies.length} unique companies`);

    // Step 2: Insert unique companies into companies table
    const { error: insertError } = await supabase
      .from('companies')
      .upsert(
        uniqueCompanies.map(company => ({
          name: company,
          created_at: new Date().toISOString(),
        })),
        { onConflict: 'name' }
      );

    if (insertError) {
      console.error('Error inserting companies:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to insert companies' },
        { status: 500 }
      );
    }

    // Step 3: Transfer companies to company_contact
    const { error: contactError } = await supabase
      .from('company_contact')
      .upsert(
        uniqueCompanies.map(company => ({
          company_name: company,
          created_at: new Date().toISOString(),
        })),
        { onConflict: 'company_name' }
      );

    if (contactError) {
      console.error('Error inserting company contacts:', contactError);
      return NextResponse.json(
        { success: false, error: 'Failed to insert company contacts' },
        { status: 500 }
      );
    }

    // Step 4: Update company titles
    for (const company of uniqueCompanies) {
      const { data: companyJobs, error: companyJobsError } = await supabase
        .from('jobs')
        .select('title')
        .eq('company', company);

      if (companyJobsError) {
        console.error(`Error fetching jobs for company ${company}:`, companyJobsError);
        continue;
      }

      const titles = companyJobs.map(job => job.title);

      const { error: updateError } = await supabase
        .from('companies')
        .update({ titles })
        .eq('name', company);

      if (updateError) {
        console.error(`Error updating titles for company ${company}:`, updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Company processing completed successfully',
      processedCompanies: uniqueCompanies.length
    });
  } catch (error) {
    console.error('Error in company processing:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 