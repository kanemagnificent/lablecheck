const fs = require('fs');
const files = [
  'src/app/history/page.tsx',
  'src/app/inspector/dashboard/page.tsx',
  'src/components/AppShell.tsx',
  'src/components/ChatBot.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove any word starting with dark: including pseudo-classes like dark:hover:bg-gray-900
  // and opacity modifiers like dark:bg-gray-900/50
  // also handle dynamic classes inside backticks
  content = content.replace(/dark:[a-zA-Z0-9\-\/\[\]:]+/g, '');
  // Clean up double spaces caused by removal
  content = content.replace(/\s{2,}/g, ' ');
  // Clean up trailing spaces in class strings
  content = content.replace(/ \}/g, '}').replace(/ "/g, '"').replace(/ \`/g, '`');
  fs.writeFileSync(file, content);
});
console.log('Dark mode classes removed.');
