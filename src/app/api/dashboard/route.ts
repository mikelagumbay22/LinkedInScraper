// src/app/api/dashboard/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { parseISO } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFilter = searchParams.get('date')

    // Base query for jobs
    let jobsQuery = supabase
      .from('jobs')
      .select('id, company, created_at')
      .not('company', 'is', null)
      .order('company', { ascending: true })

    // Apply date filter if provided
    if (dateFilter) {
      const date = parseISO(dateFilter)
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()
      
      jobsQuery = jobsQuery
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
    }

    const { data: jobsData, error: jobsError } = await jobsQuery

    if (jobsError) throw jobsError

    // Get unique companies
    const uniqueCompanies = Array.from(
      new Set(jobsData.map((item) => item.company))
    ).filter(Boolean)

    // Count job openings by ID
    const jobsByCompany = jobsData.reduce((acc, { company, id }) => {
      if (!acc[company]) acc[company] = new Set()
      acc[company].add(id)
      return acc
    }, {} as Record<string, Set<string>>)

    // Base query for contacts
    let contactsQuery = supabase
      .from('contact')
      .select('id, organization')
      .not('organization', 'is', null)

    // Apply date filter if provided
    if (dateFilter) {
      const date = parseISO(dateFilter)
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()
      
      contactsQuery = contactsQuery
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
    }

    const { data: contactCounts, error: contactCountsError } = await contactsQuery

    if (contactCountsError) throw contactCountsError

    const contactsByCompany = contactCounts.reduce((acc, { organization, id }) => {
      if (!acc[organization]) acc[organization] = new Set()
      acc[organization].add(id)
      return acc
    }, {} as Record<string, Set<string>>)

    // Combine the data
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