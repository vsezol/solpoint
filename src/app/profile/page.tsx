"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import { Avatar, Button, Badge, Card, Input } from "@/components/ui";
import { UserCard } from "@/components/cards/user-card";
import {
  Settings,
  Edit,
  MapPin,
  Calendar,
  Twitter,
  Instagram,
  Facebook,
  Wallet,
  Crown,
  Users,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { mockUsers, mockEvents } from "@/lib/mock-data";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  // Mock current user (in real app, get from auth context)
  const user = mockUsers[0];
  const upcomingEvents = mockEvents.filter(
    (e) => new Date(e.start_date) > new Date()
  );
  const pastEvents = mockEvents.filter(
    (e) => new Date(e.start_date) <= new Date()
  );

  // Mock mutual friends
  const mutualFriends = mockUsers.slice(1, 4);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        {/* Hero / Cover */}
        <div className="h-48 bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-secondary)]/20 to-[var(--color-accent)]/20" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile header */}
          <div className="relative -mt-16 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Avatar */}
              <Avatar
                src={user.avatar_url}
                alt={user.twitter_name}
                size="xl"
                isVip={user.subscription_tier === "vip"}
                isVerified={user.is_verified}
                className="ring-4 ring-[var(--color-background)]"
              />

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {user.twitter_name}
                  </h1>
                  {user.is_verified && (
                    <Badge variant="primary" size="sm">
                      Verified
                    </Badge>
                  )}
                  {user.subscription_tier === "vip" && (
                    <Badge variant="warning" size="sm">
                      <Crown className="w-3 h-3 mr-1" />
                      VIP
                    </Badge>
                  )}
                </div>
                <p className="text-[var(--color-text-muted)]">
                  @{user.twitter_handle}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings">
                    <Settings className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column - Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Bio */}
              <Card variant="bordered">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                  About
                </h3>
                <p className="text-[var(--color-text-secondary)]">
                  {user.bio || "No bio yet"}
                </p>
              </Card>

              {/* Details */}
              <Card variant="bordered">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                  Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                    <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>
                      {user.city}, {user.country}
                    </span>
                  </div>
                  {user.role && (
                    <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                      <Users className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="capitalize">{user.role}</span>
                    </div>
                  )}
                  {user.is_open_to_meet && (
                    <Badge variant="success">Open to meet</Badge>
                  )}
                </div>
              </Card>

              {/* Socials */}
              <Card variant="bordered">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                  Socials
                </h3>
                <div className="flex gap-2">
                  <a
                    href={`https://twitter.com/${user.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  {user.socials?.instagram && (
                    <a
                      href={user.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {user.socials?.facebook && (
                    <a
                      href={user.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </Card>

              {/* Wallet */}
              <Card variant="bordered">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                  Wallet
                </h3>
                {user.wallet_address ? (
                  <p className="text-sm font-mono text-[var(--color-text-secondary)] truncate">
                    {user.wallet_address}
                  </p>
                ) : (
                  <Button variant="outline" size="sm" className="w-full">
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
              </Card>
            </div>

            {/* Right column - Activity */}
            <div className="lg:col-span-2 space-y-6">
              {/* Subscription status */}
              {user.subscription_tier === "free" && (
                <Card
                  variant="bordered"
                  className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                        Upgrade to VIP
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        See cities, profiles, send messages, and more
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/subscription">
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade
                      </Link>
                    </Button>
                  </div>
                </Card>
              )}

              {/* Mutual friends */}
              <Card variant="bordered">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">
                    Mutual Friends
                  </h3>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {mutualFriends.length} friends
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {mutualFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)]"
                    >
                      <Avatar
                        src={friend.avatar_url}
                        alt={friend.twitter_name}
                        size="sm"
                        isVip={friend.subscription_tier === "vip"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {friend.twitter_name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {friend.city}, {friend.country}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Upcoming Events */}
              <Card variant="bordered">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">
                    Upcoming Events
                  </h3>
                  <Link
                    href="/events"
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    View all
                  </Link>
                </div>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)]"
                      >
                        <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">
                            {event.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {new Date(event.start_date).toLocaleDateString()} •{" "}
                            {event.city}
                          </p>
                        </div>
                        <Badge variant="primary" size="sm">
                          {event.event_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[var(--color-text-muted)] py-4">
                    No upcoming events
                  </p>
                )}
              </Card>

              {/* Past Events */}
              <Card variant="bordered">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--color-text-primary)]">
                    Past Events
                  </h3>
                </div>
                {pastEvents.length > 0 ? (
                  <div className="space-y-3">
                    {pastEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)] opacity-70"
                      >
                        <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-border)] flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-[var(--color-text-muted)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">
                            {event.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {new Date(event.start_date).toLocaleDateString()} •{" "}
                            {event.city}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[var(--color-text-muted)] py-4">
                    No past events
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

