import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();

  return (
    <div className="relative w-full overflow-auto">
      {isMobile ? (
        // Mobile view - Convert table to card layout
        <div className="space-y-4">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === TableBody) {
              return React.Children.map(child.props.children, (row: any) => {
                if (React.isValidElement(row) && row.type === TableRow) {
                  const cells = React.Children.toArray(row.props.children);
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        "border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors",
                        row.props.className
                      )}
                    >
                      {cells.map((cell, index) => {
                        if (
                          React.isValidElement(cell) &&
                          cell.type === TableCell
                        ) {
                          const header = React.Children.toArray(
                            React.Children.toArray(children).find(
                              (child) =>
                                React.isValidElement(child) &&
                                child.type === TableHeader
                            )?.props.children
                          )[0]?.props.children[index];

                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center py-1"
                            >
                              {header && (
                                <span className="text-sm text-muted-foreground min-w-[80px]">
                                  {header}
                                </span>
                              )}
                              {/* Render the cell content directly */}
                              <div className="flex-1 flex items-center justify-end">
                                {React.cloneElement(cell, {
                                  className: cn(
                                    "text-sm font-medium text-foreground",
                                    cell.props.className
                                  ),
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                }
                return null;
              });
            }
            return null;
          })}
        </div>
      ) : (
        // Desktop view - Standard table
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        >
          {children}
        </table>
      )}
    </div>
  );
});
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
