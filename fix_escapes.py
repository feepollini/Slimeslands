import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace(r'\${', '${')
    new_content = new_content.replace(r'\`', '`')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

base_dir = r"c:\Users\FELIP\legends of winter\src\ui\screens\forge_v2"

for root, _, files in os.walk(base_dir):
    for filename in files:
        if filename.endswith(".ts"):
            fix_file(os.path.join(root, filename))
