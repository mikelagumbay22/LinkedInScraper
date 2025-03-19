"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

// Function to format date
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) {
    return "N/A"; // Return a default value if the date is invalid
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date"; // Return a message for invalid date
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const columns = (handleDelete: (id: string) => void): ColumnDef<any>[] => [
  {
    accessorKey: "title",
    header: "Job Title",
  },
  {
    accessorKey: "company",
    header: "Company",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "url",
    header: "URL",
  },
  {
    accessorKey: "posted_at",
    header: "Posted Date",
    cell: ({ row }) => formatDate(row.getValue("posted_at")),
  },
  {
    accessorKey: "scrapped_at",
    header: "Scraped Date",
    cell: ({ row }) => formatDate(row.getValue("scrapped_at")),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const job = row.original;
      return (
        <Button variant="outline" onClick={() => handleDelete(job.id)}>
          Delete
        </Button>
      );
    },
  },
];
