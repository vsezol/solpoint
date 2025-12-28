"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Avatar, Card } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { getChats, type Chat } from "@/lib/api/chats";

export default function ChatsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchChats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getChats();
        setChats(data);
      } catch (err) {
        console.error("Error fetching chats:", err);
        setError(err instanceof Error ? err.message : "Failed to load chats");
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isAuthenticated, router]);

  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return "No messages";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 mt-[50px]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            My Chats
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            All your conversations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--color-text-secondary)]">Loading chats...</div>
          </div>
        ) : error ? (
          <Card variant="bordered" className="p-6">
            <div className="text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </Card>
        ) : chats.length === 0 ? (
          <Card variant="bordered" className="p-12">
            <div className="text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">
                No chats yet. Start a conversation with someone!
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                variant="bordered"
                className="p-4 hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                onClick={() => router.push(`/chat/${chat.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    src={chat.otherUser.avatar_url || undefined}
                    alt={chat.otherUser.twitter_name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                        {chat.otherUser.twitter_name}
                      </h3>
                      {chat.otherUser.is_verified && (
                        <svg
                          className="w-4 h-4 text-blue-500 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {chat.unread_count > 0 && (
                        <span className="bg-[var(--color-primary)] text-white text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] truncate">
                      @{chat.otherUser.twitter_handle}
                    </p>
                    {chat.last_message_at && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {formatLastMessageTime(chat.last_message_at)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

