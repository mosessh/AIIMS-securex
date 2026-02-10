import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId?: string;
  recipientName?: string;
  siteId?: string;
  siteName?: string;
  content: string;
  messageType: "direct" | "broadcast" | "site_broadcast";
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function useMessages(conversationUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as { recipient_id: string; sender_id: string };
          if (msg.recipient_id === user.id || msg.sender_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["messages"] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["messages", conversationUserId],
    queryFn: async (): Promise<Message[]> => {
      if (!user) return [];

      let query = supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (conversationUserId) {
        query = query.or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},recipient_id.eq.${user.id})`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Get sender/recipient profiles
      const userIds = [...new Set(data.flatMap((m) => [m.sender_id, m.recipient_id].filter(Boolean)))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Get site names
      const siteIds = [...new Set(data.map((m) => m.site_id).filter(Boolean))] as string[];
      const { data: sites } = siteIds.length > 0
        ? await supabase.from("sites").select("id, name").in("id", siteIds)
        : { data: [] };
      const siteMap = new Map<string, string>();
      sites?.forEach((s) => siteMap.set(s.id, s.name));

      return data.map((msg): Message => {
        const sender = profileMap.get(msg.sender_id);
        const recipient = msg.recipient_id ? profileMap.get(msg.recipient_id) : undefined;

        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderName: sender?.full_name || "Unknown",
          senderAvatar: sender?.avatar_url || undefined,
          recipientId: msg.recipient_id || undefined,
          recipientName: recipient?.full_name || undefined,
          siteId: msg.site_id || undefined,
          siteName: msg.site_id ? siteMap.get(msg.site_id) || undefined : undefined,
          content: msg.content,
          messageType: msg.message_type as Message["messageType"],
          isRead: msg.is_read,
          readAt: msg.read_at || undefined,
          createdAt: msg.created_at,
        };
      });
    },
    enabled: !!user,
  });
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      // Get all direct messages
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("message_type", "direct")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map<string, {
        messages: typeof messages;
        unreadCount: number;
      }>();

      messages.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!partnerId) return;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, { messages: [], unreadCount: 0 });
        }

        const conv = conversationMap.get(partnerId)!;
        conv.messages.push(msg);
        if (!msg.is_read && msg.recipient_id === user.id) {
          conv.unreadCount++;
        }
      });

      // Get profiles for all partners
      const partnerIds = Array.from(conversationMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", partnerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return partnerIds.map((partnerId): Conversation => {
        const conv = conversationMap.get(partnerId)!;
        const profile = profileMap.get(partnerId);
        const lastMsg = conv.messages[0];

        return {
          id: partnerId,
          participantId: partnerId,
          participantName: profile?.full_name || "Unknown User",
          participantAvatar: profile?.avatar_url || undefined,
          lastMessage: lastMsg?.content || "",
          lastMessageAt: lastMsg?.created_at || "",
          unreadCount: conv.unreadCount,
        };
      });
    },
    enabled: !!user,
  });
}

export function useUnreadMessageCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages"],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientId,
      siteId,
      content,
      messageType = "direct",
    }: {
      recipientId?: string;
      siteId?: string;
      content: string;
      messageType?: "direct" | "broadcast" | "site_broadcast";
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: recipientId || null,
          site_id: siteId || null,
          content,
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error("Failed to send message", {
        description: error.message,
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", messageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    },
  });
}

export function useAvailableRecipients() {
  const { userRole } = useAuth();

  return useQuery({
    queryKey: ["available-recipients", userRole],
    queryFn: async () => {
      // Get all users with their roles
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");

      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      return users.map((u) => ({
        id: u.id,
        name: u.full_name || "Unknown",
        avatar: u.avatar_url,
        role: roleMap.get(u.id) || "guard",
      }));
    },
  });
}
