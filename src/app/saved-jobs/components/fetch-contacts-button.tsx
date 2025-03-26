"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FetchContactsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    processed: number;
    contactsFound: number;
    errors: string[];
  } | null>(null);

  const handleFetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResults(null);

      const response = await fetch("/api/fetch-contacts", {
        method: "POST",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.details?.message || "Failed to fetch contacts");
      }

      setResults(data);
    } catch (err) {
      console.error("Fetch contacts error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleFetchContacts}
        disabled={isLoading}
        className="bg-purple-500 hover:bg-purple-600 text-white"
      >
        {isLoading ? "Fetching Contacts..." : "Fetch Contacts"}
      </Button>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {results && (
        <div className="text-sm text-gray-600">
          <p>Processed: {results.processed} companies</p>
          <p>Contacts found: {results.contactsFound}</p>
          {results.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold">Errors:</p>
              <ul className="list-disc pl-4">
                {/* {results.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))} */}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 