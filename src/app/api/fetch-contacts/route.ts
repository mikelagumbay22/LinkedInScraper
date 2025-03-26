import { createClient } from '@supabase/supabase-js';
import { NextResponse } from "next/server";

interface HunterEmail {
  value: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  linkedin_url?: string;
  phone_number?: string;
}

interface HunterResponse {
  data: {
    emails: HunterEmail[];
    organization: string;
    country: string;
    state: string;
    city: string;
    industry?: string;
  };
}

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const HUNTER_API_URL = "https://api.hunter.io/v2";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCompanyDomain(companyName: string): Promise<string | null> {
  try {
    // Use Hunter.io's domain finder API
    const response = await fetch(
      `${HUNTER_API_URL}/domain-search?company=${encodeURIComponent(companyName)}&api_key=${HUNTER_API_KEY}`
    );
    const data = await response.json();

    if (data.data?.domain) {
      return data.data.domain;
    }
    return null;
  } catch (error) {
    console.error("Error finding domain:", error);
    return null;
  }
}

async function getContacts(domain: string) {
  try {
    const response = await fetch(
      `${HUNTER_API_URL}/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`
    );
    const data: HunterResponse = await response.json();

    if (data.data?.emails) {
      return data.data.emails.map((email: HunterEmail) => ({
        email_address: email.value,
        domain_name: domain,
        organization: data.data.organization,
        country: data.data.country,
        state: data.data.state,
        city: data.data.city,
        first_name: email.first_name,
        last_name: email.last_name,
        department: email.department,
        position: email.position,
        linkedin_url: email.linkedin_url,
        phone_number: email.phone_number,
        industry: data.data.industry,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
}

export async function POST() {
  try {
    // 1. Get all jobs and extract unique companies
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("company");

    if (jobsError) throw jobsError;

    // Get unique companies using Set
    const uniqueCompanies = [...new Set(jobs.map(job => job.company))];

    const results = {
      processed: 0,
      contactsFound: 0,
      errors: [] as string[],
    };

    // 2. Process each company
    for (const company of uniqueCompanies) {
      try {
        // Get domain for company
        const domain = await getCompanyDomain(company);
        if (!domain) {
          results.errors.push(`No domain found for company: ${company}`);
          continue;
        }

        // Get contacts for domain
        const contacts = await getContacts(domain);
        if (contacts.length === 0) {
          results.errors.push(`No contacts found for domain: ${domain}`);
          continue;
        }

        // Insert contacts into Supabase
        const { error: insertError } = await supabase
          .from("contact")
          .insert(contacts);

        if (insertError) {
          results.errors.push(`Error inserting contacts for ${domain}: ${insertError.message}`);
          continue;
        }

        results.contactsFound += contacts.length;
        results.processed++;
      } catch (error) {
        results.errors.push(`Error processing company ${company}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error in fetch-contacts:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch contacts",
        details: error
      },
      { status: 500 }
    );
  }
} 