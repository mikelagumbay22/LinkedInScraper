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

    console.log('Fetching contacts for company:', company);

    const { data: contacts, error } = await supabase
      .from('contact')
      .select('first_name, last_name, position, department, email_address, phone_number, linkedin_url')
      .eq('organization', company);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Contacts fetched:', contacts?.length || 0);

    return NextResponse.json({ 
      success: true, 
      data: contacts || [] 
    });
  } catch (error) {
    console.error("Error in /api/contacts:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred",
      details: error
    }, { status: 500 });
  }
} 