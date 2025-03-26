// src/app/dashboard/components/JobsDialog.tsx
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Job {
  "job-title": string
  company: string
  location: string
  url: string
}

interface JobsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: Job[]
  companyName: string
}

export function JobsDialog({ open, onOpenChange, jobs, companyName }: JobsDialogProps) {
  // Sort jobs by title (ascending) and then by location
  const sortedJobs = React.useMemo(() => {
    return [...jobs].sort((a, b) => {
      // First sort by job title
      const titleCompare = a["job-title"].localeCompare(b["job-title"])
      if (titleCompare !== 0) return titleCompare
      
      // If titles are equal, sort by location
      return a.location.localeCompare(b.location)
    })
  }, [jobs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Job Openings for {companyName} ({jobs.length})
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedJobs.map((job, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{job["job-title"]}</TableCell>
                  <TableCell>{job.company}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Job
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}