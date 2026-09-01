const fs = require('fs');
const content = fs.readFileSync('repomix-output.xml', 'utf8');

function getFile(filePath) {
  const tag = `<file path="${filePath}">`;
  const i = content.indexOf(tag);
  if (i === -1) return null;
  const endTag = '</file>';
  const j = content.indexOf(endTag, i);
  if (j === -1) return null;
  return content.substring(i + tag.length, j).trim();
}

const files = process.argv.slice(2);
for (const f of files) {
  console.log(`=== FILE: ${f} ===`);
  const data = getFile(f);
  if (!data) {
    console.log('NOT FOUND');
  } else {
    console.log(data);
  }
}
