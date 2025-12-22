import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEventOwner } from "@/lib/utils/entity-ownership";

/**
 * PATCH /api/events/[id]
 * Обновить событие
 * Требует аутентификации и владения событием
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Проверяем, является ли пользователь владельцем события
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isOwner = await isEventOwner(id, authUser.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not the owner of this event" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      image_url,
      event_type,
      visibility,
      is_paid,
      price_sol,
      max_attendees,
      registration_deadline,
      is_online,
      socials,
      contacts,
      venue_name,
      address,
      city,
      country,
      country_code,
      latitude,
      longitude,
      start_date,
      end_date,
    } = body;

    // Подготавливаем обновления
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      updates.name = name;
    }
    if (description !== undefined) {
      updates.description = description || null;
    }
    if (image_url !== undefined) {
      updates.image_url = image_url || null;
    }
    if (event_type !== undefined) {
      updates.event_type = event_type;
    }
    if (visibility !== undefined) {
      updates.visibility = visibility;
    }
    if (is_paid !== undefined) {
      updates.is_paid = is_paid;
    }
    if (price_sol !== undefined) {
      updates.price_sol = price_sol ? parseFloat(price_sol) : null;
    }
    if (max_attendees !== undefined) {
      updates.max_attendees = max_attendees ? parseInt(max_attendees, 10) : null;
      // Пересчитываем capacity_remaining
      if (max_attendees) {
        const { data: currentEvent } = await supabase
          .from("events")
          .select("attendees_count")
          .eq("id", id)
          .single();
        if (currentEvent) {
          updates.capacity_remaining = Math.max(0, max_attendees - (currentEvent.attendees_count || 0));
        }
      }
    }
    if (registration_deadline !== undefined) {
      updates.registration_deadline = registration_deadline
        ? new Date(registration_deadline).toISOString()
        : null;
    }
    if (is_online !== undefined) {
      updates.is_online = is_online;
    }
    if (socials !== undefined) {
      updates.socials = socials || {};
    }
    if (contacts !== undefined) {
      updates.contacts = contacts || {};
    }
    
    // Location fields (only if not online)
    if (is_online === false) {
      if (venue_name !== undefined) updates.venue_name = venue_name || null;
      if (address !== undefined) updates.address = address || null;
      if (city !== undefined) updates.city = city || null;
      if (country !== undefined) updates.country = country || null;
      if (country_code !== undefined) updates.country_code = country_code || null;
      if (latitude !== undefined) updates.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) updates.longitude = longitude ? parseFloat(longitude) : null;
    } else if (is_online === true) {
      // Clear location fields for online events
      updates.venue_name = null;
      updates.address = null;
      updates.city = null;
      updates.country = null;
      updates.country_code = null;
      updates.latitude = null;
      updates.longitude = null;
    }
    
    // Date fields
    if (start_date !== undefined) {
      updates.start_date = start_date ? new Date(start_date).toISOString() : null;
    }
    if (end_date !== undefined) {
      updates.end_date = end_date ? new Date(end_date).toISOString() : null;
    }

    // Обновляем событие
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        owner_user:profiles!events_owner_id_fkey(id, twitter_handle, twitter_name, avatar_url),
        owner_hub:hubs!events_owner_id_fkey(id, name, image_url),
        owner_community:communities!events_owner_id_fkey(id, name, image_url),
        owner_project:projects!events_owner_id_fkey(id, name, image_url),
        owner_workspace:workspaces!events_owner_id_fkey(id, name, image_url)
      `)
      .single();

    if (updateError) {
      console.error("Error updating event:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
