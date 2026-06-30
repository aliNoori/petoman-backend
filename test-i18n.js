const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'i18n', 'fa.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('File Content:', content);
    const json = JSON.parse(content);
    console.log('Parsed JSON:', json);
} catch (e) {
    console.error('Error reading file:', e.message);
}