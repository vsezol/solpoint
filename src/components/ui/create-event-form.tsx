"use client";

import { useState, FormEvent, useEffect } from "react";
import { Button, Input, LocationPicker } from "@/components/ui";
import { CountrySelect } from "@/components/ui/country-select";
import { createEvent } from "@/lib/api/events";
import { useGeolocation } from "@/hooks/use-geolocation";
import { geocodeAddress } from "@/lib/api/geocoding";
import { MapPin, Calendar, DollarSign, Users, Globe, Twitter, Instagram, Facebook, Link as LinkIcon, Loader2, Search } from "lucide-react";
import type { EventType, EventVisibility } from "@/types";
import { trackEvent } from "@/lib/analytics";

interface CreateEventFormProps {
  onSuccess?: (event: { id: string; slug: string }) => void;
  onCancel?: () => void;
}

export function CreateEventForm({ onSuccess, onCancel }: CreateEventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { requestGeolocation, isDetecting } = useGeolocation();

  // Основные поля
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  // Локация
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Даты
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Тип и видимость
  const [eventType, setEventType] = useState<EventType>("community");
  const [visibility, setVisibility] = useState<EventVisibility>("public");

  // Оплата
  const [isPaid, setIsPaid] = useState(false);
  const [priceSol, setPriceSol] = useState("");

  // Дополнительно
  const [maxAttendees, setMaxAttendees] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  // Социальные сети
  const [socialsTwitter, setSocialsTwitter] = useState("");
  const [socialsInstagram, setSocialsInstagram] = useState("");
  const [socialsFacebook, setSocialsFacebook] = useState("");
  const [socialsWebsite, setSocialsWebsite] = useState("");

  // Map center coordinates (for auto-zooming to city)
  const [mapCenterLat, setMapCenterLat] = useState<number | undefined>();
  const [mapCenterLng, setMapCenterLng] = useState<number | undefined>();

  // Auto-fill location from user's geolocation
  const handleAutoFillLocation = async () => {
    const location = await requestGeolocation();
    if (location) {
      if (location.country_code) {
        setCountryCode(location.country_code);
      }
      if (location.city) {
        setCity(location.city);
      }
      // Note: We don't set coordinates here because user's location != event location
    }
  };

  // Geocode address to coordinates
  const handleGeocodeAddress = async () => {
    if (!address.trim() && !city.trim()) {
      setError("Please enter an address or city to geocode");
      return;
    }

    setIsGeocoding(true);
    setError(null);

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
        setError("Could not find coordinates for this address. Please try a more specific address or select location on the map.");
      }
    } catch (err: any) {
      console.error("Error geocoding:", err);
      setError("Failed to geocode address. Please try again or select location on the map.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle map location change
  const handleMapLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
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
  const validateForm = (): string | null => {
    if (!name.trim()) return "Event name is required";
    if (!countryCode) return "Please select a country";
    if (!city.trim()) return "City is required";
    
    // Check coordinates
    const lat = latitude.trim() ? parseFloat(latitude) : NaN;
    const lng = longitude.trim() ? parseFloat(longitude) : NaN;
    
    if (!latitude.trim() || !longitude.trim() || isNaN(lat) || isNaN(lng)) {
      return "Coordinates are required. Use the map to select a location, geocode an address, or enter coordinates manually";
    }
    
    if (lat < -90 || lat > 90) {
      return "Latitude must be between -90 and 90";
    }
    if (lng < -180 || lng > 180) {
      return "Longitude must be between -180 and 180";
    }
    
    if (!startDate) return "Start date is required";

    if (isPaid && (!priceSol || parseFloat(priceSol) <= 0)) {
      return "Please specify a price for paid events";
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      return "End date cannot be earlier than start date";
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

      // Получаем название страны по коду
      const { getCountryByCode } = await import("@/lib/countries");
      const countryData = await getCountryByCode(countryCode!);
      const countryName = countryData?.name || countryCode!;

      const eventData = {
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        country: countryName,
        country_code: countryCode,
        city: city.trim(),
        address: address.trim() || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        event_type: eventType,
        visibility: visibility,
        is_paid: isPaid,
        price_sol: isPaid && priceSol ? parseFloat(priceSol) : undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        is_online: isOnline,
        socials: Object.keys(socials).length > 0 ? socials : undefined,
      };

      const createdEvent = await createEvent(eventData);

      if (createdEvent) {
        trackEvent("event_created", {
          event_category: "Events",
          event_id: createdEvent.id,
          event_type: eventType,
        });

        // Очистка формы
        setName("");
        setDescription("");
        setImageUrl("");
        setCountryCode(undefined);
        setCity("");
        setAddress("");
        setLatitude("");
        setLongitude("");
        setStartDate("");
        setEndDate("");
        setEventType("community");
        setVisibility("public");
        setIsPaid(false);
        setPriceSol("");
        setMaxAttendees("");
        setIsOnline(false);
        setSocialsTwitter("");
        setSocialsInstagram("");
        setSocialsFacebook("");
        setSocialsWebsite("");

        if (onSuccess && createdEvent.slug) {
          onSuccess({ id: createdEvent.id, slug: createdEvent.slug });
        } else if (onSuccess) {
          // Fallback if slug is missing (shouldn't happen, but just in case)
          onSuccess({ id: createdEvent.id, slug: createdEvent.id });
        }
      }
    } catch (err: any) {
      console.error("Error creating event:", err);
      setError(err.message || "Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-lg text-[var(--color-error)] text-sm">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Latitude <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="40.7128"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Longitude <span className="text-[var(--color-error)]">*</span>
            </label>
            <Input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-74.0060"
              required
            />
          </div>
        </div>

        {/* Map for location selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Select Location on Map <span className="text-[var(--color-text-muted)] text-xs">(Click on map to set coordinates)</span>
          </label>
          <LocationPicker
            latitude={currentLat}
            longitude={currentLng}
            onLocationChange={handleMapLocationChange}
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

        <Button
          type="button"
          variant="outline"
          onClick={handleAutoFillLocation}
          disabled={isDetecting}
          className="w-full"
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Detecting location...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Auto-fill country and city
            </>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isOnline"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-surface-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <label htmlFor="isOnline" className="text-sm text-[var(--color-text-secondary)]">
            Online event
          </label>
        </div>
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
              <option value="vip_only">VIP Only</option>
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
          {isSubmitting ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
}

