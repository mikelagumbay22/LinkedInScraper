"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function MergeButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMerge = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/merge-jobs", {
        method: "POST",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.details?.message || "Failed to merge jobs");
      }

      alert(`Successfully merged ${data.count} companies`);
    } catch (err) {
      console.error("Merge error:", err);
      setError(err instanceof Error ? err.message : "Failed to merge jobs");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleMerge}
        disabled={isLoading}
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        {isLoading ? "Merging..." : "Merge Jobs by Company"}
      </Button>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
} 