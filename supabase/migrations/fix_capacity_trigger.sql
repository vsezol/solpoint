-- Fix для триггера update_event_capacity_remaining
-- Исправляет ошибку: record "new" has no field "event_id"
-- 
-- Проблема: функция вызывается на таблице events, но пыталась использовать NEW.event_id
-- Решение: использовать NEW.id вместо NEW.event_id

CREATE OR REPLACE FUNCTION update_event_capacity_remaining()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.events 
  SET capacity_remaining = GREATEST(0, COALESCE(max_attendees, 0) - attendees_count)
  WHERE id = COALESCE(NEW.id, OLD.id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;



