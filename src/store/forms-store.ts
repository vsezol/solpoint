import { create } from "zustand";
import type { EventType, EventVisibility } from "@/types";

export type LocationType = "country" | "city" | "global";

// Event form state
interface EventFormState {
  // Basic fields
  name: string;
  description: string;
  imageUrl: string;
  
  // Location
  countryCode: string | undefined;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  
  // Dates
  startDate: string;
  endDate: string;
  
  // Type and visibility
  eventType: EventType;
  visibility: EventVisibility;
  
  // Payment
  isPaid: boolean;
  priceSol: string;
  
  // Additional
  maxAttendees: string;
  isOnline: boolean;
  
  // Social networks
  socialsTwitter: string;
  socialsInstagram: string;
  socialsFacebook: string;
  socialsWebsite: string;
  lumaLink: string;
  
  // Contacts (for non-admins)
  contactEmail: string;
  contactTelegram: string;
  
  // Map center coordinates
  mapCenterLat: number | undefined;
  mapCenterLng: number | undefined;
  
  // Setters
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setImageUrl: (imageUrl: string) => void;
  setCountryCode: (countryCode: string | undefined) => void;
  setCity: (city: string) => void;
  setAddress: (address: string) => void;
  setLatitude: (latitude: string) => void;
  setLongitude: (longitude: string) => void;
  setStartDate: (startDate: string) => void;
  setEndDate: (endDate: string) => void;
  setEventType: (eventType: EventType) => void;
  setVisibility: (visibility: EventVisibility) => void;
  setIsPaid: (isPaid: boolean) => void;
  setPriceSol: (priceSol: string) => void;
  setMaxAttendees: (maxAttendees: string) => void;
  setIsOnline: (isOnline: boolean) => void;
  setSocialsTwitter: (socialsTwitter: string) => void;
  setSocialsInstagram: (socialsInstagram: string) => void;
  setSocialsFacebook: (socialsFacebook: string) => void;
  setSocialsWebsite: (socialsWebsite: string) => void;
  setLumaLink: (lumaLink: string) => void;
  setContactEmail: (contactEmail: string) => void;
  setContactTelegram: (contactTelegram: string) => void;
  setMapCenterLat: (mapCenterLat: number | undefined) => void;
  setMapCenterLng: (mapCenterLng: number | undefined) => void;
  resetEventForm: () => void;
}

// Entity form state (for hubs, communities, projects)
interface EntityFormState {
  // Basic fields
  name: string;
  slug: string; // Public URL slug
  description: string;
  imageUrl: string;
  
  // Location
  locationType: LocationType; // 'country' | 'city' | 'global'
  countryCode: string | undefined;
  city: string;
  latitude: string;
  longitude: string;
  
  // Social networks
  socialsTwitter: string;
  socialsInstagram: string;
  socialsFacebook: string;
  socialsWebsite: string;
  
  // Contacts (for non-admins)
  contactEmail: string;
  contactTelegram: string;
  
  // Map center coordinates
  mapCenterLat: number | undefined;
  mapCenterLng: number | undefined;
  
  // Setters
  setName: (name: string) => void;
  setSlug: (slug: string) => void;
  setDescription: (description: string) => void;
  setImageUrl: (imageUrl: string) => void;
  setLocationType: (locationType: LocationType) => void;
  setCountryCode: (countryCode: string | undefined) => void;
  setCity: (city: string) => void;
  setLatitude: (latitude: string) => void;
  setLongitude: (longitude: string) => void;
  setSocialsTwitter: (socialsTwitter: string) => void;
  setSocialsInstagram: (socialsInstagram: string) => void;
  setSocialsFacebook: (socialsFacebook: string) => void;
  setSocialsWebsite: (socialsWebsite: string) => void;
  setContactEmail: (contactEmail: string) => void;
  setContactTelegram: (contactTelegram: string) => void;
  setMapCenterLat: (mapCenterLat: number | undefined) => void;
  setMapCenterLng: (mapCenterLng: number | undefined) => void;
  resetEntityForm: () => void;
}

