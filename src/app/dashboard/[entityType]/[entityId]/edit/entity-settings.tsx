"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input } from "@/components/ui";
import { Settings, Edit, Save, X, UserPlus } from "lucide-react";
import type { Hub, Community, Project, Event, User, Workspace } from "@/types";

type EntityType = "hub" | "community" | "project" | "workspace" | "event";
type Entity = Hub | Community | Project | Event | Workspace;

interface EntitySettingsProps {
  entity: Entity;
  entityType: EntityType;
  entityId: string;
  members: (User & { role?: "owner" | "moderator" | "member" })[];
  currentUserId: string;
}

// Заглушки для типов сообществ
const COMMUNITY_TYPES = ["Meme", "NFT", "DAO", "DeFi", "Gaming", "Other"];
const VISIBILITY_OPTIONS = ["Public", "Private", "PRO Only", "Invite Only"];
const EVENT_VISIBILITY_OPTIONS = ["public", "vip_only"];
const WHO_CAN_INVITE_OPTIONS = ["Everyone", "Moderators only"];

export function EntitySettings({
  entity,
  entityType,
  entityId,
  members,
  currentUserId,
}: EntitySettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [availableEntities, setAvailableEntities] = useState<{
    hubs: Hub[];
    communities: Community[];
    projects: Project[];
    workspaces: Workspace[];
  }>({ hubs: [], communities: [], projects: [], workspaces: [] });
  
  const isEvent = entityType === "event";
  const isWorkspace = entityType === "workspace";
  const event = isEvent ? (entity as Event) : null;
  const workspace = isWorkspace ? (entity as Workspace) : null;
  
  // Получаем доступные сущности для transfer ownership (только для events)
  useEffect(() => {
    if (isEvent) {
      fetch("/api/users/created-entities")
        .then((res) => res.json())
        .then((data) => {
          setAvailableEntities({
            hubs: data.hubs || [],
            communities: data.communities || [],
            projects: data.projects || [],
            workspaces: data.workspaces || [],
          });
        })
        .catch((err) => console.error("Error fetching entities:", err));
    }
  }, [isEvent]);
  
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

    if (isWorkspace && workspace) {
      return {
        ...base,
        country: workspace.country || "",
        city: workspace.city || "",
        address: workspace.address || "",
        latitude: workspace.latitude?.toString() || "",
        longitude: workspace.longitude?.toString() || "",
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
      } else if (entityType === "project") {
        endpoint = `/api/projects/${entityId}`;
        body = { description: formData.description || null };
      } else if (entityType === "workspace") {
        endpoint = `/api/workspaces/${entityId}`;
        body = {
          description: formData.description || null,
          country: formData.country || null,
          city: formData.city || null,
          address: formData.address || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        };
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

  const handleTransferOwnership = async () => {
    if (!formData.transferOwnership) {
      alert("Please select a new owner");
      return;
    }

    if (!confirm("Are you sure you want to transfer ownership? This action cannot be undone.")) {
      return;
    }

    setIsTransferring(true);
    try {
      let endpoint = "";
      let body: any = {};

      if (isEvent) {
        // Для events может быть передача пользователю или сущности
        const [ownerType, ownerId] = formData.transferOwnership.split(":");
        endpoint = `/api/events/${entityId}/transfer-ownership`;
        body = {
          new_owner_type: ownerType,
          new_owner_id: ownerId,
        };
      } else {
        // Для других сущностей только пользователю
        endpoint = `/api/${entityType === "workspace" ? "workspaces" : `${entityType}s`}/${entityId}/transfer-ownership`;
        body = {
          new_owner_id: formData.transferOwnership,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to transfer ownership");
      }

      alert("Ownership transferred successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error transferring ownership:", error);
      alert(error instanceof Error ? error.message : "Failed to transfer ownership. Please try again.");
    } finally {
      setIsTransferring(false);
    }
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

        {/* Location для workspace */}
        {isWorkspace && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Location
            </label>
            {isEditing ? (
              <div className="space-y-2">
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
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  placeholder="Latitude"
                  className="w-full"
                />
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  placeholder="Longitude"
                  className="w-full"
                />
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                {[
                  formData.address,
                  formData.city,
                  formData.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "Not specified"}
                {formData.latitude && formData.longitude && (
                  <span className="text-xs text-[var(--color-text-muted)] block mt-1">
                    Coordinates: {formData.latitude}, {formData.longitude}
                  </span>
                )}
              </p>
            )}
          </div>
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

        {/* Transfer ownership - только для owner */}
        {members.find((m) => m.id === currentUserId)?.role === "owner" && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Transfer ownership
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <select
                  value={formData.transferOwnership}
                  onChange={(e) =>
                    setFormData({ ...formData, transferOwnership: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  disabled={isTransferring}
                >
                  <option value="">Select a new owner...</option>
                  {isEvent ? (
                    <>
                      <optgroup label="Members">
                        {members
                          .filter((m) => m.id !== currentUserId)
                          .map((member) => (
                            <option key={member.id} value={`user:${member.id}`}>
                              {member.twitter_name} (@{member.twitter_handle})
                            </option>
                          ))}
                      </optgroup>
                      {availableEntities.hubs.length > 0 && (
                        <optgroup label="Your Hubs">
                          {availableEntities.hubs.map((hub) => (
                            <option key={hub.id} value={`hub:${hub.id}`}>
                              {hub.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {availableEntities.communities.length > 0 && (
                        <optgroup label="Your Communities">
                          {availableEntities.communities.map((community) => (
                            <option key={community.id} value={`community:${community.id}`}>
                              {community.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {availableEntities.projects.length > 0 && (
                        <optgroup label="Your Projects">
                          {availableEntities.projects.map((project) => (
                            <option key={project.id} value={`project:${project.id}`}>
                              {project.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {availableEntities.workspaces.length > 0 && (
                        <optgroup label="Your Workspaces">
                          {availableEntities.workspaces.map((workspace) => (
                            <option key={workspace.id} value={`workspace:${workspace.id}`}>
                              {workspace.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    members
                      .filter((m) => m.id !== currentUserId)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.twitter_name} (@{member.twitter_handle})
                        </option>
                      ))
                  )}
                </select>
                {formData.transferOwnership && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleTransferOwnership}
                    disabled={isTransferring}
                    className="w-full"
                  >
                    {isTransferring ? "Transferring..." : "Transfer Ownership"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                Available in edit mode
              </p>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Only the current owner can transfer ownership
            </p>
          </div>
        )}

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

