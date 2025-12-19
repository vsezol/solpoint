/**
 * Генерация slug для хаба
 * Формат: hub-name-city
 */
export function generateHubSlug(
  name: string,
  city?: string | null
): string {
  // Транслитерация и очистка названия
  const slugName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Удаляем спецсимволы
    .replace(/\s+/g, "-") // Пробелы в дефисы
    .replace(/-+/g, "-") // Множественные дефисы в один
    .substring(0, 50); // Ограничение длины

  if (!city) {
    return slugName;
  }

  const slugCity = city
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 30);

  return `${slugName}-${slugCity}`;
}

/**
 * Проверка уникальности slug и добавление суффикса при необходимости
 * @param baseSlug - базовый slug
 * @param checkUnique - функция проверки уникальности (возвращает true если slug уже существует)
 */
export async function getUniqueHubSlug(
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


