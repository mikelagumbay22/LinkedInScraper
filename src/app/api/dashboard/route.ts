// src/app/api/dashboard/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Fetch all jobs data with IDs
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('id, company')
      .not('company', 'is', null)
      .order('company', { ascending: true }) // Default sorting

    if (jobsError) throw jobsError

    // Get unique companies (already sorted from query)
    const uniqueCompanies = Array.from(
      new Set(jobsData.map((item) => item.company))
    ).filter(Boolean)

    // Count job openings by ID (more accurate)
    const jobsByCompany = jobsData.reduce((acc, { company, id }) => {
      if (!acc[company]) acc[company] = new Set()
      acc[company].add(id)
      return acc
    }, {} as Record<string, Set<string>>)

    // Fetch contact counts with IDs
    const { data: contactCounts, error: contactCountsError } = await supabase
      .from('contact')
      .select('id, organization')
      .not('organization', 'is', null)

    if (contactCountsError) throw contactCountsError

    const contactsByCompany = contactCounts.reduce((acc, { organization, id }) => {
      if (!acc[organization]) acc[organization] = new Set()
      acc[organization].add(id)
      return acc
    }, {} as Record<string, Set<string>>)

    // Combine the data with accurate counts
    const tableData = uniqueCompanies.map((company) => ({
      company,
      jobOpenings: jobsByCompany[company]?.size || 0,
      contacts: contactsByCompany[company]?.size || 0,
    }))

    return NextResponse.json(tableData)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}