"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function attendEvent(eventId: string) {
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: "Unauthorized", success: false };
  }

  try {
    // Проверяем существование ивента и доступ
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, visibility, max_attendees, attendees_count, registration_deadline, slug")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return { error: "Event not found", success: false };
    }

    // Проверяем доступ к VIP ивенту
    if (event.visibility === "vip_only") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", authUser.id)
        .single();
      if (profile?.subscription_tier !== "vip") {
        return { error: "This event is PRO only", success: false };
      }
    }

    // Проверяем дедлайн регистрации
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (new Date() > deadline) {
        return { error: "Registration deadline has passed", success: false };
      }
    }

    // Проверяем, не зарегистрирован ли уже
    const { data: existingMember } = await supabase
      .from("event_members")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", authUser.id)
      .single();

    if (existingMember) {
      // Если уже зарегистрирован со статусом "going", возвращаем успех
      if (existingMember.status === "going") {
        return { error: "Already registered for this event", success: false };
      }
      // Если статус другой, обновляем на "going"
      const { error: updateError } = await supabase
        .from("event_members")
        .update({ status: "going" })
        .eq("event_id", eventId)
        .eq("user_id", authUser.id);

      if (updateError) {
        return { error: updateError.message || "Failed to update registration", success: false };
      }

      // Обновляем страницу
      revalidatePath(`/events/${event.slug}`);
      return { success: true };
    }

    // Проверяем capacity
    if (event.max_attendees) {
      if (event.attendees_count >= event.max_attendees) {
        return { error: "Event is full", success: false };
      }
    }

    // Регистрируем пользователя
    const { error: insertError } = await supabase
      .from("event_members")
      .insert({
        event_id: eventId,
        user_id: authUser.id,
        status: "going",
      });

    if (insertError) {
      console.error("Error registering for event:", insertError);
      return { error: insertError.message || "Failed to register for event", success: false };
    }

    // Обновляем страницу
    revalidatePath(`/events/${event.slug}`);
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return { error: error.message || "Internal server error", success: false };
  }
}



