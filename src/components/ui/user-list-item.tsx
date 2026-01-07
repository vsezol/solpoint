"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, ProSubscriptionModal } from "@/components/ui";
import { MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";

interface Member {
  id: string;
  avatar_url?: string | null;
  name: string;
  twitter_handle?: string;
  isVip?: boolean;
  isVerified?: boolean;
  isOwner?: boolean;
  joinedAt?: string;
}

interface UserListItemProps {
  member: Member;
  friendStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
  onAddFriend?: (userId: string) => void;
  sendingFriendRequest?: boolean;
  creatingChat?: boolean;
}

export function UserListItem({
  member,
  friendStatus = "none",
  onAddFriend,
  sendingFriendRequest = false,
  creatingChat = false,
}: UserListItemProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openChat } = useChat();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const isOwnProfile = currentUser?.id === member.id;

  const handleSendMessage = async (userId: string) => {
    if (!isAuthenticated) {
      return;
    }

    // Check if user has PRO subscription
    if (currentUser?.subscription_tier !== "vip") {
      setShowSubscriptionModal(true);
      return;
    }

    try {
      await openChat(userId);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const handleAddFriend = (userId: string) => {
    if (onAddFriend) {
      onAddFriend(userId);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
      <Link
        href={member.twitter_handle ? `/profile/${member.twitter_handle}` : "#"}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={member.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
              {member.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {member.name}
          </p>
          {member.twitter_handle && (
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              @{member.twitter_handle}
            </p>
          )}
        </div>
      </Link>
      {isAuthenticated && !isOwnProfile && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSendMessage(member.id)}
            disabled={creatingChat}
            title="Send Message"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          {friendStatus === "none" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddFriend(member.id)}
              disabled={sendingFriendRequest}
              title="Add Friend"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
          {friendStatus === "accepted" && (
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="Already Friends"
              className="cursor-default"
            >
              <UserCheck className="w-4 h-4 text-[var(--color-primary)]" />
            </Button>
          )}
        </div>
      )}
      
      {/* Subscription Modal */}
      <ProSubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title="Private messaging is available only with PRO subscription"
        description="Upgrade to PRO to send direct messages to other users."
      />
    </div>
  );
}

