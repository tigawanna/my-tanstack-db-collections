import { useState } from "react";
import { Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EventPayloadDialog } from "./EventPayloadDialog";
import { formatEventDate, type SyncEventView } from "./event-view";

interface EventsTableProps {
  rows: SyncEventView[];
  isLoading: boolean;
  syncedLabel: string;
  pendingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  onDelete: (eventId: string) => Promise<void>;
}

export function EventsTable({
  rows,
  isLoading,
  syncedLabel,
  pendingLabel,
  emptyTitle,
  emptyDescription,
  onDelete,
}: EventsTableProps) {
  if (isLoading) {
    return <EventsTableSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Type</TableHead>
            <TableHead>Collection</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Seq</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-4">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((event) => (
            <EventRow
              key={event.eventId}
              event={event}
              syncedLabel={syncedLabel}
              pendingLabel={pendingLabel}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface EventRowProps {
  event: SyncEventView;
  syncedLabel: string;
  pendingLabel: string;
  onDelete: (eventId: string) => Promise<void>;
}

function EventRow({ event, syncedLabel, pendingLabel, onDelete }: EventRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen(true)}>
        <TableCell className="pl-4">
          <EventTypeBadge type={event.type} />
        </TableCell>
        <TableCell className="font-medium">{event.collectionId}</TableCell>
        <TableCell className="text-muted-foreground max-w-0">
          <span className="block truncate font-mono text-xs">{event.key}</span>
        </TableCell>
        <TableCell className="text-muted-foreground">{event.globalSeq ?? "—"}</TableCell>
        <TableCell>
          <SyncBadge sync={event.sync} syncedLabel={syncedLabel} pendingLabel={pendingLabel} />
        </TableCell>
        <TableCell className="text-muted-foreground pr-4">
          {formatEventDate(event.timestamp)}
        </TableCell>
      </TableRow>
      <EventPayloadDialog
        event={event}
        syncedLabel={syncedLabel}
        pendingLabel={pendingLabel}
        open={open}
        onOpenChange={setOpen}
        onDelete={onDelete}
      />
    </>
  );
}

function EventTypeBadge({ type }: { type: SyncEventView["type"] }) {
  if (type === "insert") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        Insert
      </Badge>
    );
  }

  if (type === "update") {
    return (
      <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
        Update
      </Badge>
    );
  }

  return (
    <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300">
      Delete
    </Badge>
  );
}

interface SyncBadgeProps {
  sync: boolean;
  syncedLabel: string;
  pendingLabel: string;
}

function SyncBadge({ sync, syncedLabel, pendingLabel }: SyncBadgeProps) {
  if (sync) {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        {syncedLabel}
      </Badge>
    );
  }

  return (
    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
      {pendingLabel}
    </Badge>
  );
}

function EventsTableSkeleton() {
  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Type</TableHead>
            <TableHead>Collection</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Seq</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-4">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="pl-4">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="pr-4">
                <Skeleton className="h-4 w-28" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
