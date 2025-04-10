import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '1000');

  try {
    // Get total count
    const { count } = await supabaseClient
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data, error } = await supabaseClient
      .from('jobs')
      .select('*')
      .order('posted_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      data,
      totalCount: count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
} 