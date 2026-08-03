const fs = require('fs');
const path = require('path');

function findFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        findFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    });
  } catch (err) {
  }
  return fileList;
}

function findOccurrences(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let gensparkCount = 0;
    let genofficeCount = 0;
    const occurrences = [];

    lines.forEach((line, index) => {
      if (line.includes('import') || line.includes('export')) return;
      const lineGenspark = (line.match(/GenSpark/gi) || []).length;
      const lineGenoffice = (line.match(/GenOffice/gi) || []).length;
      if (lineGenspark > 0 || lineGenoffice > 0) {
        occurrences.push({
          lineNumber: index + 1,
          content: line.trim(),
          gensparkCount: lineGenspark,
          genofficeCount: lineGenoffice
        });
      }
      gensparkCount += lineGenspark;
      genofficeCount += lineGenoffice;
    });

    if (gensparkCount === 0 && genofficeCount === 0) {
      return null;
    }

    return {
      filePath,
      gensparkCount,
      genofficeCount,
      total: gensparkCount + genofficeCount,
      occurrences
    };
  } catch (err) {
    return null;
  }
}

function main() {
  const files = findFiles(process.cwd());
  const results = [];

  console.log('Recherche des occurrences de GenSpark et GenOffice (hors import/export)...\n');

  for (const file of files) {
    const result = findOccurrences(file);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    console.log('Aucune occurrence trouvée.');
    return;
  }

  console.log(`Trouvé ${results.length} fichier(s) avec des occurrences:\n`);
  results.forEach(result => {
    console.log(`\n${result.filePath}`);
    console.log(`  Total: ${result.total} occurrences (GenSpark: ${result.gensparkCount}, GenOffice: ${result.genofficeCount})`);
    if (result.occurrences.length <= 5) {
      result.occurrences.forEach(occ => {
        console.log(`    Ligne ${occ.lineNumber}: ${occ.content}`);
      });
    } else {
      result.occurrences.slice(0, 5).forEach(occ => {
        console.log(`    Ligne ${occ.lineNumber}: ${occ.content}`);
      });
      console.log(`    ... et ${result.occurrences.length - 5} autres`);
    }
  });

  const totalOccurrences = results.reduce((sum, r) => sum + r.total, 0);
  console.log(`\n\nTotal: ${totalOccurrences} occurrences dans ${results.length} fichier(s)`);
}

main();