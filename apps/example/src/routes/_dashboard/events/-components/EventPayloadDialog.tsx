import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { formatEventDate, type SyncEventView } from "./event-view";

interface EventPayloadDialogProps {
  event: SyncEventView;
  syncedLabel: string;
  pendingLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (eventId: string) => Promise<void>;
}

export function EventPayloadDialog({
  event,
  syncedLabel,
  pendingLabel,
  open,
  onOpenChange,
  onDelete,
}: EventPayloadDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await onDelete(event.eventId);
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Event payload</DialogTitle>
          <DialogDescription>
            {event.type} on {event.collectionId}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Event ID</dt>
          <dd className="font-mono text-xs break-all">{event.eventId}</dd>
          <dt className="text-muted-foreground">Key</dt>
          <dd className="font-mono text-xs break-all">{event.key}</dd>
          <dt className="text-muted-foreground">Global seq</dt>
          <dd>{event.globalSeq ?? "—"}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <Badge variant={event.sync ? "secondary" : "outline"}>
              {event.sync ? syncedLabel : pendingLabel}
            </Badge>
          </dd>
          <dt className="text-muted-foreground">Time</dt>
          <dd>{formatEventDate(event.timestamp)}</dd>
        </dl>

        <pre className="bg-muted max-h-[45vh] overflow-auto rounded-md p-4 text-xs">
          {JSON.stringify(event.payload, null, 2)}
        </pre>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={(domEvent) => {
              domEvent.preventDefault();
              void handleDelete();
            }}
          >
            {isPending ? <Spinner /> : <Trash2 />}
            Delete event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
