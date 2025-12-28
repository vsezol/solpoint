"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Button, Input } from "@/components/ui";

// Dynamic import for LocationPicker to avoid SSR issues with leaflet
const LocationPicker = dynamic(
  () => import("@/components/ui/location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg">
        <div className="text-[var(--color-text-muted)]">Loading map...</div>
      </div>
    ),
  }
);
import { CountrySelect } from "@/components/ui/country-select";
import { createEvent } from "@/lib/api/events";
import { createSubmission } from "@/lib/api/submissions";
import { geocodeAddress } from "@/lib/api/geocoding";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Calendar, DollarSign, Users, Globe, Twitter, Instagram, Facebook, Link as LinkIcon, Loader2, Search, Mail, MessageCircle } from "lucide-react";
import type { EventType, EventVisibility } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { useFormsStore } from "@/store/forms-store";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./image-upload";

interface CreateEventFormProps {
  onSuccess?: (event: { id: string; slug: string }) => void;
  onCancel?: () => void;
}

export function CreateEventForm({ onSuccess, onCancel }: CreateEventFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.is_admin || false;
  const isVip = user?.subscription_tier === "vip";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  
  // Refs for scrolling to errors
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const locationErrorRef = useRef<HTMLDivElement>(null);
  const contactErrorRef = useRef<HTMLDivElement>(null);
  
  // Validation errors for individual fields
  const [locationError, setLocationError] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [contactTelegramError, setContactTelegramError] = useState<string | null>(null);
  
  // Use Zustand store for form state
  const eventForm = useFormsStore((state) => state.eventForm);
  const {
    name,
    description,
    imageUrl,
    countryCode,
    city,
    address,
    latitude,
    longitude,
    startDate,
    endDate,
    eventType,
    visibility,
    isPaid,
    priceSol,
    maxAttendees,
    isOnline,
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
    setCountryCode,
    setCity,
    setAddress,
    setLatitude,
    setLongitude,
    setStartDate,
    setEndDate,
    setEventType,
    setVisibility,
    setIsPaid,
    setPriceSol,
    setMaxAttendees,
    setIsOnline,
    setSocialsTwitter,
    setSocialsInstagram,
    setSocialsFacebook,
    setSocialsWebsite,
    setContactEmail,
    setContactTelegram,
    setMapCenterLat,
    setMapCenterLng,
    resetEventForm,
  } = eventForm;


  // Geocode address to coordinates
  const handleGeocodeAddress = async () => {
    if (!address.trim() && !city.trim()) {
      setError("Please enter an address or city to geocode");
      return;
    }

    setIsGeocoding(true);
    setError(null);
    setLocationError(null);

    try {
      // Build address string
      let addressQuery = "";
      if (address.trim()) {
        addressQuery = address.trim();
      }
      if (city.trim() && !addressQuery.includes(city)) {
        addressQuery = city.trim() + (addressQuery ? `, ${addressQuery}` : "");
      }

      // Get country name for better geocoding
      let countryName: string | undefined;
      if (countryCode) {
        const { getCountryByCode } = await import("@/lib/countries");
        const countryData = await getCountryByCode(countryCode);
        countryName = countryData?.name;
      }

      const result = await geocodeAddress(addressQuery, {
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
        
        // Clear location error on successful geocoding
        setLocationError(null);
        
        // Optionally update address with the found address
        if (result.primary.display_name && !address.trim()) {
          setAddress(result.primary.display_name);
        }
        
        // Try to extract country code from geocoding result if not set
        if (!countryCode && result.primary.address) {
          const addressData = result.primary.address;
          // Nominatim returns country_code in different formats
          const countryCodeFromResult = 
            addressData.country_code?.toUpperCase() ||
            addressData['ISO3166-1:alpha2']?.toUpperCase();
          
          if (countryCodeFromResult && countryCodeFromResult.length === 2) {
            setCountryCode(countryCodeFromResult);
          }
        }
      } else {
        setLocationError("Could not find coordinates for this address. Please try a more specific address or select location on the map.");
      }
    } catch (err: any) {
      console.error("Error geocoding:", err);
      setLocationError("Failed to geocode address. Please try again or select location on the map.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle map location change (when user clicks on map)
  const handleMapLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    // Clear location error when point is selected
    setLocationError(null);
    // Don't update map center here - user is manually selecting location
  };

  // Handle reverse geocoding result (when user clicks on map)
  const handleReverseGeocode = (result: {
    country: string;
    country_code?: string;
    city?: string;
    full_address: string;
  }) => {
    // Update country if code is available
    if (result.country_code) {
      setCountryCode(result.country_code);
    }
    
    // Update city if available
    if (result.city) {
      setCity(result.city);
    }
    
    // Update address with full address
    if (result.full_address) {
      setAddress(result.full_address);
    }
  };

  // Update map when coordinates change manually
  const currentLat = latitude ? parseFloat(latitude) : 0;
  const currentLng = longitude ? parseFloat(longitude) : 0;

  // Auto-center map on city when city changes
  useEffect(() => {
    const geocodeCity = async () => {
      if (!city.trim()) {
        // Reset map center if city is cleared
        setMapCenterLat(undefined);
        setMapCenterLng(undefined);
        return;
      }

      // If no country selected, try geocoding just the city
      // Otherwise use country for better accuracy
      try {
        let query = city.trim();
        let countryName: string | undefined;

        if (countryCode) {
          // Get country name
          const { getCountryByCode } = await import("@/lib/countries");
          const countryData = await getCountryByCode(countryCode);
          countryName = countryData?.name || countryCode;
          query = `${city.trim()}, ${countryName}`;
        }

        // Geocode city directly using Nominatim (simple request, no need for endpoint)
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
            
            // Auto-select country if not already selected
            if (!countryCode && result.address) {
              const addressData = result.address;
              // Nominatim returns country_code in different formats
              const countryCodeFromResult = 
                addressData.country_code?.toUpperCase() ||
                addressData['ISO3166-1:alpha2']?.toUpperCase();
              
              if (countryCodeFromResult && countryCodeFromResult.length === 2) {
                setCountryCode(countryCodeFromResult);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error geocoding city:", error);
        // Silently fail - user can still use the map manually
      }
    };

    // Debounce: wait 500ms after user stops typing
    const timeoutId = setTimeout(() => {
      geocodeCity();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [city, countryCode]);

  // Form validation
  const validateForm = (): boolean => {
    // Clear all errors
    setError(null);
    setLocationError(null);
    setContactEmailError(null);
    setContactTelegramError(null);
    
    let hasErrors = false;
    let firstErrorElement: HTMLElement | null = null;

    if (!name.trim()) {
      setError("Event name is required");
      hasErrors = true;
      if (!firstErrorElement && errorRef.current) {
        firstErrorElement = errorRef.current;
      }
    }
    
    // Валидация локации - если событие не онлайн, требуется локация
    if (!isOnline) {
      if (!countryCode) {
        if (!error) setError("Please select a country");
        hasErrors = true;
        if (!firstErrorElement && errorRef.current) {
          firstErrorElement = errorRef.current;
        }
      }
      if (!city.trim()) {
        if (!error) setError("City is required");
        hasErrors = true;
        if (!firstErrorElement && errorRef.current) {
          firstErrorElement = errorRef.current;
        }
      }
      
      // Check coordinates - now a point on the map is required
      const lat = latitude.trim() ? parseFloat(latitude) : NaN;
      const lng = longitude.trim() ? parseFloat(longitude) : NaN;
      
      if (!latitude.trim() || !longitude.trim() || isNaN(lat) || isNaN(lng)) {
        setLocationError("Please select a location on the map to specify the event location");
        hasErrors = true;
        if (!firstErrorElement && locationErrorRef.current) {
          firstErrorElement = locationErrorRef.current;
        }
      } else if (lat < -90 || lat > 90) {
        setLocationError("Latitude must be between -90 and 90");
        hasErrors = true;
        if (!firstErrorElement && locationErrorRef.current) {
          firstErrorElement = locationErrorRef.current;
        }
      } else if (lng < -180 || lng > 180) {
        setLocationError("Longitude must be between -180 and 180");
        hasErrors = true;
        if (!firstErrorElement && locationErrorRef.current) {
          firstErrorElement = locationErrorRef.current;
        }
      }
    }
    
    if (!startDate) {
      if (!error) setError("Start date is required");
      hasErrors = true;
      if (!firstErrorElement && errorRef.current) {
        firstErrorElement = errorRef.current;
      }
    }

    if (isPaid && (!priceSol || parseFloat(priceSol) <= 0)) {
      if (!error) setError("Please specify a price for paid events");
      hasErrors = true;
      if (!firstErrorElement && errorRef.current) {
        firstErrorElement = errorRef.current;
      }
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      if (!error) setError("End date cannot be earlier than start date");
      hasErrors = true;
      if (!firstErrorElement && errorRef.current) {
        firstErrorElement = errorRef.current;
      }
    }

    // For non-admins, at least one contact is required
    if (!isAdmin) {
      if (!contactEmail.trim() && !contactTelegram.trim()) {
        setContactEmailError("Please provide at least one contact method (email or telegram)");
        setContactTelegramError("Please provide at least one contact method (email or telegram)");
        hasErrors = true;
        if (!firstErrorElement && contactErrorRef.current) {
          firstErrorElement = contactErrorRef.current;
        }
      } else {
        // Validate email if provided
        if (contactEmail.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(contactEmail.trim())) {
            setContactEmailError("Please enter a valid email address");
            hasErrors = true;
            if (!firstErrorElement && contactErrorRef.current) {
              firstErrorElement = contactErrorRef.current;
            }
          }
        }
        // Validate telegram if provided
        if (contactTelegram.trim()) {
          const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
          if (!telegramRegex.test(contactTelegram.trim().replace('@', ''))) {
            setContactTelegramError("Please enter a valid telegram username (e.g., @username)");
            hasErrors = true;
            if (!firstErrorElement && contactErrorRef.current) {
              firstErrorElement = contactErrorRef.current;
            }
          }
        }
      }
    }

    // Scroll to first error
    if (hasErrors) {
      setTimeout(() => {
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (errorRef.current) {
          // Если нет специфического элемента ошибки, скроллим к общему блоку ошибки
          errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }

    return !hasErrors;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocationError(null);
    setContactEmailError(null);
    setContactTelegramError(null);

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare social media data
      const socials: Record<string, string> = {};
      if (socialsTwitter.trim()) socials.twitter = socialsTwitter.trim();
      if (socialsInstagram.trim()) socials.instagram = socialsInstagram.trim();
      if (socialsFacebook.trim()) socials.facebook = socialsFacebook.trim();
      if (socialsWebsite.trim()) socials.website = socialsWebsite.trim();

      // Prepare location data - если событие не онлайн, отправляем локацию
      let locationData: Record<string, any> = {};
      if (!isOnline) {
        // Get country name by code
        const { getCountryByCode } = await import("@/lib/countries");
        const countryData = await getCountryByCode(countryCode!);
        const countryName = countryData?.name || countryCode!;

        locationData = {
          country: countryName,
          country_code: countryCode,
          city: city.trim(),
          address: address.trim() || undefined,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        };
      }

      const eventData = {
        name: name.trim(),
        description: description.trim() || undefined,
        // Не передаем image_url если выбран файл (загрузим после создания) или если это blob URL
        image_url: selectedImageFile 
          ? undefined 
          : (imageUrl.trim() && !imageUrl.startsWith("blob:")) 
            ? imageUrl.trim() 
            : undefined,
        ...locationData,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        event_type: eventType,
        visibility: visibility,
        is_paid: isPaid,
        price_sol: isPaid && priceSol ? parseFloat(priceSol) : undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        is_online: isOnline,
        socials: Object.keys(socials).length > 0 ? socials : undefined,
        contacts: {
          email: contactEmail.trim() || undefined,
          telegram: contactTelegram.trim() || undefined,
        },
      };

      if (isAdmin) {
        // Admins create directly
        const createdEvent = await createEvent(eventData);

        if (createdEvent) {
          // Если был выбран файл для загрузки, загружаем его
          if (selectedImageFile) {
            try {
              const formData = new FormData();
              formData.append("file", selectedImageFile);
              
              const uploadResponse = await fetch(`/api/events/${createdEvent.id}/image`, {
                method: "POST",
                body: formData,
              });

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to upload image");
              }
              
              const uploadData = await uploadResponse.json();
              // Обновляем imageUrl с реальным URL после загрузки (для будущего использования)
              if (uploadData.image_url) {
                setImageUrl(uploadData.image_url);
                setSelectedImageFile(null); // Очищаем файл после успешной загрузки
              }
            } catch (uploadError) {
              console.error("Error uploading image:", uploadError);
              alert(uploadError instanceof Error ? uploadError.message : "Failed to upload image. The event was created but the image was not uploaded.");
              // Не очищаем selectedImageFile при ошибке, чтобы пользователь мог попробовать снова
            }
          }

          trackEvent("event_created", {
            event_category: "Events",
            event_id: createdEvent.id,
            event_type: eventType,
          });

          // Reset form
          resetEventForm();
          setSelectedImageFile(null);

          if (onSuccess && createdEvent.slug) {
            onSuccess({ id: createdEvent.id, slug: createdEvent.slug });
          } else if (onSuccess) {
            onSuccess({ id: createdEvent.id, slug: createdEvent.id });
          }
        }
      } else {
        // Non-admins with PRO subscription submit for review
        // Non-admins without PRO subscription cannot create events
        if (!isVip) {
          setError("A PRO subscription is required to create events. Please upgrade to PRO to unlock this feature.");
          setIsSubmitting(false);
          return;
        }
        
        const submission = await createSubmission({
          entity_type: "event",
          entity_data: eventData,
          contacts: {
            email: contactEmail.trim() || undefined,
            telegram: contactTelegram.trim() || undefined,
          },
        });

        if (submission) {
          trackEvent("event_submission_created", {
            event_category: "Events",
            submission_id: submission.id,
            event_type: eventType,
          });

          // Reset form
          resetEventForm();

          // Show success message
          setError(null);
          alert("Your event submission has been sent for review. We'll contact you once it's approved!");
          
          if (onCancel) {
            onCancel();
          }
        }
      }
    } catch (err: any) {
      console.error("Error creating event/submission:", err);
      setError(err.message || (isAdmin ? "Failed to create event. Please try again." : "Failed to submit event for review. Please try again."));
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div ref={errorRef} className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-lg text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Basic Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Event Name <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Solana Hackathon 2024"
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
            placeholder="Tell us about your event..."
            rows={4}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Image
          </label>
          <div className="space-y-2">
            <ImageUpload
              value={imageUrl && !imageUrl.startsWith("blob:") ? imageUrl : undefined}
              onChange={(url) => {
                // Не устанавливаем blob URL в imageUrl, только реальный URL после загрузки
                if (url && !url.startsWith("blob:")) {
                  setImageUrl(url);
                  setSelectedImageFile(null); // Очищаем файл только когда получили реальный URL
                } else if (!url) {
                  setImageUrl("");
                  setSelectedImageFile(null);
                }
                // Не очищаем selectedImageFile если это blob URL (будет очищен после загрузки)
              }}
              onUpload={async (file) => {
                setSelectedImageFile(file);
                // Возвращаем blob URL только для preview
                return URL.createObjectURL(file);
              }}
              disabled={isSubmitting}
              label=""
              previewClassName="w-full h-48 rounded-lg overflow-hidden border border-[var(--color-surface-border)] bg-[var(--color-surface)]"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location
        </h3>

        {/* Online Event Checkbox - Pill Style */}
        <div className="flex items-center gap-3">
          <label
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full border transition-all cursor-pointer select-none",
              isOnline
                ? "border-[var(--color-primary)] bg-[var(--color-surface-hover)] text-[var(--color-primary)]"
                : "border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
            )}
          >
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => {
                setIsOnline(e.target.checked);
                // Очищаем все поля локации при включении онлайн режима
                if (e.target.checked) {
                  setCountryCode(undefined);
                  setCity("");
                  setAddress("");
                  setLatitude("");
                  setLongitude("");
                  setMapCenterLat(undefined);
                  setMapCenterLng(undefined);
                }
              }}
              className="sr-only"
            />
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Online Event
            </span>
          </label>
        </div>

        {!isOnline && (
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

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  City <span className="text-[var(--color-error)]">*</span>
                </label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  required
                />
              </div>
            </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Address
          </label>
          <div className="flex gap-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, building, office"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleGeocodeAddress}
              disabled={isGeocoding || (!address.trim() && !city.trim())}
              title="Find coordinates from address"
            >
              {isGeocoding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Enter an address and click search to find coordinates, or select location on the map below
          </p>
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
            <span className="text-[var(--color-text-muted)] text-xs font-normal ml-2">(Click on map to set coordinates)</span>
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
          {locationError && (
            <p className="mt-2 text-sm text-[var(--color-error)]">{locationError}</p>
          )}
          {city && countryCode && !locationError && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Map will automatically center on {city} when you select a city
            </p>
          )}
        </div>

          </>
        )}
      </div>

      {/* Date & Time */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Date & Time
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Start Date & Time <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              End Date & Time
            </label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Type & Visibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Event Type <span className="text-[var(--color-error)]">*</span>
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              required
            >
              <option value="official">Official</option>
              <option value="community">Community</option>
              <option value="meetup">Meetup</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Visibility <span className="text-[var(--color-error)]">*</span>
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as EventVisibility)}
              className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              required
            >
              <option value="public">Public</option>
              <option value="vip_only">PRO Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payment
        </h3>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPaid"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-surface-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <label htmlFor="isPaid" className="text-sm text-[var(--color-text-secondary)]">
            Paid event
          </label>
        </div>

        {isPaid && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Price in SOL
            </label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={priceSol}
              onChange={(e) => setPriceSol(e.target.value)}
              placeholder="0.1"
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>
        )}
      </div>

      {/* Additional */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Users className="w-5 h-5" />
          Additional
        </h3>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Maximum Attendees
          </label>
          <Input
            type="number"
            min="1"
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value)}
            placeholder="100"
            icon={<Users className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Contact Information (for non-admins) */}
      {!isAdmin && (
        <div className="space-y-4" ref={contactErrorRef}>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Information
            <span className="text-sm text-[var(--color-text-muted)] font-normal">(Required for review)</span>
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Please provide at least one contact method (email or telegram) so we can reach you during the review process.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Email
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  setContactEmailError(null);
                }}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
                error={contactEmailError || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Telegram
              </label>
              <Input
                type="text"
                value={contactTelegram}
                onChange={(e) => {
                  setContactTelegram(e.target.value);
                  setContactTelegramError(null);
                }}
                placeholder="@username"
                icon={<MessageCircle className="w-4 h-4" />}
                error={contactTelegramError || undefined}
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
            ? "Create Event"
            : "Submit for Review"}
        </Button>
      </div>
    </form>
  );
}

