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

const GIT_LINK_PATTERN = /mDevsLabs\/mAI-Office/g;

function applyReplacements(line) {
  return line
    .replace(/GenSpark/gi, 'mAI Office')
    .replace(/GenOffice/gi, 'mAI Office')
    .replace(GIT_LINK_PATTERN, 'mDevsLabs/mAI-Office');
}

function getFilePreview(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const previewLines = [];
    let totalCount = 0;
    let lineCount = 0;

    lines.forEach((line, index) => {
      const isImportExport = line.includes('import') || line.includes('export');
      const hasGenspark = line.match(/GenSpark/gi);
      const hasGenoffice = line.match(/GenOffice/gi);
      const hasGitLink = line.match(GIT_LINK_PATTERN);

      const count = (hasGenspark ? hasGenspark.length : 0)
        + (hasGenoffice ? hasGenoffice.length : 0)
        + (hasGitLink ? hasGitLink.length : 0);

      if (count === 0) return;

      // Lignes import/export : affichage uniquement, pas de remplacement effectif
      if (isImportExport) {
        if (lineCount < 10) {
          previewLines.push({
            lineNumber: index + 1,
            old: line.trim(),
            new: applyReplacements(line).trim(),
            displayOnly: true
          });
        }
        lineCount++;
        return;
      }

      if (lineCount < 10) {
        previewLines.push({
          lineNumber: index + 1,
          old: line.trim(),
          new: applyReplacements(line).trim(),
          displayOnly: false
        });
      }
      totalCount += count;
      lineCount++;
    });

    if (totalCount === 0 && previewLines.filter(p => !p.displayOnly).length === 0) {
      return null;
    }

    return {
      filePath,
      totalOccurrences: totalCount,
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
      // Lignes import/export : ne pas modifier (packages internes et dépendances)
      if (line.includes('import') || line.includes('export')) {
        return line;
      }
      const newLine = applyReplacements(line);
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

  console.log('Recherche des fichiers à modifier (GenSpark, GenOffice, liens git mDevsLabs/mAI-Office — hors packages internes)...\n');

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
    console.log(`Occurrences totales (hors import/export): ${preview.totalOccurrences}`);
    console.log('\nAperçu des modifications :');
    preview.preview.forEach(p => {
      const tag = p.displayOnly ? ' [import/export — affiché seulement, non modifié]' : '';
      console.log(`  Ligne ${p.lineNumber}:${tag}`);
      console.log(`    Avant: ${p.old}`);
      console.log(`    Après: ${p.new}`);
    });
    if (preview.hasMore) {
      console.log(`  ... et plus de lignes non affichées`);
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