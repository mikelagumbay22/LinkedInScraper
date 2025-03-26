"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase";
import { PowerManager } from "@/lib/utils/power";

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
  onTotalJobsSaved: (total: number) => void;
}

export default function AutoJobProcessor({
  onLocationChange,
  onSearchTrigger,
  onSaveTrigger,
  jobs,
  onRunningStateChange,
  onTotalJobsSaved,
}: AutoJobProcessorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [processedLocations, setProcessedLocations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);
  const [powerManager] = useState(() => new PowerManager());
  const [totalJobsSaved, setTotalJobsSaved] = useState(0);

  const processNextLocation = useCallback(async () => {
    try {
      const { data: locations, error: locationsError } = await supabaseClient
        .from("locations")
        .select("name, geoid");

      if (locationsError) throw locationsError;

      const nextLocation = locations.find(
        (loc) => !processedLocations.includes(loc.name)
      );

      if (!nextLocation) {
        console.log("All locations processed");
        setIsRunning(false);
        await powerManager.allowSleep();
        onTotalJobsSaved(totalJobsSaved);
        return;
      }

      console.log(`Processing location: ${nextLocation.name}`);
      setCurrentLocation(nextLocation);
      onLocationChange(nextLocation.name);
      setIsWaitingForResults(true);
      onSearchTrigger();
      setProcessedLocations((prev) => [...prev, nextLocation.name]);
    } catch (err) {
      console.error("Error in auto processing:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsRunning(false);
      setIsWaitingForResults(false);
      await powerManager.allowSleep();
    }
  }, [processedLocations, powerManager, onTotalJobsSaved, onLocationChange, onSearchTrigger, totalJobsSaved]);

  // Watch for jobs changes
  useEffect(() => {
    if (isWaitingForResults && jobs.length === 0) {
      console.log(
        `No jobs found for ${currentLocation?.name}, moving to next location`
      );
      processNextLocation();
    } else if (isWaitingForResults && jobs.length > 0) {
      console.log(`Found ${jobs.length} jobs for ${currentLocation?.name}`);
      setTotalJobsSaved((prev) => prev + jobs.length);
      setTimeout(() => {
        onSaveTrigger();
        processNextLocation();
      }, 5 * 60 * 1000);
    }
  }, [jobs, isWaitingForResults, currentLocation?.name, onSaveTrigger, processNextLocation]);

  const startAutoProcess = async () => {
    console.log("Starting auto process...");
    const powerSuccess = await powerManager.preventSleep();
    if (!powerSuccess) {
      console.warn(
        "Could not prevent sleep mode. The process may be interrupted if the computer goes to sleep."
      );
    }
    setIsRunning(true);
    onRunningStateChange(true);
    setError(null);
    processNextLocation();
  };

  const stopAutoProcess = async () => {
    console.log("Stopping auto process...");
    setIsRunning(false);
    onRunningStateChange(false);
    setIsWaitingForResults(false);
    await powerManager.allowSleep();
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isRunning) {
        powerManager.allowSleep();
      }
    };
  }, [isRunning, powerManager]);

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
