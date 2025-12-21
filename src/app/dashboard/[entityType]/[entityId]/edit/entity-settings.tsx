"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { Settings, Edit, Save, X, UserPlus } from "lucide-react";
import type { Hub, Community, Project, Event } from "@/types";

type EntityType = "hub" | "community" | "project" | "workspace" | "event";
type Entity = Hub | Community | Project | Event;

interface EntitySettingsProps {
  entity: Entity;
  entityType: EntityType;
  entityId: string;
}

// Заглушки для типов сообществ
const COMMUNITY_TYPES = ["Meme", "NFT", "DAO", "DeFi", "Gaming", "Other"];
const VISIBILITY_OPTIONS = ["Public", "Private", "VIP Only", "Invite Only"];
const EVENT_VISIBILITY_OPTIONS = ["public", "vip_only"];
const WHO_CAN_INVITE_OPTIONS = ["Everyone", "Moderators only"];

export function EntitySettings({
  entity,
  entityType,
  entityId,
}: EntitySettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isEvent = entityType === "event";
  const event = isEvent ? (entity as Event) : null;
  
  // Инициализация formData
  const getInitialFormData = () => {
    const base = {
      description: entity.description || "",
      communityType: "Meme", // Заглушка
      visibility: isEvent ? (event?.visibility || "public") : "Public",
      whoCanInvite: "Everyone", // Заглушка
      transferOwnership: "", // Заглушка
    };
    
    if (isEvent && event) {
      return {
        ...base,
        startDate: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : "",
        endDate: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : "",
        isPaid: event.is_paid || false,
        priceSol: event.price_sol?.toString() || "",
        country: event.country || "",
        city: event.city || "",
        address: event.address || "",
        venueName: event.venue_name || "",
      };
    }
    
    return base;
  };
  
  const [formData, setFormData] = useState(getInitialFormData());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let endpoint = "";
      let body: any = {};
      
      if (entityType === "hub") {
        endpoint = `/api/hubs/${entityId}`;
        body = { description: formData.description || null };
      } else if (entityType === "community") {
        endpoint = `/api/communities/${entityId}`;
        body = { description: formData.description || null };
      } else if (entityType === "project" || entityType === "workspace") {
        endpoint = `/api/projects/${entityId}`;
        body = { description: formData.description || null };
      } else if (entityType === "event") {
        endpoint = `/api/events/${entityId}`;
        body = {
          description: formData.description || null,
          visibility: formData.visibility,
          start_date: formData.startDate ? new Date(formData.startDate).toISOString() : null,
          end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          is_paid: formData.isPaid,
          price_sol: formData.isPaid && formData.priceSol ? parseFloat(formData.priceSol) : null,
          country: formData.country || null,
          city: formData.city || null,
          address: formData.address || null,
          venue_name: formData.venueName || null,
        };
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update entity");
      }

      setIsEditing(false);
      // Перезагружаем страницу для обновления данных
      window.location.reload();
    } catch (error) {
      console.error("Error updating entity:", error);
      alert("Failed to update entity. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = () => {
    // TODO: Реализовать модальное окно для приглашения участника
    alert("Invite member functionality coming soon");
  };

  return (
    <Card variant="bordered">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Settings
          </h2>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                // Сбрасываем форму
                setFormData(getInitialFormData());
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter description"
              className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              rows={4}
            />
          ) : (
            <p className="text-[var(--color-text-secondary)]">
              {formData.description || "No description"}
            </p>
          )}
        </div>

        {/* Community Type (only for communities) */}
        {entityType === "community" && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Community type
            </label>
            {isEditing ? (
              <select
                value={formData.communityType}
                onChange={(e) =>
                  setFormData({ ...formData, communityType: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                {COMMUNITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                {formData.communityType}
              </p>
            )}
          </div>
        )}

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Visibility
          </label>
          {isEditing ? (
            <select
              value={formData.visibility}
              onChange={(e) =>
                setFormData({ ...formData, visibility: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              {(isEvent ? EVENT_VISIBILITY_OPTIONS : VISIBILITY_OPTIONS).map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[var(--color-text-secondary)] capitalize">
              {formData.visibility.replace("_", " ")}
            </p>
          )}
        </div>

        {/* Event Details */}
        {isEvent && (
          <>
            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Date & Time
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                      End Date & Time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[var(--color-text-secondary)]">
                  {formData.startDate
                    ? new Date(formData.startDate).toLocaleString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Not set"}
                  {formData.endDate &&
                    ` - ${new Date(formData.endDate).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </p>
              )}
            </div>

            {/* Tickets */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Tickets
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={(e) =>
                        setFormData({ ...formData, isPaid: e.target.checked })
                      }
                      className="rounded border-[var(--color-surface-border)]"
                    />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      Paid event
                    </span>
                  </label>
                  {formData.isPaid && (
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.priceSol}
                      onChange={(e) =>
                        setFormData({ ...formData, priceSol: e.target.value })
                      }
                      placeholder="Price in SOL"
                      className="w-full"
                    />
                  )}
                </div>
              ) : (
                <p className="text-[var(--color-text-secondary)]">
                  {formData.isPaid
                    ? `${formData.priceSol || 0} SOL`
                    : "Free"}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Location
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={formData.venueName}
                    onChange={(e) =>
                      setFormData({ ...formData, venueName: e.target.value })
                    }
                    placeholder="Venue name"
                    className="w-full"
                  />
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Address"
                    className="w-full"
                  />
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="City"
                    className="w-full"
                  />
                  <Input
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="Country"
                    className="w-full"
                  />
                </div>
              ) : (
                <p className="text-[var(--color-text-secondary)]">
                  {[
                    formData.venueName,
                    formData.address,
                    formData.city,
                    formData.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not specified"}
                </p>
              )}
            </div>
          </>
        )}

        {/* Who can invite */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Who can invite
          </label>
          {isEditing ? (
            <select
              value={formData.whoCanInvite}
              onChange={(e) =>
                setFormData({ ...formData, whoCanInvite: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              disabled
            >
              {WHO_CAN_INVITE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[var(--color-text-secondary)]">
              {formData.whoCanInvite}
            </p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            (Coming soon)
          </p>
        </div>

        {/* Transfer ownership */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Transfer ownership
          </label>
          {isEditing ? (
            <select
              value={formData.transferOwnership}
              onChange={(e) =>
                setFormData({ ...formData, transferOwnership: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              disabled
            >
              <option value="">Select a member...</option>
            </select>
          ) : (
            <p className="text-[var(--color-text-secondary)]">
              Not available
            </p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            (Coming soon)
          </p>
        </div>

        {/* Invite member button */}
        <div className="pt-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleInviteMember}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite member
          </Button>
        </div>
      </div>
    </Card>
  );
}

