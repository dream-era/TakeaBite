const fs = require('fs');

const path = 'src/data/foodLibrary.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imageSlug to interface
content = content.replace(
  /tags: string\[\]\n\}/g,
  "tags: string[]\n  imageSlug: string\n}"
);

// 2. Add imageSlug to each item
// Using regex to match the name and inject imageSlug after tags
content = content.replace(/name:\s*'([^']+)'([\s\S]*?)tags:\s*\[([^\]]+)\](\s*)\}/g, (match, name, middle, tags, whitespace) => {
    // Generate the slug directly in the script to avoid runtime calls in the data structure, 
    // OR we can just inject `imageSlug: '${slug}'` directly.
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      + '.jpg';
      
    return `name: '${name}'${middle}tags: [${tags}],\n    imageSlug: '${slug}'${whitespace}}`;
});

// 3. Append the helper functions
const helpers = `

// Returns the public path to the food library image
// Falls back to a placeholder if image not found
export function getFoodImagePath(imageSlug: string): string {
  return \`/food-images/\${imageSlug}\`
}

// Generates imageSlug from food item name automatically
// "Masala Dosa" → "masala-dosa.jpg"
// "Fresh Orange Juice" → "fresh-orange-juice.jpg"
export function nameToImageSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s]/g, '')
    .replace(/\\s+/g, '-')
    + '.jpg'
}
`;

content += helpers;

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated foodLibrary.ts");
