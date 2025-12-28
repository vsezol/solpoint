/**
 * Генерация slug из строки (общая функция)
 * Преобразует в нижний регистр, заменяет пробелы на дефисы, удаляет спецсимволы
 */
export function generateSlug(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Удаляем спецсимволы
    .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
    .replace(/-+/g, '-') // Убираем множественные дефисы
    .replace(/^-+|-+$/g, '') // Убираем дефисы в начале и конце
    .substring(0, maxLength);
}

/**
 * Генерация slug для события
 * Формат: event-name-city-year-month
 */
export function generateEventSlug(
  name: string,
  city: string,
  startDate: string
): string {
  const date = new Date(startDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const slugName = generateSlug(name, 50);
  const slugCity = generateSlug(city, 30);

  return `${slugName}-${slugCity}-${year}-${month}`;
}

/**
 * Проверка уникальности slug и добавление суффикса при необходимости
 * @param baseSlug - базовый slug
 * @param checkUnique - функция проверки уникальности (возвращает true если slug уже существует)
 */
export async function getUniqueSlug(
  baseSlug: string,
  checkUnique: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await checkUnique(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    // Защита от бесконечного цикла
    if (counter > 1000) {
      throw new Error("Failed to generate unique slug");
    }
  }

  return slug;
}

/**
 * @deprecated Используйте getUniqueSlug
 */
export async function getUniqueEventSlug(
  baseSlug: string,
  checkUnique: (slug: string) => Promise<boolean>
): Promise<string> {
  return getUniqueSlug(baseSlug, checkUnique);
}

