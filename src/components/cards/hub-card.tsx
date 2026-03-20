"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import type { Hub, Community, Workspace, Project } from "@/types";
import { Twitter, Instagram, Facebook, ExternalLink, MapPin, Users, Share2, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

interface HubCardProps {
  hub: Hub | Community | Workspace | Project;
  compact?: boolean;
  entityType?: "hub" | "community" | "workspace" | "project";
  isBlurred?: boolean;
}

export function HubCard({ hub, compact = false, entityType, isBlurred = false }: HubCardProps) {
  const [copied, setCopied] = useState(false);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Определяем тип сущности автоматически, если не передан
  const detectEntityType = (): "hub" | "community" | "workspace" | "project" => {
    if (entityType) {
      return entityType;
    }
    // Workspace имеет обязательное поле address
    if ("address" in hub && hub.address) {
      return "workspace";
    }
    // Определить по другим признакам невозможно, возвращаем hub по умолчанию
    // В большинстве случаев entityType должен передаваться явно
    return "hub";
  };

  // Определяем тип сущности и путь
  const getEntityPath = (slug?: string | null, id?: string): string => {
    if (!slug && !id) {
      // Если нет ни slug, ни id, возвращаем пустой путь (не должно произойти)
      return "#";
    }
    
    const identifier = slug || id;
    if (!identifier) {
      return "#";
    }
    
    const detectedType = detectEntityType();
    
    if (detectedType === "community") {
      return `/communities/${identifier}`;
    }
    if (detectedType === "workspace") {
      return `/workspaces/${identifier}`;
    }
    if (detectedType === "project") {
      return `/projects/${identifier}`;
    }
    return `/hubs/${identifier}`;
  };

  // Получаем публичную ссылку на сущность
  const getPublicUrl = (): string => {
    if (typeof window === "undefined") {
      return "";
    }
    if (!hub.slug && !hub.id) {
      return window.location.href;
    }
    const path = getEntityPath(hub.slug, hub.id);
    return `${window.location.origin}${path}`;
  };

  // Обработчик копирования ссылки
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const url = getPublicUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);

      trackEvent("hub_share_click", {
        event_category: "Hubs",
        event_label: hub.slug || hub.id,
        hub_id: hub.id,
        hub_slug: hub.slug,
        hub_name: hub.name,
        source: compact ? "hub_card_compact" : "hub_card_full",
        share_method: "clipboard",
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      // Fallback для старых браузеров
      try {
        const textarea = document.createElement("textarea");
        textarea.value = getPublicUrl();
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
      }
    }
  };

  const kmFont = { fontFamily: "var(--font-kode-mono), monospace" } as const;

  /** Shared inner content for both compact variants */
  const compactInner = (stopPropOnSocials = false) => (
    <>
      {/* Image */}
      <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-white/10">
        {hub.image_url ? (
          <Image src={hub.image_url} alt={hub.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/10">
            <Users className="w-10 h-10 text-[#14f195]" />
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-white text-center mb-1 leading-snug" style={kmFont}>
        {hub.name}
      </h3>

      {/* Location */}
      <div className="space-y-1 text-sm mb-3" style={kmFont}>
        <p className="text-white/70">
          <span className="text-[#14f195]">
            {"address" in hub && hub.address ? "Address:" : "Country:"}
          </span>{" "}
          {"address" in hub && hub.address ? hub.address : hub.country}
          {hub.city && `, ${hub.city}`}
        </p>
        {hub.description && (
          <div className="mt-2">
            <p className="text-xs text-[#14f195] mb-1">About:</p>
            <p className="text-sm text-white/70 line-clamp-3">{hub.description}</p>
          </div>
        )}
      </div>

      {/* Socials */}
      <div className="flex items-center gap-2 mb-4 justify-center" onClick={stopPropOnSocials ? (e) => e.stopPropagation() : undefined}>
        <span className="text-xs text-white/40" style={kmFont}>Socials:</span>
        {hub.socials?.twitter && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); trackEvent("hub_social_link_click", { event_category: "Hubs", event_label: hub.slug || hub.id, hub_id: hub.id, hub_slug: hub.slug, social_platform: "twitter", source: "hub_card_compact" }); window.open(hub.socials!.twitter!, "_blank", "noopener,noreferrer"); }}
            className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white transition-colors">
            <Twitter className="w-4 h-4" />
          </button>
        )}
        {hub.socials?.instagram && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); trackEvent("hub_social_link_click", { event_category: "Hubs", event_label: hub.slug || hub.id, hub_id: hub.id, hub_slug: hub.slug, social_platform: "instagram", source: "hub_card_compact" }); window.open(hub.socials!.instagram!, "_blank", "noopener,noreferrer"); }}
            className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white transition-colors">
            <Instagram className="w-4 h-4" />
          </button>
        )}
        {hub.socials?.facebook && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); trackEvent("hub_social_link_click", { event_category: "Hubs", event_label: hub.slug || hub.id, hub_id: hub.id, hub_slug: hub.slug, social_platform: "facebook", source: "hub_card_compact" }); window.open(hub.socials!.facebook!, "_blank", "noopener,noreferrer"); }}
            className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white transition-colors">
            <Facebook className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );

  if (compact) {
    if (!hub.slug) {
      return (
        <div className="p-4 min-w-[280px] max-w-[350px] bg-[#101319] border border-white/8 rounded-[10px]">
          {compactInner(false)}
          {/* Actions */}
          {!isBlurred ? (
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#14f195] py-2 text-sm font-bold text-[#14f195] transition-opacity hover:opacity-80 cursor-pointer"
                style={kmFont}
              >
                {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Share2 className="w-4 h-4" />Share</>}
              </button>
            </div>
          ) : (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/signup" onClick={(e) => e.stopPropagation()}>Sign up / Log in</Link>
                </Button>
              </div>
              <div className="blur-sm pointer-events-none opacity-50">
                <div className="flex gap-2">
                  <button className="flex-1 rounded-full border border-[#14f195] py-2 text-sm font-bold text-[#14f195]" style={kmFont}>Share</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Если есть slug, оборачиваем в Link
    const path = getEntityPath(hub.slug, hub.id);
    return (
      <div className="p-4 min-w-[280px] max-w-[350px] bg-[#101319] border border-white/8 rounded-[10px]">
        {compactInner(true)}
        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#14f195] py-2 text-sm font-bold text-[#14f195] transition-opacity hover:opacity-80 cursor-pointer"
            style={kmFont}
          >
            {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Share2 className="w-4 h-4" />Share</>}
          </button>
          <Link
            href={path}
            onClick={(e) => { e.stopPropagation(); setTimeout(() => { trackEvent("hub_card_click", { event_category: "Hubs", event_label: hub.slug || hub.id, hub_id: hub.id, hub_slug: hub.slug, hub_name: hub.name, source: "hub_card_compact_details_button" }); }, 0); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/20 py-2 text-sm font-bold text-white/80 transition-opacity hover:opacity-80"
            style={kmFont}
          >
            <ExternalLink className="w-4 h-4" />
            Details
          </Link>
        </div>
      </div>
    );
  }

  // Full card view
  // Всегда рендерим карточку с Link, если есть slug или id
  // Если нет ни того, ни другого - рендерим без Link (но такого не должно быть)
  const path = hub.slug || hub.id ? getEntityPath(hub.slug, hub.id) : "#";
  return (
    <Link
      href={path}
      onClick={() => {
        trackEvent("hub_card_click", {
          event_category: "Hubs",
          event_label: hub.slug || hub.id,
          hub_id: hub.id,
          hub_slug: hub.slug,
          hub_name: hub.name,
          source: "hub_card_full",
        });
      }}
      className="block bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl p-5 flex flex-col h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:border-[var(--color-primary)] hover:shadow-lg"
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
      <div className="flex items-center gap-3 mb-4" onClick={(e) => e.stopPropagation()}>
        {hub.socials?.twitter && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(hub.socials!.twitter!, "_blank", "noopener,noreferrer");
            }}
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </button>
        )}
        {hub.socials?.instagram && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(hub.socials!.instagram!, "_blank", "noopener,noreferrer");
            }}
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Instagram className="w-5 h-5" />
          </button>
        )}
        {hub.socials?.website && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(hub.socials!.website!, "_blank", "noopener,noreferrer");
            }}
            className="p-2 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-auto" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          className="flex-1 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer"
          onClick={handleShare}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </>
          )}
        </Button>
        {(hub.slug || hub.id) && (
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Вызываем trackEvent асинхронно, чтобы не блокировать навигацию
              setTimeout(() => {
                trackEvent("hub_card_click", {
                  event_category: "Hubs",
                  event_label: hub.slug || hub.id,
                  hub_id: hub.id,
                  hub_slug: hub.slug,
                  hub_name: hub.name,
                  source: "hub_card_full_details_button",
                });
              }, 0);
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Details
          </Button>
        )}
      </div>
    </Link>
  );
}

