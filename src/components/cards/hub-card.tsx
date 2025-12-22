"use client";

import { Button } from "@/components/ui";
import type { Hub, Workspace } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink, MapPin, Users, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

interface HubCardProps {
  hub: Hub | Workspace;
  compact?: boolean;
}

export function HubCard({ hub, compact = false }: HubCardProps) {
  const router = useRouter();

  const handleCompactCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    if (hub.slug) {
      trackEvent("hub_card_click", {
        event_category: "Hubs",
        event_label: hub.slug || hub.id,
        hub_id: hub.id,
        hub_slug: hub.slug,
        hub_name: hub.name,
        source: "hub_card_compact",
      });
      router.push(`/hubs/${hub.slug}`);
    }
  };

  if (compact) {
    return (
      <div 
        onClick={handleCompactCardClick}
        className="p-4 min-w-[280px] cursor-pointer transition-all duration-300 hover:scale-105"
      >
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
            <span className="text-[var(--color-primary)]">
              {"address" in hub && hub.address ? "Address:" : "Country:"}
            </span>{" "}
            {"address" in hub && hub.address ? hub.address : hub.country}
            {hub.city && `, ${hub.city}`}
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
              onClick={(e) => {
                e.stopPropagation();
                trackEvent("hub_social_link_click", {
                  event_category: "Hubs",
                  event_label: hub.slug || hub.id,
                  hub_id: hub.id,
                  hub_slug: hub.slug,
                  social_platform: "twitter",
                  source: "hub_card_compact",
                });
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                trackEvent("hub_social_link_click", {
                  event_category: "Hubs",
                  event_label: hub.slug || hub.id,
                  hub_id: hub.id,
                  hub_slug: hub.slug,
                  social_platform: "instagram",
                  source: "hub_card_compact",
                });
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                trackEvent("hub_social_link_click", {
                  event_category: "Hubs",
                  event_label: hub.slug || hub.id,
                  hub_id: hub.id,
                  hub_slug: hub.slug,
                  social_platform: "facebook",
                  source: "hub_card_compact",
                });
              }}
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
            className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              trackEvent("hub_share_click", {
                event_category: "Hubs",
                event_label: hub.slug || hub.id,
                hub_id: hub.id,
                hub_slug: hub.slug,
                hub_name: hub.name,
                source: "hub_card_compact",
              });
              // TODO: Implement share functionality
            }}
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
          {hub.slug && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                trackEvent("hub_card_click", {
                  event_category: "Hubs",
                  event_label: hub.slug || hub.id,
                  hub_id: hub.id,
                  hub_slug: hub.slug,
                  hub_name: hub.name,
                  source: "hub_card_compact_details_button",
                });
              }}
              asChild
            >
              <Link href={`/hubs/${hub.slug}`}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Details
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Full card view
  const handleCardClick = (e: React.MouseEvent) => {
    // Не переходим если клик был на кнопку или ссылку
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    if (hub.slug) {
      router.push(`/hubs/${hub.slug}`);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5 flex flex-col h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:border-white hover:shadow-lg"
    >
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
              {"address" in hub && hub.address ? (
                `${hub.address}${hub.city ? `, ${hub.city}` : ""}${hub.country ? `, ${hub.country}` : ""}`
              ) : (
                <>
                  {hub.country}
                  {hub.city && `, ${hub.city}`}
                </>
              )}
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
      <div className="flex gap-3 mt-auto" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            trackEvent("hub_share_click", {
              event_category: "Hubs",
              event_label: hub.slug || hub.id,
              hub_id: hub.id,
              hub_slug: hub.slug,
              hub_name: hub.name,
              source: "hub_card_full",
            });
            // TODO: Implement share functionality
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        {hub.slug && (
          <Button 
            variant="outline" 
            className="flex-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              trackEvent("hub_card_click", {
                event_category: "Hubs",
                event_label: hub.slug || hub.id,
                hub_id: hub.id,
                hub_slug: hub.slug,
                hub_name: hub.name,
                source: "hub_card_full_details_button",
              });
            }}
            asChild
          >
            <Link href={`/hubs/${hub.slug}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Details
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

