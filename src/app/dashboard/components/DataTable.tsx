// src/app/dashboard/components/DataTable.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export type CompanyData = {
  company: string
  jobOpenings: number
  contacts: number
}

export const columns: ColumnDef<CompanyData>[] = [
  {
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="capitalize">{row.getValue("company")}</div>,
  },
  {
    accessorKey: "jobOpenings",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          No. of Job Openings
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row, table }) => {
      const count = parseInt(row.getValue("jobOpenings"))
      const company = row.getValue("company") as string
      
      return (
        <Button 
          variant="link" 
          className="text-blue-600 hover:text-blue-800 p-0 h-auto"
          onClick={() => {
            if (table.options.meta?.onJobOpeningsClick) {
              table.options.meta.onJobOpeningsClick(company)
            }
          }}
        >
          {count}
        </Button>
      )
    },
  },
  {
    accessorKey: "contacts",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          No. of Contacts
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const count = parseInt(row.getValue("contacts"))
      return <div className="text-center">{count}</div>
    },
  },
]