import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "./table"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const dataTableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      density: {
        comfortable: "",
        compact: "[&_th]:py-2 [&_td]:py-1.5",
        dense: "[&_th]:py-1.5 [&_td]:py-1",
      },
      hover: {
        true: "[&_tr]:hover:bg-ink/3",
        false: "",
      },
      striped: {
        true: "[&_tr:nth-child(even)]:bg-ink/3",
        false: "",
      },
    },
    defaultVariants: {
      density: "comfortable",
      hover: true,
      striped: false,
    },
  }
)

const tableRowVariants = cva(
  "border-b border-ink/10 transition-colors",
  {
    variants: {
      selectable: {
        true: "cursor-pointer hover:bg-ink/5",
        false: "",
      },
      selected: {
        true: "bg-clay/10 border-l-2 border-clay",
        false: "",
      },
    },
    defaultVariants: {
      selectable: false,
      selected: false,
    },
  }
)

interface DataTableProps extends React.ComponentProps<typeof Table> {
  density?: "comfortable" | "compact" | "dense"
  hover?: boolean
  striped?: boolean
}

interface DataTableRowProps extends React.ComponentProps<typeof TableRow> {
  selectable?: boolean
  selected?: boolean
}

export function DataTable({
  className,
  density = "comfortable",
  hover = true,
  striped = false,
  children,
  ...props
}: DataTableProps) {
  return (
    <Table
      className={cn(dataTableVariants({ density, hover, striped, className }))}
      {...props}
    >
      {children}
    </Table>
  )
}

export function DataTableHeader({ className, children, ...props }: React.ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader className={cn("[&_th]:font-mono [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-ink-mute [&_th]:bg-paper-2 [&_th]:border-b [&_th]:border-ink/10 [&_th]:px-3", className)} {...props}>
      {children}
    </TableHeader>
  )
}

export function DataTableBody({ className, children, ...props }: React.ComponentProps<typeof TableBody>) {
  return (
    <TableBody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
      {children}
    </TableBody>
  )
}

export function DataTableRow({
  className,
  selectable = false,
  selected = false,
  children,
  ...props
}: DataTableRowProps) {
  return (
    <TableRow
      className={cn(tableRowVariants({ selectable, selected, className }))}
      {...props}
    >
      {children}
    </TableRow>
  )
}

export function DataTableCell({ className, ...props }: React.ComponentProps<typeof TableCell>) {
  return (
    <TableCell
      className={cn("px-3 align-middle", className)}
      {...props}
    />
  )
}

export function DataTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn("font-mono text-xs uppercase tracking-wider text-ink-mute px-3 align-middle", className)}
      {...props}
    />
  )
}

export function DataTableCaption({ className, children, ...props }: React.ComponentProps<typeof TableCaption>) {
  return (
    <TableCaption
      className={cn("mt-4 text-sm text-ink-mute", className)}
      {...props}
    >
      {children}
    </TableCaption>
  )
}

export { dataTableVariants, tableRowVariants }