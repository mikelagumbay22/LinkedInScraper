"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";

type Location = {
  name: string;
  geoid: string;
};

interface AutoJobProcessorProps {
  onLocationChange: (location: string) => void;
  onSearchTrigger: () => void;
  onSaveTrigger: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jobs: any[];
  onRunningStateChange: (isRunning: boolean) => void;
}

export default function AutoJobProcessor({
  onLocationChange,
  onSearchTrigger,
  onSaveTrigger,
  jobs,
}: AutoJobProcessorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [processedLocations, setProcessedLocations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);

  // Watch for jobs changes
  useEffect(() => {
    if (isWaitingForResults && jobs.length === 0) {
      // If no jobs found, proceed to next location
      console.log(
        `No jobs found for ${currentLocation?.name}, moving to next location`
      );
      processNextLocation();
    } else if (isWaitingForResults && jobs.length > 0) {
      // If jobs found, wait 5 minutes then save
      console.log(`Found ${jobs.length} jobs for ${currentLocation?.name}`);
      setTimeout(() => {
        onSaveTrigger();
        processNextLocation();
      }, 5 * 60 * 1000);
    }
  }, [jobs, isWaitingForResults]);

  const processNextLocation = async () => {
    try {
      // Fetch all locations
      const { data: locations, error: locationsError } = await supabaseClient
        .from("locations")
        .select("name, geoid");

      if (locationsError) throw locationsError;

      // Find the next unprocessed location
      const nextLocation = locations.find(
        (loc) => !processedLocations.includes(loc.name)
      );

      if (!nextLocation) {
        console.log("All locations processed");
        setIsRunning(false);
        return;
      }

      console.log(`Processing location: ${nextLocation.name}`);
      setCurrentLocation(nextLocation);

      // Update the location in the form
      onLocationChange(nextLocation.name);

      // Set waiting state and trigger search
      setIsWaitingForResults(true);
      onSearchTrigger();

      // Update processed locations
      setProcessedLocations((prev) => [...prev, nextLocation.name]);
    } catch (err) {
      console.error("Error in auto processing:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsRunning(false);
      setIsWaitingForResults(false);
    }
  };

  const startAutoProcess = () => {
    console.log("Starting auto process...");
    setIsRunning(true);
    setError(null);
    processNextLocation();
  };

  const stopAutoProcess = () => {
    console.log("Stopping auto process...");
    setIsRunning(false);
    setIsWaitingForResults(false);
  };

  return (
    <div className="w-full max-w-2xl mb-8 p-4 border rounded">
      <h2 className="text-2xl font-bold mb-4">Automatic Job Processing</h2>

      <div className="flex gap-4 mb-4">
        <button
          onClick={startAutoProcess}
          disabled={isRunning}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {isRunning ? "Processing..." : "Start Auto Process"}
        </button>

        <button
          onClick={stopAutoProcess}
          disabled={!isRunning}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      {currentLocation && (
        <div className="mb-4">
          <p className="text-gray-700">
            Currently processing:{" "}
            <span className="font-bold">{currentLocation.name}</span>
          </p>
          {isWaitingForResults && jobs.length === 0 && (
            <p className="text-yellow-600">
              No jobs found, moving to next location...
            </p>
          )}
        </div>
      )}

      {processedLocations.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold mb-2">Processed Locations:</h3>
          <ul className="list-disc list-inside">
            {processedLocations.map((loc, index) => (
              <li key={index} className="text-gray-600">
                {loc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}
    </div>
  );
}


