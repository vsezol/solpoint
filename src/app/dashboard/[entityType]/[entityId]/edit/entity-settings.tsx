"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { Settings, Edit, Save, X, UserPlus } from "lucide-react";
import type { Hub, Community, Project } from "@/types";

type EntityType = "hub" | "community" | "project" | "workspace";
type Entity = Hub | Community | Project;

interface EntitySettingsProps {
  entity: Entity;
  entityType: EntityType;
  entityId: string;
}

// Заглушки для типов сообществ
const COMMUNITY_TYPES = ["Meme", "NFT", "DAO", "DeFi", "Gaming", "Other"];
const VISIBILITY_OPTIONS = ["Public", "Private", "VIP Only", "Invite Only"];
const WHO_CAN_INVITE_OPTIONS = ["Everyone", "Moderators only"];

export function EntitySettings({
  entity,
  entityType,
  entityId,
}: EntitySettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: entity.description || "",
    communityType: "Meme", // Заглушка
    visibility: "Public", // Заглушка
    whoCanInvite: "Everyone", // Заглушка
    transferOwnership: "", // Заглушка
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let endpoint = "";
      if (entityType === "hub") {
        endpoint = `/api/hubs/${entityId}`;
      } else if (entityType === "community") {
        endpoint = `/api/communities/${entityId}`;
      } else if (entityType === "project" || entityType === "workspace") {
        endpoint = `/api/projects/${entityId}`;
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: formData.description || null,
        }),
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
                setFormData({
                  description: entity.description || "",
                  communityType: "Meme",
                  visibility: "Public",
                  whoCanInvite: "Everyone",
                  transferOwnership: "",
                });
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
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[var(--color-text-secondary)]">
              {formData.visibility}
            </p>
          )}
        </div>

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

