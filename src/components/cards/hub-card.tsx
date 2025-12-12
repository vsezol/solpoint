"use client";

import { Button } from "@/components/ui";
import type { Hub } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink, MapPin, Users, Share2 } from "lucide-react";
import Image from "next/image";

interface HubCardProps {
  hub: Hub;
  compact?: boolean;
}

export function HubCard({ hub, compact = false }: HubCardProps) {
  if (compact) {
    return (
      <div className="p-4 min-w-[280px]">
        {/* Image */}
        <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-[var(--color-surface-hover)]">
          {hub.image_url ? (
            <Image
              src={hub.image_url}
              alt={hub.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-info)]/30 to-[var(--color-secondary)]/30">
              <Users className="w-10 h-10 text-[var(--color-info)]" />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-[var(--color-text-primary)] text-center mb-1">
          {hub.name}
        </h3>

        {/* Location */}
        <div className="space-y-1 text-sm mb-3">
          <p className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-primary)]">Country:</span>{" "}
            {hub.country}
          </p>
          {hub.description && (
            <div className="mt-2">
              <p className="text-xs text-[var(--color-primary)] mb-1">About:</p>
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3">
                {hub.description}
              </p>
            </div>
          )}
        </div>

        {/* Socials */}
        <div className="flex items-center gap-2 mb-4 justify-center">
          <span className="text-xs text-[var(--color-text-muted)]">Socials:</span>
          {hub.socials?.twitter && (
            <a
              href={hub.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {hub.socials?.instagram && (
            <a
              href={hub.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {hub.socials?.facebook && (
            <a
              href={hub.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)]"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <ExternalLink className="w-4 h-4 mr-1" />
            Details
          </Button>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-surface-hover)] flex-shrink-0">
          {hub.image_url ? (
            <Image
              src={hub.image_url}
              alt={hub.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-info)]/30 to-[var(--color-secondary)]/30">
              <Users className="w-10 h-10 text-[var(--color-info)]" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
            {hub.name}
          </h3>
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4" />
            <span>
              {hub.country}
              {hub.city && `, ${hub.city}`}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {hub.description && (
        <div className="mb-4">
          <p className="text-xs text-[var(--color-primary)] mb-1">About:</p>
          <p className="text-[var(--color-text-secondary)]">
            {hub.description}
          </p>
        </div>
      )}

      {/* Members count */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-[var(--color-info)]" />
        <span className="text-sm text-[var(--color-text-muted)]">
          {hub.members_count} members
        </span>
      </div>

      {/* Socials */}
      <div className="flex items-center gap-3 mb-4">
        {hub.socials?.twitter && (
          <a
            href={hub.socials.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </a>
        )}
        {hub.socials?.instagram && (
          <a
            href={hub.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Instagram className="w-5 h-5" />
          </a>
        )}
        {hub.socials?.website && (
          <a
            href={hub.socials.website}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button variant="outline" className="flex-1">
          <ExternalLink className="w-4 h-4 mr-2" />
          Details
        </Button>
      </div>
    </div>
  );
}

