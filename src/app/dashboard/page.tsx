// src/app/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import {
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { columns, CompanyData } from "./components/DataTable"
import { DatePicker } from "./components/DatePicker"
import { format } from "date-fns"
import { JobsDialog } from "./components/JobsDialog"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardPage() {
  const [data, setData] = useState<CompanyData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "company", desc: false }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [dateFilter, setDateFilter] = useState<Date | undefined>()
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jobs, setJobs] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        let url = '/api/dashboard'
        if (dateFilter) {
          const dateString = format(dateFilter, 'yyyy-MM-dd')
          url += `?date=${dateString}`
        }
        
        const response = await fetch(url)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateFilter])

  const fetchJobsForCompany = async (company: string) => {
    try {
      let query = supabase
        .from('jobs')
        .select('job-title, company, location, url, created_at')
        .eq('company', company)

      if (dateFilter) {
        const dateString = format(dateFilter, 'yyyy-MM-dd')
        const date = new Date(dateString)
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()
        
        query = query
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
      }

      const { data: jobsData, error } = await query

      if (error) throw error
      
      setJobs(jobsData || [])
      setSelectedCompany(company)
      setIsDialogOpen(true)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  // In your page.tsx, ensure the table options include:
const table = useReactTable({
  data,
  columns,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  state: {
    sorting,
    columnFilters,
  },
  meta: {
    onJobOpeningsClick: fetchJobsForCompany // Make sure this is set
  }
})

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="w-full p-4">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter companies..."
          value={(table.getColumn("company")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("company")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DatePicker 
          date={dateFilter}
          onDateChange={setDateFilter}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <JobsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        jobs={jobs}
        companyName={selectedCompany || ''}
      />
    </div>
  )
}