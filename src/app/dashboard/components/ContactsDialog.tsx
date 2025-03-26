// src/app/dashboard/components/ContactsDialog.tsx
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

interface Contact {
  first_name: string
  last_name: string
  position: string
  department: string
  email_address: string
  phone_number: string
  linkedin_url: string
}

interface ContactsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  companyName: string
}

export function ContactsDialog({ open, onOpenChange, contacts, companyName }: ContactsDialogProps) {
  // Sort contacts by department then by last name
  const sortedContacts = React.useMemo(() => {
    return [...contacts].sort((a, b) => {
      const deptCompare = a.department.localeCompare(b.department)
      if (deptCompare !== 0) return deptCompare
      return a.last_name.localeCompare(b.last_name)
    })
  }, [contacts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Contacts for {companyName} ({contacts.length})
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.map((contact, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{contact.first_name} {contact.last_name}</TableCell>
                  <TableCell>{contact.position}</TableCell>
                  <TableCell>{contact.department}</TableCell>
                  <TableCell>
                    <a 
                      href={`mailto:${contact.email_address}`}
                      className="text-blue-600 hover:underline"
                    >
                      {contact.email_address}
                    </a>
                  </TableCell>
                  <TableCell>{contact.phone_number}</TableCell>
                  <TableCell>
                    {contact.linkedin_url ? (
                      <a 
                        href={contact.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Profile
                      </a>
                    ) : '-'}
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