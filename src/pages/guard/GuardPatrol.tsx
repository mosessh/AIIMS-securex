import { useState } from "react";
import { GuardMobileLayout } from "@/components/layout/GuardMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useGuardPatrolLogs,
  useHandoverNotes,
  useCreateHandoverNote,
  type HandoverNote,
} from "@/hooks/useGuardData";
import {
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function GuardPatrol() {
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [notePriority, setNotePriority] = useState<HandoverNote["priority"]>("normal");

  const { data: patrolLogs = [], isLoading: logsLoading } = useGuardPatrolLogs();
  const { data: handoverNotes = [], isLoading: notesLoading } = useHandoverNotes();
  const createNote = useCreateHandoverNote();

  const handleCreateNote = async () => {
    if (!noteContent.trim()) return;

    try {
      await createNote.mutateAsync({
        content: noteContent.trim(),
        priority: notePriority,
      });
      setNoteContent("");
      setNotePriority("normal");
      setAddNoteOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <GuardMobileLayout title="Patrol Logs">
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs" className="gap-2">
            <Clock className="h-4 w-4" />
            Patrol Logs
          </TabsTrigger>
          <TabsTrigger value="handover" className="gap-2">
            <FileText className="h-4 w-4" />
            Handover
          </TabsTrigger>
        </TabsList>

        {/* Patrol Logs Tab */}
        <TabsContent value="logs" className="space-y-3">
          {logsLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : patrolLogs.length > 0 ? (
            patrolLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {log.isOnTime ? (
                        <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <XCircle className="h-5 w-5 text-destructive" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {log.checkpointName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.siteName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.scannedAt), "MMM d, h:mm a")}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-foreground mt-2 p-2 bg-muted rounded">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={log.isOnTime ? "default" : "destructive"}>
                        {log.isOnTime ? "On Time" : "Late"}
                      </Badge>
                      {log.imageUrl && (
                        <a
                          href={log.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Photo
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No patrol logs yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start scanning checkpoints to record your patrol
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Handover Notes Tab */}
        <TabsContent value="handover" className="space-y-4">
          {/* Add Note Button */}
          <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Handover Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Handover Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="note-content">Note</Label>
                  <Textarea
                    id="note-content"
                    placeholder="Enter important information for the next shift..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={notePriority}
                    onValueChange={(v) => setNotePriority(v as HandoverNote["priority"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateNote}
                  disabled={!noteContent.trim() || createNote.isPending}
                >
                  {createNote.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Note"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Notes List */}
          {notesLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : handoverNotes.length > 0 ? (
            handoverNotes.map((note) => (
              <Card
                key={note.id}
                className={
                  note.priority === "urgent"
                    ? "border-destructive/50"
                    : note.priority === "high"
                    ? "border-warning/50"
                    : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            note.priority === "urgent"
                              ? "destructive"
                              : note.priority === "high"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {note.priority}
                        </Badge>
                        {note.acknowledged && (
                          <Badge variant="outline" className="text-success border-success/50">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        By {note.guardName} •{" "}
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No handover notes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create notes for the next shift
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </GuardMobileLayout>
  );
}
