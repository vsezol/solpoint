"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { Button, Input, LocationPicker, CheckBox } from "@/components/ui";
import { CountrySelect } from "@/components/ui/country-select";
import { createHub } from "@/lib/api/hubs";
import { createCommunity } from "@/lib/api/communities";
import { createProject } from "@/lib/api/projects";
import { createSubmission } from "@/lib/api/submissions";
import { geocodeAddress } from "@/lib/api/geocoding";
import { useAuth } from "@/hooks/use-auth";
import {
  MapPin,
  Globe,
  Twitter,
  Instagram,
  Facebook,
  Link as LinkIcon,
  Loader2,
  Search,
  Mail,
  MessageCircle,
  Flag,
} from "lucide-react";
import type { EntityType } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { useFormsStore, type LocationType } from "@/store/forms-store";

interface CreateEntityFormProps {
  entityType: EntityType;
  onSuccess?: (entity: { id: string; slug: string; type: EntityType }) => void;
  onCancel?: () => void;
}

export function CreateEntityForm({
  entityType,
  onSuccess,
  onCancel,
}: CreateEntityFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.is_admin || false;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Refs for scrolling to errors
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const locationErrorRef = useRef<HTMLDivElement>(null);
  const contactErrorRef = useRef<HTMLDivElement>(null);

  // Use Zustand store for form state
  const entityForm = useFormsStore((state) => state.entityForm);
  const {
    name,
    description,
    imageUrl,
    locationType,
    countryCode,
    city,
    latitude,
    longitude,
    socialsTwitter,
    socialsInstagram,
    socialsFacebook,
    socialsWebsite,
    contactEmail,
    contactTelegram,
    mapCenterLat,
    mapCenterLng,
    setName,
    setDescription,
    setImageUrl,
    setLocationType,
    setCountryCode,
    setCity,
    setLatitude,
    setLongitude,
    setSocialsTwitter,
    setSocialsInstagram,
    setSocialsFacebook,
    setSocialsWebsite,
    setContactEmail,
    setContactTelegram,
    setMapCenterLat,
    setMapCenterLng,
    resetEntityForm,
  } = entityForm;

  // Geocode city to coordinates
  const handleGeocodeCity = async () => {
    if (!city.trim()) {
      setError("Please enter a city to geocode");
      return;
    }

    setIsGeocoding(true);
    setError(null);

    try {
      let query = city.trim();
      let countryName: string | undefined;

      if (countryCode) {
        const { getCountryByCode } = await import("@/lib/countries");
        const countryData = await getCountryByCode(countryCode);
        countryName = countryData?.name;
        query = `${city.trim()}, ${countryName}`;
      }

      const result = await geocodeAddress(query, {
        country: countryName,
        city: city.trim() || undefined,
      });

      if (result && result.primary) {
        const coords = {
          lat: result.primary.latitude,
          lng: result.primary.longitude,
        };

        setLatitude(coords.lat.toString());
        setLongitude(coords.lng.toString());

        // Center map on geocoded location
        setMapCenterLat(coords.lat);
        setMapCenterLng(coords.lng);
      } else {
        setError(
          "Could not find coordinates for this city. Please try selecting location on the map."
        );
      }
    } catch (err: any) {
      console.error("Error geocoding:", err);
      setError("Failed to geocode city. Please try again or select location on the map.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle map location change (when user clicks on map)
  const handleMapLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
  };

  // Handle reverse geocoding result (when user clicks on map)
  const handleReverseGeocode = (result: {
    country: string;
    country_code?: string;
    city?: string;
    full_address: string;
  }) => {
    if (result.country_code) {
      setCountryCode(result.country_code);
    }
    if (result.city) {
      setCity(result.city);
    }
  };

  // Update map when coordinates change manually
  const currentLat = latitude ? parseFloat(latitude) : 0;
  const currentLng = longitude ? parseFloat(longitude) : 0;

  // Auto-center map on city when city changes
  useEffect(() => {
    const geocodeCity = async () => {
      if (!city.trim()) {
        setMapCenterLat(undefined);
        setMapCenterLng(undefined);
        return;
      }

      try {
        let query = city.trim();
        let countryName: string | undefined;

        if (countryCode) {
          const { getCountryByCode } = await import("@/lib/countries");
          const countryData = await getCountryByCode(countryCode);
          countryName = countryData?.name || countryCode;
          query = `${city.trim()}, ${countryName}`;
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
          {
            headers: {
              "User-Agent": "SolPoint/1.0",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data && data.length > 0) {
            const result = data[0];
            const cityCoords = {
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon),
            };
            setMapCenterLat(cityCoords.lat);
            setMapCenterLng(cityCoords.lng);

            if (!countryCode && result.address) {
              const addressData = result.address;
              const countryCodeFromResult =
                addressData.country_code?.toUpperCase() ||
                addressData["ISO3166-1:alpha2"]?.toUpperCase();

              if (countryCodeFromResult && countryCodeFromResult.length === 2) {
                setCountryCode(countryCodeFromResult);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error geocoding city:", error);
      }
    };

    const timeoutId = setTimeout(() => {
      geocodeCity();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [city, countryCode]);

  // Form validation based on entity type and required fields
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Name is required";
    }
    
    // Валидация локации в зависимости от выбранного типа
    if (locationType === "global") {
      // Для глобальных сущностей локация не требуется
    } else if (locationType === "country") {
      // Для страны требуется только страна, координаты опциональны
      if (!countryCode) {
        return "Please select a country";
      }

      // Если координаты указаны, проверяем их валидность
      if (latitude.trim() || longitude.trim()) {
        const lat = latitude.trim() ? parseFloat(latitude) : NaN;
        const lng = longitude.trim() ? parseFloat(longitude) : NaN;

        if (isNaN(lat) || isNaN(lng)) {
          return "Invalid coordinates. Please enter valid latitude and longitude or leave them empty";
        }

        if (lat < -90 || lat > 90) {
          return "Latitude must be between -90 and 90";
        }
        if (lng < -180 || lng > 180) {
          return "Longitude must be between -180 and 180";
        }
      }
    } else if (locationType === "city") {
      // Для города требуется страна, город и координаты
      if (!countryCode) {
        return "Please select a country";
      }
      if (!city.trim()) {
        return "City is required";
      }

      // Check coordinates
      const lat = latitude.trim() ? parseFloat(latitude) : NaN;
      const lng = longitude.trim() ? parseFloat(longitude) : NaN;

      if (!latitude.trim() || !longitude.trim() || isNaN(lat) || isNaN(lng)) {
        return "Coordinates are required. Use the map to select a location or geocode a city";
      }

      if (lat < -90 || lat > 90) {
        return "Latitude must be between -90 and 90";
      }
      if (lng < -180 || lng > 180) {
        return "Longitude must be between -180 and 180";
      }
    }

    // Для не-админов требуется хотя бы один контакт
    if (!isAdmin && !contactEmail.trim() && !contactTelegram.trim()) {
      return "Please provide at least one contact method (email or telegram) for review";
    }

    return null;
  };

  // Обработка отправки формы
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      
      // Определяем, к какому элементу нужно скроллить
      let scrollTarget: HTMLElement | null = null;
      
      // Проверяем тип ошибки и выбираем соответствующий элемент
      if (validationError.includes("Coordinates") || validationError.includes("Latitude") || validationError.includes("Longitude")) {
        scrollTarget = locationErrorRef.current;
      } else if (validationError.includes("contact")) {
        scrollTarget = contactErrorRef.current;
      } else {
        scrollTarget = errorRef.current;
      }
      
      // Скроллим к ошибке
      setTimeout(() => {
        if (scrollTarget) {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (errorRef.current) {
          // Если нет специфического элемента, скроллим к общему блоку ошибки
          errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);

    try {
      // Подготовка данных социальных сетей
      const socials: Record<string, string> = {};
      if (socialsTwitter.trim()) socials.twitter = socialsTwitter.trim();
      if (socialsInstagram.trim()) socials.instagram = socialsInstagram.trim();
      if (socialsFacebook.trim()) socials.facebook = socialsFacebook.trim();
      if (socialsWebsite.trim()) socials.website = socialsWebsite.trim();

      // Prepare location data based on locationType
      let locationData: Record<string, any> = {};
      if (locationType !== "global") {
        // Получаем название страны по коду
        const { getCountryByCode } = await import("@/lib/countries");
        const countryData = await getCountryByCode(countryCode!);
        const countryName = countryData?.name || countryCode!;

        // Для "country" координаты опциональны, для "city" обязательны
        const hasCoordinates = latitude.trim() && longitude.trim();
        let lat: number | null = null;
        let lng: number | null = null;
        
        if (hasCoordinates) {
          lat = parseFloat(latitude);
          lng = parseFloat(longitude);
        }

        locationData = {
          country: countryName,
          country_code: countryCode,
          city: locationType === "city" ? city.trim() : undefined,
          latitude: lat,
          longitude: lng,
        };
      }

      const entityData = {
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        ...locationData,
        socials: Object.keys(socials).length > 0 ? socials : undefined,
      };

      if (isAdmin) {
        // Админы создают напрямую
        let createdEntity;

        if (entityType === "hub") {
          createdEntity = await createHub(entityData);
        } else if (entityType === "community") {
          createdEntity = await createCommunity(entityData);
        } else if (entityType === "project") {
          // Проект требует creator_id
          createdEntity = await createProject({
            ...entityData,
            creator_id: user!.id,
          });
        } else {
          throw new Error("Invalid entity type");
        }

        if (createdEntity) {
          trackEvent(`${entityType}_created`, {
            event_category: "Entities",
            entity_id: createdEntity.id,
            entity_type: entityType,
          });

          resetEntityForm();

          if (onSuccess && createdEntity.slug) {
            onSuccess({
              id: createdEntity.id,
              slug: createdEntity.slug,
              type: entityType,
            });
          } else if (onSuccess) {
            onSuccess({
              id: createdEntity.id,
              slug: createdEntity.id,
              type: entityType,
            });
          }
        }
      } else {
        // Не-админы отправляют заявку
        const submission = await createSubmission({
          entity_type: entityType,
          entity_data: entityData,
          contacts: {
            email: contactEmail.trim() || undefined,
            telegram: contactTelegram.trim() || undefined,
          },
        });

        if (submission) {
          trackEvent(`${entityType}_submission_created`, {
            event_category: "Entities",
            submission_id: submission.id,
            entity_type: entityType,
          });

          resetEntityForm();
          setError(null);
          alert(
            `Your ${entityType} submission has been sent for review. We'll contact you once it's approved!`
          );

          if (onCancel) {
            onCancel();
          }
        }
      }
    } catch (err: any) {
      console.error(`Error creating ${entityType}/submission:`, err);
      setError(
        err.message ||
          (isAdmin
            ? `Failed to create ${entityType}. Please try again.`
            : `Failed to submit ${entityType} for review. Please try again.`)
      );
      // Скроллим к ошибке при ошибке сервера
      setTimeout(() => {
        if (errorRef.current) {
          errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const entityTypeLabel =
    entityType === "hub"
      ? "Hub"
      : entityType === "community"
      ? "Community"
      : "Project";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div ref={errorRef} className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-lg text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Basic Information
        </h3>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            {entityTypeLabel} Name <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g., Solana ${entityTypeLabel} ${entityType === "project" ? "XYZ" : "Moscow"}`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Tell us about your ${entityTypeLabel.toLowerCase()}...`}
            rows={4}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Image URL
          </label>
          <Input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location
        </h3>

        {/* Location Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Location Type <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="flex flex-col gap-3">
            <CheckBox
              type="radio"
              name="locationType"
              value="country"
              checked={locationType === "country"}
              onChange={(e) => {
                setLocationType(e.target.value as LocationType);
                // Очищаем город при выборе страны
                if (e.target.value === "country") {
                  setCity("");
                }
              }}
              label="Country"
              icon={<Flag className="w-4 h-4" />}
            />
            <CheckBox
              type="radio"
              name="locationType"
              value="city"
              checked={locationType === "city"}
              onChange={(e) => setLocationType(e.target.value as LocationType)}
              label="Country & City"
              icon={<MapPin className="w-4 h-4" />}
            />
            <CheckBox
              type="radio"
              name="locationType"
              value="global"
              checked={locationType === "global"}
              onChange={(e) => {
                setLocationType(e.target.value as LocationType);
                // Очищаем все поля локации при выборе глобал
                if (e.target.value === "global") {
                  setCountryCode(undefined);
                  setCity("");
                  setLatitude("");
                  setLongitude("");
                  setMapCenterLat(undefined);
                  setMapCenterLng(undefined);
                }
              }}
              label="Global"
              icon={<Globe className="w-4 h-4" />}
            />
          </div>
        </div>

        {locationType !== "global" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Country <span className="text-[var(--color-error)]">*</span>
                </label>
                <CountrySelect
                  value={countryCode}
                  onChange={setCountryCode}
                  placeholder="Select a country"
                />
              </div>

              {locationType === "city" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    City <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Moscow"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeocodeCity}
                      disabled={isGeocoding || !city.trim()}
                      title="Find coordinates from city"
                    >
                      {isGeocoding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

          {/* Hidden fields for coordinates */}
          <input
            type="hidden"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
          <input
            type="hidden"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />

          {/* Map for location selection */}
          <div ref={locationErrorRef}>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Select Location on Map <span className="text-[var(--color-error)]">*</span>
              <span className="text-[var(--color-text-muted)] text-xs font-normal ml-2">
                (Click on map to set coordinates)
              </span>
            </label>
            <LocationPicker
              latitude={currentLat}
              longitude={currentLng}
              onLocationChange={handleMapLocationChange}
              onReverseGeocode={handleReverseGeocode}
              centerLat={mapCenterLat}
              centerLng={mapCenterLng}
              centerZoom={13}
              height="300px"
            />
            {city && countryCode && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Map will automatically center on {city} when you select a city
              </p>
            )}
          </div>
          </>
        )}
      </div>

      {/* Contact Information (for non-admins) */}
      {!isAdmin && (
        <div ref={contactErrorRef} className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Information
            <span className="text-sm text-[var(--color-text-muted)] font-normal">
              (Required for review)
            </span>
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Please provide at least one contact method so we can reach you during the review
            process.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Email
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Telegram
              </label>
              <Input
                type="text"
                value={contactTelegram}
                onChange={(e) => setContactTelegram(e.target.value)}
                placeholder="@username"
                icon={<MessageCircle className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      )}

      {/* Social Media */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Social Media
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Twitter
            </label>
            <Input
              type="url"
              value={socialsTwitter}
              onChange={(e) => setSocialsTwitter(e.target.value)}
              placeholder="https://twitter.com/..."
              icon={<Twitter className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Instagram
            </label>
            <Input
              type="url"
              value={socialsInstagram}
              onChange={(e) => setSocialsInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              icon={<Instagram className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Facebook
            </label>
            <Input
              type="url"
              value={socialsFacebook}
              onChange={(e) => setSocialsFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              icon={<Facebook className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Website
            </label>
            <Input
              type="url"
              value={socialsWebsite}
              onChange={(e) => setSocialsWebsite(e.target.value)}
              placeholder="https://example.com"
              icon={<LinkIcon className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="flex-1"
        >
          {isSubmitting
            ? isAdmin
              ? "Creating..."
              : "Submitting..."
            : isAdmin
            ? `Create ${entityTypeLabel}`
            : `Submit for Review`}
        </Button>
      </div>
    </form>
  );
}

