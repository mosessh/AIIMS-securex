import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
  Users,
  ArrowLeft,
  Plus,
  Search,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedConversation || undefined);
  const { data: recipients = [] } = useAvailableRecipients();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Filter out current user from recipients
  const availableRecipients = recipients.filter((r) => r.id !== user?.id);

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewing conversation
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

  return (
    <AppLayout title="Messages" subtitle="Real-time communication with your team">
      <div className="h-[calc(100vh-12rem)] flex gap-4">
        {/* Conversations List */}
        <Card className="w-80 flex flex-col shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversations
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNewConversation(true);
                  setSelectedConversation(null);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 overflow-hidden">
            <ScrollArea className="h-full">
              {conversationsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowNewConversation(true)}
                  >
                    Start a new one
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv.participantId);
                        setShowNewConversation(false);
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedConversation === conv.participantId
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.participantAvatar} />
                          <AvatarFallback>
                            {conv.participantName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {conv.participantName}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
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
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {showNewConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNewConversation(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <CardTitle className="text-base">New Conversation</CardTitle>
                    <Select value={newRecipientId} onValueChange={setNewRecipientId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select recipient..." />
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
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
                Select a recipient to start messaging
              </CardContent>
            </>
          ) : selectedConversation ? (
            <>
              <CardHeader className="border-b py-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedParticipant?.participantAvatar} />
                    <AvatarFallback>
                      {selectedParticipant?.participantName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {selectedParticipant?.participantName}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
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
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </CardContent>
          )}

          {/* Message Input */}
          {(selectedConversation || (showNewConversation && newRecipientId)) && (
            <div className="p-4 border-t">
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
        </Card>
      </div>
    </AppLayout>
  );
}
