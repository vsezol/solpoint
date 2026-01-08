-- Делаем поля bio, country и country_code необязательными
-- Это позволяет пользователям регистрироваться без заполнения этих полей

-- Убираем NOT NULL constraint с поля bio (если он был)
ALTER TABLE public.profiles 
ALTER COLUMN bio DROP NOT NULL;

-- Убираем NOT NULL constraint с поля country
ALTER TABLE public.profiles 
ALTER COLUMN country DROP NOT NULL;

-- Убираем NOT NULL constraint с поля country_code (если он существует)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.profiles 
    ALTER COLUMN country_code DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      -- Колонка не существует, ничего не делаем
      NULL;
  END;
END $$;

-- Убедимся, что constraint на длину bio сохранился
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_bio_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_bio_check CHECK (char_length(bio) <= 150);

