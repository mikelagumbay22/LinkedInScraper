"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";

interface CompanyProcessorProps {
  onProcessingComplete: () => void;
  onError: (error: string) => void;
}

export default function CompanyProcessor({
  onProcessingComplete,
  onError,
}: CompanyProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [processedCount, setProcessedCount] = useState(0);

  const processCompanies = async () => {
    setIsProcessing(true);
    setCurrentStep("Starting company processing...");

    try {
      // Step 1: Extract unique companies from jobs
      setCurrentStep("Extracting unique companies from jobs...");
      const { data: jobs, error: jobsError } = await supabaseClient
        .from("jobs")
        .select("company");

      if (jobsError) throw jobsError;

      // Get unique companies
      const uniqueCompanies = [...new Set(jobs.map((job) => job.company))];
      setProcessedCount(uniqueCompanies.length);

      // Step 2: Insert unique companies into companies table
      setCurrentStep("Inserting companies into companies table...");
      const { error: insertError } = await supabaseClient
        .from("companies")
        .upsert(
          uniqueCompanies.map((company) => ({
            name: company,
            created_at: new Date().toISOString(),
          })),
          { onConflict: "name" }
        );

      if (insertError) throw insertError;

      // Step 3: Transfer companies to company_contact
      setCurrentStep("Transferring companies to company_contact...");
      const { error: contactError } = await supabaseClient
        .from("company_contact")
        .upsert(
          uniqueCompanies.map((company) => ({
            company_name: company,
            created_at: new Date().toISOString(),
          })),
          { onConflict: "company_name" }
        );

      if (contactError) throw contactError;

      // Step 4: Update company titles
      setCurrentStep("Updating company titles...");
      for (const company of uniqueCompanies) {
        const { data: companyJobs, error: companyJobsError } = await supabaseClient
          .from("jobs")
          .select("title")
          .eq("company", company);

        if (companyJobsError) throw companyJobsError;

        const titles = companyJobs.map((job) => job.title);

        const { error: updateError } = await supabaseClient
          .from("companies")
          .update({ titles })
          .eq("name", company);

        if (updateError) throw updateError;
      }

      setCurrentStep("Processing completed successfully!");
      onProcessingComplete();
    } catch (error) {
      console.error("Error in company processing:", error);
      onError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mb-8 p-4 border rounded">
      <h2 className="text-2xl font-bold mb-4">Company Processing</h2>

      <div className="flex gap-4 mb-4">
        <button
          onClick={processCompanies}
          disabled={isProcessing}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {isProcessing ? "Processing..." : "Process Companies"}
        </button>
      </div>

      {isProcessing && (
        <div className="mb-4">
          <p className="text-gray-700">
            Current step: <span className="font-bold">{currentStep}</span>
          </p>
          {processedCount > 0 && (
            <p className="text-gray-600">
              Processed {processedCount} companies
            </p>
          )}
        </div>
      )}
    </div>
  );
} 