// Combined store
interface FormsStore {
  eventForm: EventFormState;
  entityForm: EntityFormState;
}

const initialEventFormState: Omit<EventFormState, keyof {
  setName: never;
  setDescription: never;
  setImageUrl: never;
  setCountryCode: never;
  setCity: never;
  setAddress: never;
  setLatitude: never;
  setLongitude: never;
  setStartDate: never;
  setEndDate: never;
  setEventType: never;
  setVisibility: never;
  setIsPaid: never;
  setPriceSol: never;
  setMaxAttendees: never;
  setIsOnline: never;
  setSocialsTwitter: never;
  setSocialsInstagram: never;
  setSocialsFacebook: never;
  setSocialsWebsite: never;
  setLumaLink: never;
  setContactEmail: never;
  setContactTelegram: never;
  setMapCenterLat: never;
  setMapCenterLng: never;
  resetEventForm: never;
}> = {
  name: "",
  description: "",
  imageUrl: "",
  countryCode: undefined,
  city: "",
  address: "",
  latitude: "",
  longitude: "",
  startDate: "",
  endDate: "",
  eventType: "community",
  visibility: "public",
  isPaid: false,
  priceSol: "",
  maxAttendees: "",
  isOnline: false,
  socialsTwitter: "",
  socialsInstagram: "",
  socialsFacebook: "",
  socialsWebsite: "",
  lumaLink: "",
  contactEmail: "",
  contactTelegram: "",
  mapCenterLat: undefined,
  mapCenterLng: undefined,
};

const initialEntityFormState: Omit<EntityFormState, keyof {
  setName: never;
  setSlug: never;
  setDescription: never;
  setImageUrl: never;
  setLocationType: never;
  setCountryCode: never;
  setCity: never;
  setLatitude: never;
  setLongitude: never;
  setSocialsTwitter: never;
  setSocialsInstagram: never;
  setSocialsFacebook: never;
  setSocialsWebsite: never;
  setContactEmail: never;
  setContactTelegram: never;
  setMapCenterLat: never;
  setMapCenterLng: never;
  resetEntityForm: never;
}> = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  locationType: "country",
  countryCode: undefined,
  city: "",
  latitude: "",
  longitude: "",
  socialsTwitter: "",
  socialsInstagram: "",
  socialsFacebook: "",
  socialsWebsite: "",
  contactEmail: "",
  contactTelegram: "",
  mapCenterLat: undefined,
  mapCenterLng: undefined,
};

