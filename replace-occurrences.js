const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function getFilePreview(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const previewLines = [];
    let gensparkCount = 0;
    let genofficeCount = 0;
    let lineCount = 0;

    lines.forEach((line, index) => {
      if (line.includes('import') || line.includes('export')) return;
      const hasGenspark = line.match(/GenSpark/gi);
      const hasGenoffice = line.match(/GenOffice/gi);
      if (hasGenspark || hasGenoffice) {
        if (lineCount < 10) {
          const newLine = line.replace(/GenSpark/gi, 'mAI Office').replace(/GenOffice/gi, 'mAI Office');
          previewLines.push({
            lineNumber: index + 1,
            old: line.trim(),
            new: newLine.trim()
          });
        }
        gensparkCount += hasGenspark ? hasGenspark.length : 0;
        genofficeCount += hasGenoffice ? hasGenoffice.length : 0;
        lineCount++;
      }
    });

    if (gensparkCount === 0 && genofficeCount === 0) {
      return null;
    }

    return {
      filePath,
      totalOccurrences: gensparkCount + genofficeCount,
      preview: previewLines,
      hasMore: lineCount > 10
    };
  } catch (err) {
    return null;
  }
}

function replaceInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    const newLines = lines.map(line => {
      if (line.includes('import') || line.includes('export')) {
        return line;
      }
      const newLine = line.replace(/GenSpark/gi, 'mAI Office').replace(/GenOffice/gi, 'mAI Office');
      if (newLine !== line) modified = true;
      return newLine;
    });

    if (!modified) {
      return { modified: false, filePath };
    }

    return {
      modified: true,
      filePath,
      newContent: newLines.join('\n')
    };
  } catch (err) {
    return { modified: false, filePath, error: err.message };
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const files = findFiles(process.cwd());
  const filesToProcess = [];

  console.log('Recherche des fichiers à modifier (hors import/export)...\n');

  for (const file of files) {
    const preview = getFilePreview(file);
    if (preview) {
      filesToProcess.push(preview);
    }
  }

  if (filesToProcess.length === 0) {
    console.log('Aucune occurrence trouvée.');
    rl.close();
    return;
  }

  console.log(`Trouvé ${filesToProcess.length} fichier(s) avec des occurrences à remplacer.\n`);

  let totalModified = 0;
  let totalOccurrences = 0;

  for (const preview of filesToProcess) {
    console.log(`\n--- ${preview.filePath} ---`);
    console.log(`Occurrences totales: ${preview.totalOccurrences}`);
    console.log('\nAperçu des modifications :');
    preview.preview.forEach(p => {
      console.log(`  Ligne ${p.lineNumber}:`);
      console.log(`    Avant: ${p.old}`);
      console.log(`    Après: ${p.new}`);
    });
    if (preview.hasMore) {
      console.log(`  ... et ${preview.totalOccurrences - preview.preview.length} autres occurrences`);
    }

    const answer = await new Promise(resolve => {
      rl.question('\nModifier ce fichier ? (o/n): ', resolve);
    });

    if (answer.toLowerCase() === 'o') {
      const result = replaceInFile(preview.filePath);
      if (result.modified) {
        try {
          fs.writeFileSync(result.filePath, result.newContent, 'utf8');
          console.log(`✓ ${preview.filePath} modifié`);
          totalModified++;
          totalOccurrences += preview.totalOccurrences;
        } catch (err) {
          console.error(`✗ Erreur: ${err.message}`);
        }
      }
    } else {
      console.log(`→ ${preview.filePath} ignoré`);
    }
  }

  console.log(`\n\nRemplacement terminé.`);
  console.log(`Fichiers modifiés: ${totalModified}/${filesToProcess.length}`);
  console.log(`Occurrences remplacées: ${totalOccurrences}`);
  rl.close();
}

main().catch(console.error);