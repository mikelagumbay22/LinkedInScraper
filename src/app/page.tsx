"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Choose an Action
        </h1>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-purple-600 text-white py-3 rounded-lg shadow-md hover:bg-purple-700 transition duration-300"
          >
            View Dashboard
          </button>
          <button
            onClick={() => router.push("/saved-jobs")}
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          >
            Go to URL Upload
          </button>
          <button
            onClick={() => router.push("/scraper")}
            className="w-full bg-green-600 text-white py-3 rounded-lg shadow-md hover:bg-green-700 transition duration-300"
          >
            Go to Scrapper
          </button>
        </div>
      </div>
    </div>
  );
}
