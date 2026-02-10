import { useState, useEffect, useRef } from "react";
import { GuardMobileLayout } from "@/components/layout/GuardMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useAvailableRecipients,
} from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function GuardMessages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedConversation || undefined);
  const { data: recipients = [] } = useAvailableRecipients();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  const availableRecipients = recipients.filter((r) => r.id !== user?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unreadIds = messages
        .filter((m) => !m.isRead && m.recipientId === user?.id)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        markAsRead.mutate(unreadIds);
      }
    }
  }, [selectedConversation, messages, user?.id, markAsRead]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const recipientId = showNewConversation ? newRecipientId : selectedConversation;
    if (!recipientId) return;

    sendMessage.mutate(
      {
        recipientId,
        content: newMessage.trim(),
        messageType: "direct",
      },
      {
        onSuccess: () => {
          setNewMessage("");
          if (showNewConversation) {
            setShowNewConversation(false);
            setSelectedConversation(newRecipientId);
            setNewRecipientId("");
          }
        },
      }
    );
  };

  const selectedParticipant = selectedConversation
    ? conversations.find((c) => c.participantId === selectedConversation)
    : null;

  // Conversation list view
  if (!selectedConversation && !showNewConversation) {
    return (
      <GuardMobileLayout title="Messages">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </div>

          {conversationsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
                <Button
                  variant="link"
                  onClick={() => setShowNewConversation(true)}
                >
                  Start a conversation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedConversation(conv.participantId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.participantAvatar} />
                        <AvatarFallback>
                          {conv.participantName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {conv.participantName}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="default">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv.lastMessageAt &&
                            formatDistanceToNow(new Date(conv.lastMessageAt), {
                              addSuffix: true,
                            })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </GuardMobileLayout>
    );
  }

  // New conversation view
  if (showNewConversation) {
    return (
      <GuardMobileLayout title="New Message">
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewConversation(false)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select Recipient</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={newRecipientId} onValueChange={setNewRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose who to message..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRecipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <span>{r.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {r.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {newRecipientId && (
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} disabled={sendMessage.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </GuardMobileLayout>
    );
  }

  // Chat view
  return (
    <GuardMobileLayout title={selectedParticipant?.participantName || "Chat"}>
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedConversation(null)}
          className="gap-2 w-fit mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
            />
            <Button onClick={handleSend} disabled={sendMessage.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </GuardMobileLayout>
  );
}
