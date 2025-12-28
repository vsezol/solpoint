"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, CheckBox } from "@/components/ui";
import { CountrySelect } from "@/components/ui/country-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Settings, Edit, Save, X, UserPlus, Globe, MapPin } from "lucide-react";
import { getEntityConfig, type EntityType, type FieldConfig } from "@/lib/entity-config";
import type { Hub, Community, Project, Event, Workspace, User } from "@/types";
import { getCountryByCode } from "@/lib/countries";

type Entity = Hub | Community | Project | Event | Workspace;

interface EntitySettingsFormProps {
  entity: Entity;
  entityType: EntityType;
  entityId: string;
  members: (User & { role?: "owner" | "moderator" | "member" })[];
  currentUserId: string;
}

export function EntitySettingsForm({
  entity,
  entityType,
  entityId,
  members,
  currentUserId,
}: EntitySettingsFormProps) {
  const config = getEntityConfig(entityType);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [availableEntities, setAvailableEntities] = useState<{
    hubs: Hub[];
    communities: Community[];
    projects: Project[];
    workspaces: Workspace[];
  }>({ hubs: [], communities: [], projects: [], workspaces: [] });

  // Инициализация formData на основе конфигурации
  const getInitialFormData = () => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      if (field.transform?.get) {
        initial[field.key] = field.transform.get(entity);
      } else {
        initial[field.key] = (entity as any)[field.key] || "";
      }
    });
    return initial;
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Получаем доступные сущности для transfer ownership (только для events)
  useEffect(() => {
    if (entityType === "event") {
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
  }, [entityType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const body: Record<string, any> = {};

      config.fields.forEach((field) => {
        if (!field.editable) return;

        const value = formData[field.key];
        if (field.transform?.set) {
          Object.assign(body, field.transform.set(value));
        } else {
          body[field.key] = value;
        }
      });

      const response = await fetch(config.apiEndpoint(entityId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update entity");
      }

      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating entity:", error);
      alert("Failed to update entity. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = () => {
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

      if (entityType === "event") {
        const [ownerType, ownerId] = formData.transferOwnership.split(":");
        endpoint = `/api/events/${entityId}/transfer-ownership`;
        body = {
          new_owner_type: ownerType,
          new_owner_id: ownerId,
        };
      } else {
        endpoint = `/api/${entityType === "workspace" ? "workspaces" : `${entityType}s`}/${entityId}/transfer-ownership`;
        body = {
          new_owner_id: formData.transferOwnership,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const formatFieldValue = (field: FieldConfig, value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "Not set";
    }

    switch (field.type) {
      case "checkbox":
        return value ? "Yes" : "No";
      case "datetime":
        return value ? new Date(value).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) : "Not set";
      case "location":
        const locationParts = [
          value.venue_name,
          value.address,
          value.city,
          value.country,
        ].filter(Boolean);
        return locationParts.length > 0 ? locationParts.join(", ") : "Not specified";
      case "location-global":
        if (value.isGlobal) {
          return "Global";
        }
        const globalLocationParts = [value.city, value.country].filter(Boolean);
        return globalLocationParts.length > 0 ? globalLocationParts.join(", ") : "Not specified";
      default:
        return String(value);
    }
  };

  const renderField = (field: FieldConfig) => {
    // Проверяем видимость поля
    const isVisible = typeof field.visible === "function" 
      ? field.visible(entity) 
      : (field.visible ?? true);

    if (!isVisible) return null;

    // Проверяем зависимости
    if (field.dependsOn) {
      const dependsOnValue = formData[field.dependsOn];
      if (dependsOnValue !== field.dependsOnValue) {
        return null;
      }
    }

    const value = formData[field.key];

    // Режим просмотра
    if (!isEditing) {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {field.label}
          </label>
          <p className="text-[var(--color-text-secondary)]">
            {formatFieldValue(field, value)}
          </p>
        </div>
      );
    }

    // Режим редактирования
    switch (field.type) {
      case "textarea":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <textarea
              value={value || ""}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        );

      case "select":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <select
              value={value || ""}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "checkbox":
        return (
          <div key={field.key}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  const newFormData = { ...formData, [field.key]: newValue };
                  
                  // Если это is_online для events, очищаем поля локации
                  if (field.key === "is_online" && newValue === true) {
                    if (formData.location) {
                      newFormData.location = {
                        venue_name: "",
                        address: "",
                        city: "",
                        country: "",
                        country_code: "",
                      };
                    }
                  }
                  
                  setFormData(newFormData);
                }}
                className="rounded border-[var(--color-surface-border)]"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {field.label}
              </span>
            </label>
          </div>
        );

      case "datetime":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <input
              type="datetime-local"
              value={value || ""}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        );

      case "number":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <Input
              type="number"
              step="0.0001"
              value={value || ""}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full"
            />
          </div>
        );

      case "image-upload":
        return (
          <div key={field.key}>
            <ImageUpload
              value={value || undefined}
              onChange={async (url) => {
                setFormData({ ...formData, [field.key]: url || "" });
              }}
              onUpload={async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                
                let uploadEndpoint = "";
                if (entityType === "event") {
                  uploadEndpoint = `/api/events/${entityId}/image`;
                } else if (entityType === "hub") {
                  uploadEndpoint = `/api/hubs/${entityId}/image`;
                } else {
                  // Для других типов пока просто возвращаем blob URL
                  // TODO: создать API endpoints для communities, projects, workspaces
                  return URL.createObjectURL(file);
                }
                
                const response = await fetch(uploadEndpoint, {
                  method: "POST",
                  body: formData,
                });
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || "Failed to upload image");
                }
                
                const data = await response.json();
                return data.image_url;
              }}
              onDelete={async () => {
                let deleteEndpoint = "";
                if (entityType === "event") {
                  deleteEndpoint = `/api/events/${entityId}/image`;
                } else if (entityType === "hub") {
                  deleteEndpoint = `/api/hubs/${entityId}/image`;
                } else {
                  throw new Error("Delete not supported for this entity type yet");
                }
                
                const response = await fetch(deleteEndpoint, {
                  method: "DELETE",
                });
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.error || "Failed to delete image");
                }
                
                setFormData({ ...formData, [field.key]: "" });
              }}
              disabled={!isEditing || isSaving}
              label={field.label}
              previewClassName="w-full h-48 rounded-lg overflow-hidden border border-[var(--color-surface-border)] bg-[var(--color-surface)]"
            />
          </div>
        );

      case "location":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <div className="space-y-2">
              {value.venue_name !== undefined && (
                <Input
                  placeholder="Venue name"
                  value={value.venue_name || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    [field.key]: { ...value, venue_name: e.target.value }
                  })}
                  className="w-full"
                />
              )}
              <Input
                placeholder="Address"
                value={value.address || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  [field.key]: { ...value, address: e.target.value }
                })}
                className="w-full"
              />
              <Input
                placeholder="City"
                value={value.city || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  [field.key]: { ...value, city: e.target.value }
                })}
                className="w-full"
              />
              <CountrySelect
                value={value.country_code || value.country}
                onChange={async (code) => {
                  let countryName = "";
                  if (code) {
                    const countryData = await getCountryByCode(code);
                    countryName = countryData?.name || "";
                  }
                  setFormData({
                    ...formData,
                    [field.key]: { ...value, country: countryName, country_code: code }
                  });
                }}
                placeholder="Select a country"
              />
            </div>
          </div>
        );

      case "location-global":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <div className="space-y-3">
              {/* Radio buttons for location type using CheckBox component */}
              <div className="flex gap-4">
                <CheckBox
                  type="radio"
                  name={`${field.key}-locationType`}
                  value="country"
                  checked={!value.isGlobal}
                  onChange={() => setFormData({
                    ...formData,
                    [field.key]: { ...value, isGlobal: false }
                  })}
                  label="Country & City"
                  icon={<MapPin className="w-4 h-4" />}
                />
                <CheckBox
                  type="radio"
                  name={`${field.key}-locationType`}
                  value="global"
                  checked={value.isGlobal}
                  onChange={() => {
                    setFormData({
                      ...formData,
                      [field.key]: {
                        isGlobal: true,
                        country: "",
                        country_code: "",
                        city: "",
                        latitude: "",
                        longitude: "",
                      }
                    });
                  }}
                  label="Global"
                  icon={<Globe className="w-4 h-4" />}
                />
              </div>

              {/* Location fields (only if not global) */}
              {!value.isGlobal && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                      Country
                    </label>
                    <CountrySelect
                      value={value.country_code || value.country}
                      onChange={async (code) => {
                        let countryName = "";
                        if (code) {
                          const countryData = await getCountryByCode(code);
                          countryName = countryData?.name || "";
                        }
                        setFormData({
                          ...formData,
                          [field.key]: {
                            ...value,
                            country: countryName,
                            country_code: code || "",
                          }
                        });
                      }}
                      placeholder="Select a country"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                      City
                    </label>
                    <Input
                      placeholder="City"
                      value={value.city || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        [field.key]: { ...value, city: e.target.value }
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {field.label}
            </label>
            <Input
              value={value || ""}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full"
            />
          </div>
        );
    }
  };

  const isOwner = members.find((m) => m.id === currentUserId)?.role === "owner";

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
        {config.fields.map((field) => renderField(field))}

        {/* Who can invite - заглушка */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Who can invite
          </label>
          {isEditing ? (
            <select
              value="Everyone"
              disabled
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent opacity-50"
            >
              <option value="Everyone">Everyone</option>
              <option value="Moderators only">Moderators only</option>
            </select>
          ) : (
            <p className="text-[var(--color-text-secondary)]">Everyone</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            (Coming soon)
          </p>
        </div>

        {/* Transfer ownership - только для owner */}
        {isOwner && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Transfer ownership
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <select
                  value={formData.transferOwnership || ""}
                  onChange={(e) => setFormData({ ...formData, transferOwnership: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  disabled={isTransferring}
                >
                  <option value="">Select a new owner...</option>
                  {entityType === "event" ? (
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

