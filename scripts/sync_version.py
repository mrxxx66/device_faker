import json
import re
import os

def sync_version():
    # Read module.prop file
    with open('./module/module.prop', 'r', encoding='utf-8') as f:
        module_prop_content = f.read()
    
    print("Module.prop content:")
    print(module_prop_content)
    
    # Extract version and versionCode
    version_match = re.search(r'^version=(.*)$', module_prop_content, re.MULTILINE)
    version_code_match = re.search(r'^versionCode=(.*)$', module_prop_content, re.MULTILINE)
    
    if not version_match:
        raise Exception('Could not find version in module.prop')
    
    version = version_match.group(1).strip()
    version_code = version_code_match.group(1).strip() if version_code_match else str(int(os.path.getctime('./module/module.prop')))
    
    print(f"Extracted version: {version}")
    print(f"Extracted versionCode: {version_code}")
    
    # Create updated Update.json content
    update_json = {
        'version': version,
        'versionCode': int(version_code),
        'zipUrl': f'https://github.com/mrxxx66/device_faker/releases/download/{version}/device_faker-{version}.zip',
        'changelog': 'https://raw.githubusercontent.com/mrxxx66/device_faker/main/CHANGELOG.md'
    }
    
    print(f"New Update.json content: {json.dumps(update_json, indent=2)}")
    
    # Write updated Update.json
    with open('./Update.json', 'w', encoding='utf-8') as f:
        json.dump(update_json, f, indent=2)
    
    print(f"Updated Update.json with version {version}")

if __name__ == '__main__':
    sync_version()