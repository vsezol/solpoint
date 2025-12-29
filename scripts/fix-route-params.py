#!/usr/bin/env python3
"""
Скрипт для массового обновления параметров маршрутов
Заменяет { id: string } и { slug: string } на { identifier: string }
и добавляет логику преобразования identifier в ID где необходимо
"""
import os
import re
import sys

def update_file(filepath, entity_type, entity_name):
    """Обновляет один файл"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    modified = False
    
    # Заменяем параметры
    content = re.sub(
        r'\{ params \}: \{ params: Promise<\{ id: string \}> \}',
        '{ params }: { params: Promise<{ identifier: string }> }',
        content
    )
    content = re.sub(
        r'\{ params \}: \{ params: \{ id: string \} \}',
        '{ params }: { params: { identifier: string } }',
        content
    )
    content = re.sub(
        r'\{ params \}: \{ params: Promise<\{ slug: string \}> \}',
        '{ params }: { params: Promise<{ identifier: string }> }',
        content
    )
    content = re.sub(
        r'\{ params \}: \{ params: \{ slug: string \} \}',
        '{ params }: { params: { identifier: string } }',
        content
    )
    
    # Заменяем использование параметров
    if 'const { id } = await params;' in content:
        content = re.sub(
            r'const \{ id \} = await params;',
            f'''const {{ identifier }} = await params;
  // Преобразуем identifier в ID
  const {{ getEntityIdByIdentifier }} = await import("@/lib/utils/entity-identifier");
  const id = await getEntityIdByIdentifier("{entity_type}", identifier);
  if (!id) {{
    return NextResponse.json(
      {{ error: "{entity_name} not found" }},
      {{ status: 404 }}
    );
  }}''',
            content
        )
        modified = True
    
    if 'const { slug } = await params;' in content:
        content = re.sub(
            r'const \{ slug \} = await params;',
            f'''const {{ identifier }} = await params;
  // Преобразуем identifier в ID
  const {{ getEntityIdByIdentifier }} = await import("@/lib/utils/entity-identifier");
  const id = await getEntityIdByIdentifier("{entity_type}", identifier);
  if (!id) {{
    return NextResponse.json(
      {{ error: "{entity_name} not found" }},
      {{ status: 404 }}
    );
  }}''',
            content
        )
        modified = True
    
    # Добавляем импорт если нужно
    if 'getEntityIdByIdentifier' in content and 'from "@/lib/utils/entity-identifier"' not in content:
        if 'import { createClient }' in content:
            content = re.sub(
                r'(import \{ createClient \} from "@/lib/supabase/server";)',
                r'\1\nimport { getEntityIdByIdentifier } from "@/lib/utils/entity-identifier";',
                content
            )
            modified = True
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/fix-route-params.py <entity_type> <directory>")
        sys.exit(1)
    
    entity_type = sys.argv[1]
    directory = sys.argv[2]
    
    entity_names = {
        'community': 'Community',
        'event': 'Event',
        'hub': 'Hub',
        'project': 'Project',
        'workspace': 'Workspace'
    }
    
    entity_name = entity_names.get(entity_type, entity_type.capitalize())
    
    updated_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts'):
                filepath = os.path.join(root, file)
                if update_file(filepath, entity_type, entity_name):
                    updated_count += 1
                    print(f"Updated: {filepath}")
    
    print(f"\nDone! Updated {updated_count} files.")


