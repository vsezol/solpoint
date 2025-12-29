#!/usr/bin/env node

/**
 * Скрипт для обновления параметров маршрутов с [id] и [slug] на [identifier]
 * Использование: node scripts/update-route-params.mjs <entityType> <directory>
 * Например: node scripts/update-route-params.mjs event src/app/api/events/[identifier]
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const entityType = process.argv[2];
const directory = process.argv[3];

if (!entityType || !directory) {
  console.error('Usage: node scripts/update-route-params.mjs <entityType> <directory>');
  process.exit(1);
}

const files = glob.sync(`${directory}/**/*.ts`);

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  // Заменить { id: string } на { identifier: string }
  if (content.includes('{ id: string }')) {
    content = content.replace(
      /{ params }: { params: Promise<{ id: string }> }/g,
      '{ params }: { params: Promise<{ identifier: string }> }'
    );
    content = content.replace(
      /{ params }: { params: { id: string } }/g,
      '{ params }: { params: { identifier: string } }'
    );
    modified = true;
  }

  // Заменить { slug: string } на { identifier: string }
  if (content.includes('{ slug: string }')) {
    content = content.replace(
      /{ params }: { params: Promise<{ slug: string }> }/g,
      '{ params }: { params: Promise<{ identifier: string }> }'
    );
    content = content.replace(
      /{ params }: { params: { slug: string } }/g,
      '{ params }: { params: { identifier: string } }'
    );
    modified = true;
  }

  // Заменить использование id/slug на identifier
  if (content.includes('const { id } = await params;')) {
    content = content.replace(
      /const { id } = await params;/g,
      `const { identifier } = await params;
  // Преобразуем identifier в ID
  const { getEntityIdByIdentifier } = await import("@/lib/utils/entity-identifier");
  const id = await getEntityIdByIdentifier("${entityType}", identifier);
  if (!id) {
    return NextResponse.json(
      { error: "${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found" },
      { status: 404 }
    );
  }`
    );
    modified = true;
  }

  if (content.includes('const { slug } = await params;')) {
    content = content.replace(
      /const { slug } = await params;/g,
      `const { identifier } = await params;
  // Преобразуем identifier в ID или используем как slug
  const { getEntityIdByIdentifier } = await import("@/lib/utils/entity-identifier");
  const id = await getEntityIdByIdentifier("${entityType}", identifier);
  if (!id) {
    return NextResponse.json(
      { error: "${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found" },
      { status: 404 }
    );
  }`
    );
    modified = true;
  }

  if (modified) {
    // Добавить импорт, если его нет
    if (!content.includes('@/lib/utils/entity-identifier')) {
      content = content.replace(
        /import { createClient } from "@\/lib\/supabase\/server";/,
        `import { createClient } from "@/lib/supabase/server";
import { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";`
      );
    }

    writeFileSync(file, content, 'utf-8');
    console.log(`Updated: ${file}`);
  }
}

console.log('Done!');


