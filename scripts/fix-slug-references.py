#!/usr/bin/env python3
"""
Исправляет ссылки на slug и дубликаты в обновленных файлах
"""
import os
import re
import sys

def fix_file(filepath, entity_name):
    """Исправляет один файл"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Удаляем дубликаты импорта getEntityIdByIdentifier
    if 'const { getEntityIdByIdentifier } = await import("@/lib/utils/entity-identifier");' in content and 'import { getEntityIdByIdentifier }' in content:
        content = re.sub(
            r'const \{ getEntityIdByIdentifier \} = await import\("@/lib/utils/entity-identifier"\);',
            '',
            content
        )
        # Убираем лишние пустые строки
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    # Заменяем переменные
    id_var_map = {
        'event': 'eventId',
        'hub': 'hubId',
        'community': 'communityId',
        'project': 'projectId',
        'workspace': 'workspaceId'
    }
    
    id_var = id_var_map.get(entity_name.lower(), 'id')
    
    # Заменяем использование .eq("slug", slug) на использование id
    if f'.eq("slug", slug)' in content or f'.eq("slug", identifier)' in content:
        # Находим, какая переменная используется для id
        id_match = re.search(rf'const (id|{id_var}) = await getEntityIdByIdentifier', content)
        if id_match:
            var_name = id_match.group(1)
            # Заменяем дублирующие запросы к БД на использование переменной
            pattern = rf'// Получаем (?:{entity_name}|{entity_name.lower()}) по slug\s+const {{ data: ({entity_name.lower()}|event|hub|community|project|workspace), error: \w+Error }} = await supabase\s+\.from\("{entity_name.lower()}s"\)\s+\.select\("id"\)\s+\.eq\("(?:slug|id)", \w+\)\s+\.single\(\);\s+if \(\w+Error \|\| !\w+\) {{\s+return NextResponse\.json\({{ error: "{entity_name} not found" }}, {{ status: 404 }}\);\s+}}'
            content = re.sub(pattern, '', content, flags=re.MULTILINE)
            
            # Заменяем .eq("slug", slug) на .eq("id", var_name)
            content = re.sub(
                rf'\.eq\("slug", (?:slug|identifier)\)',
                f'.eq("id", {var_name})',
                content
            )
            
            # Заменяем использование entity.id на var_name
            content = re.sub(
                rf'({entity_name.lower()})\.id',
                var_name,
                content
            )
    
    # Переименовываем переменную id в правильное имя, если нужно
    if entity_name.lower() in ['event', 'hub', 'community', 'project', 'workspace']:
        expected_var = id_var_map.get(entity_name.lower())
        if expected_var and expected_var != 'id':
            # Заменяем const id = на const expected_var =
            content = re.sub(
                rf'const id = await getEntityIdByIdentifier\("{entity_name.lower()}", identifier\);',
                f'const {expected_var} = await getEntityIdByIdentifier("{entity_name.lower()}", identifier);',
                content
            )
            # Заменяем использование id в проверках на expected_var
            content = re.sub(
                rf'if \(!id\) {{',
                f'if (!{expected_var}) {{',
                content
            )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/fix-slug-references.py <entity_name> <directory>")
        sys.exit(1)
    
    entity_name = sys.argv[1]
    directory = sys.argv[2]
    
    updated_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts') and 'route.ts' in file:
                filepath = os.path.join(root, file)
                if fix_file(filepath, entity_name):
                    updated_count += 1
                    print(f"Fixed: {filepath}")
    
    print(f"\nDone! Fixed {updated_count} files.")

