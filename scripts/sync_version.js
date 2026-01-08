const fs = require('fs');
const path = require('path');

// Read module.prop file
const modulePropPath = './module/module.prop';
const updateJsonPath = './Update.json';

try {
  const modulePropContent = fs.readFileSync(modulePropPath, 'utf8');
  
  // Extract version and versionCode
  const versionMatch = modulePropContent.match(/^version=(.*)$/m);
  const versionCodeMatch = modulePropContent.match(/^versionCode=(.*)$/m);
  
  if (!versionMatch) {
    throw new Error('Could not find version in module.prop');
  }
  
  const version = versionMatch[1];
  const versionCode = versionCodeMatch ? versionCodeMatch[1] : Date.now().toString();
  
  // Create updated Update.json content
  const updateJson = {
    version: version,
    versionCode: parseInt(versionCode),
    zipUrl: `https://github.com/mrxxx66/device_faker/releases/download/${version}/device_faker-${version}.zip`,
    changelog: "https://raw.githubusercontent.com/mrxxx66/device_faker/main/CHANGELOG.md"
  };
  
  // Write updated Update.json
  fs.writeFileSync(updateJsonPath, JSON.stringify(updateJson, null, 2));
  
  console.log(`Updated Update.json with version ${version}`);
} catch (error) {
  console.error('Error syncing version:', error.message);
  process.exit(1);
}