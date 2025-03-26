"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

interface Job {
  title: string;
  company: string;
  location: string;
  posted_at: string;
  url: string;
}

interface JobsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  company: string;
  jobs: Job[];
  selectedDate: Date | null;
}

type SortField = 'title' | 'location' | 'posted_at';
type SortDirection = 'asc' | 'desc';

export function JobsDialog({ isOpen, onClose, company, jobs, selectedDate }: JobsDialogProps) {
  const [sortConfig, setSortConfig] = useState<{
    primary: { field: SortField; direction: SortDirection };
    secondary: { field: SortField; direction: SortDirection };
  }>({
    primary: { field: 'title', direction: 'asc' },
    secondary: { field: 'location', direction: 'asc' }
  });

  // Filter jobs based on selected date
  const filteredJobs = jobs.filter(job => {
    if (!selectedDate) return true;
    const jobDate = new Date(job.posted_at).toISOString().split('T')[0]; // Get only the date part
    return jobDate === selectedDate.toISOString().split('T')[0]; // Compare with selected date
  });

  const handleSort = (field: SortField) => {
    setSortConfig(current => {
      if (current.primary.field === field) {
        return {
          ...current,
          primary: {
            ...current.primary,
            direction: current.primary.direction === 'asc' ? 'desc' : 'asc'
          }
        };
      } else {
        return {
          primary: { field, direction: 'asc' },
          secondary: current.primary
        };
      }
    });
  };

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    // Primary sort
    const primaryCompare = (() => {
      switch (sortConfig.primary.field) {
        case 'title':
          return sortConfig.primary.direction === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        case 'location':
          return sortConfig.primary.direction === 'asc'
            ? a.location.localeCompare(b.location)
            : b.location.localeCompare(a.location);
        case 'posted_at':
          return sortConfig.primary.direction === 'asc'
            ? new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime()
            : new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
        default:
          return 0;
      }
    })();

    // If primary sort is equal, apply secondary sort
    if (primaryCompare === 0) {
      switch (sortConfig.secondary.field) {
        case 'title':
          return sortConfig.secondary.direction === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        case 'location':
          return sortConfig.secondary.direction === 'asc'
            ? a.location.localeCompare(b.location)
            : b.location.localeCompare(a.location);
        case 'posted_at':
          return sortConfig.secondary.direction === 'asc'
            ? new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime()
            : new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
        default:
          return 0;
      }
    }

    return primaryCompare;
  });

  const handleClick = (url: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!url) {
      e.preventDefault();
      console.error('No URL provided for job');
      return;
    }
    console.log('Opening URL:', url); // Debug log
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {`Jobs at ${company}`}
            {selectedDate && (
              <span className="text-sm text-gray-500 ml-2">
                ({selectedDate.toLocaleDateString()})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('title')}
                >
                  Title {sortConfig.primary.field === 'title' && (sortConfig.primary.direction === 'asc' ? '↑' : '↓')}
                  {sortConfig.secondary.field === 'title' && ' (2)'}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('location')}
                >
                  Location {sortConfig.primary.field === 'location' && (sortConfig.primary.direction === 'asc' ? '↑' : '↓')}
                  {sortConfig.secondary.field === 'location'}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('posted_at')}
                >
                  Posted Date {sortConfig.primary.field === 'posted_at' && (sortConfig.primary.direction === 'asc' ? '↑' : '↓')}
                  {sortConfig.secondary.field === 'posted_at' && ' (2)'}
                </TableHead>
                <TableHead>LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedJobs.map((job, index) => (
                <TableRow key={index}>
                  <TableCell className="break-words">{job.title}</TableCell>
                  <TableCell className="break-words">{job.location}</TableCell>
                  <TableCell>
                    {new Date(job.posted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {job.url ? (
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                        onClick={(e) => handleClick(job.url, e)}
                      >
                        Click to View
                      </a>
                    ) : (
                      <span className="text-gray-400">No URL available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
} 