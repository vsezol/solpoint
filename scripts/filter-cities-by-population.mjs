import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../worldcities.csv');
const outputFile = path.join(__dirname, '../worldcities-filtered.csv');
const minPopulation = 500000;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

function main() {
  console.log('Reading worldcities.csv...\n');
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(inputFile, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.error('❌ File is empty');
    process.exit(1);
  }
  
  const header = lines[0];
  const headerFields = parseCSVLine(header);
  const populationIndex = headerFields.findIndex(f => f === 'population');
  
  if (populationIndex === -1) {
    console.error('❌ Column "population" not found in CSV');
    process.exit(1);
  }
  
  console.log(`Total cities in file: ${lines.length - 1}`);
  console.log(`Filtering cities with population > ${minPopulation.toLocaleString()}...\n`);
  
  const filteredLines = [header];
  let filteredCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const fields = parseCSVLine(line);
    
    if (fields.length <= populationIndex) {
      continue;
    }
    
    const populationStr = fields[populationIndex].replace(/"/g, '').trim();
    const population = parseFloat(populationStr);
    
    if (!isNaN(population) && population > minPopulation) {
      filteredLines.push(line);
      filteredCount++;
    }
  }
  
  const outputContent = filteredLines.join('\n');
  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  
  console.log(`✅ Filtered cities: ${filteredCount}`);
  console.log(`✅ Saved to: ${outputFile}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Original cities: ${lines.length - 1}`);
  console.log(`   Filtered cities (>${minPopulation.toLocaleString()}): ${filteredCount}`);
  console.log(`   Removed: ${lines.length - 1 - filteredCount}`);
}

main();

