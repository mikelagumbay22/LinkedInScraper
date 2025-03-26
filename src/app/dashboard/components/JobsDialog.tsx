// src/app/dashboard/components/JobsDialog.tsx
"use client"

import * as React from "react"
import { format } from 'date-fns'
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
  posted_at: string
}

interface JobsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: Job[]
  companyName: string
}

export function JobsDialog({ open, onOpenChange, jobs, companyName }: JobsDialogProps) {
  // Sort jobs by posted date (newest first) then by title
  const sortedJobs = React.useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dateA = new Date(a.posted_at).getTime()
      const dateB = new Date(b.posted_at).getTime()
      
      // First sort by posted date (newest first)
      if (dateB !== dateA) return dateB - dateA
      
      // If dates are equal, sort by job title
      return a["job-title"].localeCompare(b["job-title"])
    })
  }, [jobs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
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
                <TableHead className="min-w-[120px]">Posted Date</TableHead>
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
                  <TableCell>
                    {format(new Date(job.posted_at), 'MMM dd, yyyy')}
                  </TableCell>
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