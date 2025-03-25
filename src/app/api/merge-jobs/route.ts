import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Job } from "@/lib/types/job";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1. Get all jobs
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*");

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No jobs found to merge"
      }, { status: 400 });
    }

    // 2. Group jobs by company
    const companyGroups = jobs.reduce((acc: Record<string, string[]>, job: Job) => {
      if (!acc[job.company]) {
        acc[job.company] = [];
      }
      acc[job.company].push(job.title);
      return acc;
    }, {});

    // 3. Insert into company_contact table
    const { error: insertError } = await supabase.from("company_contact").insert(
      Object.entries(companyGroups).map(([company, titles]) => ({
        company,
        title: titles,
        poc: {}, // Empty POC object as per schema
      }))
    );

    if (insertError) {
      console.error("Error inserting into company_contact:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: "Successfully merged jobs by company",
      count: Object.keys(companyGroups).length,
    });
  } catch (error) {
    console.error("Error merging jobs:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to merge jobs",
        details: error
      },
      { status: 500 }
    );
  }
} 