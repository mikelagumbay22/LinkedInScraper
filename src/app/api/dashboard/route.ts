// src/app/api/dashboard/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { parseISO } from 'date-fns'

export async function GET(request: Request) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { searchParams } = new URL(request.url)
    const dateFilter = searchParams.get('date')

    // Fetch all jobs data with IDs
    let jobsQuery = supabase
      .from('jobs')
      .select('id, company, created_at')
      .not('company', 'is', null)
      .order('company', { ascending: true })

    if (dateFilter) {
      try {
        const date = parseISO(dateFilter)
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()
        
        jobsQuery = jobsQuery
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
      } catch (dateError) {
        console.error('Invalid date filter:', dateError)
        return NextResponse.json(
          { error: 'Invalid date format. Please use YYYY-MM-DD' },
          { status: 400 }
        )
      }
    }

    const { data: jobsData, error: jobsError } = await jobsQuery

    if (jobsError) {
      console.error('Supabase jobs query error:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs data' },
        { status: 500 }
      )
    }

    // Get unique companies
    const uniqueCompanies = Array.from(
      new Set(jobsData?.map((item) => item.company) || [])
    ).filter(Boolean)

    // Count job openings by ID
    const jobsByCompany = (jobsData || []).reduce((acc, { company, id }) => {
      if (!company) return acc
      if (!acc[company]) acc[company] = new Set()
      acc[company].add(id)
      return acc
    }, {} as Record<string, Set<string>>)

    // Fetch contact counts with IDs - Updated to use 'company' instead of 'organization'
    let contactsQuery = supabase
      .from('contact')
      .select('id, company')
      .not('company', 'is', null)

    if (dateFilter) {
      try {
        const date = parseISO(dateFilter)
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()
        
        contactsQuery = contactsQuery
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
      } catch (dateError) {
        console.error('Invalid date filter:', dateError)
        return NextResponse.json(
          { error: 'Invalid date format. Please use YYYY-MM-DD' },
          { status: 400 }
        )
      }
    }

    const { data: contactsData, error: contactsError } = await contactsQuery

    if (contactsError) {
      console.error('Supabase contacts query error:', contactsError)
      return NextResponse.json(
        { error: 'Failed to fetch contacts data' },
        { status: 500 }
      )
    }

    // Count contacts by company - Updated to use 'company' instead of 'organization'
    const contactsByCompany = (contactsData || []).reduce((acc, { company, id }) => {
      if (!company) return acc
      if (!acc[company]) acc[company] = new Set()
      acc[company].add(id)
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
      { error: 'Failed to fetch dashboard data. Please check your connection and try again.' },
      { status: 500 }
    )
  }
}