export const useFormsStore = create<FormsStore>((set) => ({
  eventForm: {
    ...initialEventFormState,
    setName: (name) => set((state) => ({ eventForm: { ...state.eventForm, name } })),
    setDescription: (description) => set((state) => ({ eventForm: { ...state.eventForm, description } })),
    setImageUrl: (imageUrl) => set((state) => ({ eventForm: { ...state.eventForm, imageUrl } })),
    setCountryCode: (countryCode) => set((state) => ({ eventForm: { ...state.eventForm, countryCode } })),
    setCity: (city) => set((state) => ({ eventForm: { ...state.eventForm, city } })),
    setAddress: (address) => set((state) => ({ eventForm: { ...state.eventForm, address } })),
    setLatitude: (latitude) => set((state) => ({ eventForm: { ...state.eventForm, latitude } })),
    setLongitude: (longitude) => set((state) => ({ eventForm: { ...state.eventForm, longitude } })),
    setStartDate: (startDate) => set((state) => ({ eventForm: { ...state.eventForm, startDate } })),
    setEndDate: (endDate) => set((state) => ({ eventForm: { ...state.eventForm, endDate } })),
    setEventType: (eventType) => set((state) => ({ eventForm: { ...state.eventForm, eventType } })),
    setVisibility: (visibility) => set((state) => ({ eventForm: { ...state.eventForm, visibility } })),
    setIsPaid: (isPaid) => set((state) => ({ eventForm: { ...state.eventForm, isPaid } })),
    setPriceSol: (priceSol) => set((state) => ({ eventForm: { ...state.eventForm, priceSol } })),
    setMaxAttendees: (maxAttendees) => set((state) => ({ eventForm: { ...state.eventForm, maxAttendees } })),
    setIsOnline: (isOnline) => set((state) => ({ eventForm: { ...state.eventForm, isOnline } })),
    setSocialsTwitter: (socialsTwitter) => set((state) => ({ eventForm: { ...state.eventForm, socialsTwitter } })),
    setSocialsInstagram: (socialsInstagram) => set((state) => ({ eventForm: { ...state.eventForm, socialsInstagram } })),
    setSocialsFacebook: (socialsFacebook) => set((state) => ({ eventForm: { ...state.eventForm, socialsFacebook } })),
    setSocialsWebsite: (socialsWebsite) => set((state) => ({ eventForm: { ...state.eventForm, socialsWebsite } })),
    setLumaLink: (lumaLink: string) => set((state) => ({ eventForm: { ...state.eventForm, lumaLink } })),
    setContactEmail: (contactEmail) => set((state) => ({ eventForm: { ...state.eventForm, contactEmail } })),
    setContactTelegram: (contactTelegram) => set((state) => ({ eventForm: { ...state.eventForm, contactTelegram } })),
    setMapCenterLat: (mapCenterLat) => set((state) => ({ eventForm: { ...state.eventForm, mapCenterLat } })),
    setMapCenterLng: (mapCenterLng) => set((state) => ({ eventForm: { ...state.eventForm, mapCenterLng } })),
    resetEventForm: () => set((state) => ({ eventForm: { ...state.eventForm, ...initialEventFormState } })),
  },
  entityForm: {
    ...initialEntityFormState,
    setName: (name) => set((state) => ({ entityForm: { ...state.entityForm, name } })),
    setSlug: (slug) => set((state) => ({ entityForm: { ...state.entityForm, slug } })),
    setDescription: (description) => set((state) => ({ entityForm: { ...state.entityForm, description } })),
    setImageUrl: (imageUrl) => set((state) => ({ entityForm: { ...state.entityForm, imageUrl } })),
    setLocationType: (locationType) => set((state) => ({ entityForm: { ...state.entityForm, locationType } })),
    setCountryCode: (countryCode) => set((state) => ({ entityForm: { ...state.entityForm, countryCode } })),
    setCity: (city) => set((state) => ({ entityForm: { ...state.entityForm, city } })),
    setLatitude: (latitude) => set((state) => ({ entityForm: { ...state.entityForm, latitude } })),
    setLongitude: (longitude) => set((state) => ({ entityForm: { ...state.entityForm, longitude } })),
    setSocialsTwitter: (socialsTwitter) => set((state) => ({ entityForm: { ...state.entityForm, socialsTwitter } })),
    setSocialsInstagram: (socialsInstagram) => set((state) => ({ entityForm: { ...state.entityForm, socialsInstagram } })),
    setSocialsFacebook: (socialsFacebook) => set((state) => ({ entityForm: { ...state.entityForm, socialsFacebook } })),
    setSocialsWebsite: (socialsWebsite) => set((state) => ({ entityForm: { ...state.entityForm, socialsWebsite } })),
    setContactEmail: (contactEmail) => set((state) => ({ entityForm: { ...state.entityForm, contactEmail } })),
    setContactTelegram: (contactTelegram) => set((state) => ({ entityForm: { ...state.entityForm, contactTelegram } })),
    setMapCenterLat: (mapCenterLat) => set((state) => ({ entityForm: { ...state.entityForm, mapCenterLat } })),
    setMapCenterLng: (mapCenterLng) => set((state) => ({ entityForm: { ...state.entityForm, mapCenterLng } })),
    resetEntityForm: () => set((state) => ({ entityForm: { ...state.entityForm, ...initialEntityFormState } })),
  },
}));

