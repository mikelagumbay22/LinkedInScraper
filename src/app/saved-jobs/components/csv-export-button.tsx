"use client";

interface CSVExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

export function CSVExportButton({ data }: CSVExportButtonProps) {
  const downloadCSV = () => {
    // Define CSV headers
    const headers = [
      "Title",
      "Company",
      "Location",
      "URL",
      "Posted At",
      "Scraped At",
    ];

    // Convert data to CSV format
    const csvData = data.map((job) =>
      [
        job.title,
        job.company,
        job.location,
        job.url,
        job.posted_at,
        job.scraped_at,
      ]
        .map((field) => `"${field}"`)
        .join(",")
    );

    // Combine headers and data
    const csv = [headers.join(","), ...csvData].join("\n");

    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `jobs_export_${new Date().toISOString()}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadCSV}
      className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded"
    >
      Export to CSV
    </button>
  );
}
