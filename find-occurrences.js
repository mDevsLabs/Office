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

const GIT_LINK_PATTERN = /mDevsLabs\/mAI-Office/g;

function applyReplacements(line) {
  return line
    .replace(/GenSpark/gi, 'mAI Office')
    .replace(/GenOffice/gi, 'mAI Office')
    .replace(GIT_LINK_PATTERN, 'mDevsLabs/mAI-Office');
}

function findOccurrences(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let gensparkCount = 0;
    let genofficeCount = 0;
    let gitLinkCount = 0;
    const occurrences = [];

    lines.forEach((line, index) => {
      const isImportExport = line.includes('import') || line.includes('export');

      // Liens git : chercher même dans les import/export, mais signaler séparément
      const lineGitLink = (line.match(GIT_LINK_PATTERN) || []).length;

      if (!isImportExport) {
        const lineGenspark = (line.match(/GenSpark/gi) || []).length;
        const lineGenoffice = (line.match(/GenOffice/gi) || []).length;
        if (lineGenspark > 0 || lineGenoffice > 0 || lineGitLink > 0) {
          const newLine = applyReplacements(line);
          occurrences.push({
            lineNumber: index + 1,
            content: line.trim(),
            newContent: newLine.trim(),
            gensparkCount: lineGenspark,
            genofficeCount: lineGenoffice,
            gitLinkCount: lineGitLink
          });
        }
        gensparkCount += lineGenspark;
        genofficeCount += lineGenoffice;
      } else if (lineGitLink > 0) {
        // Ligne import/export avec un lien git : afficher mais marquer comme ignorée
        const newLine = applyReplacements(line);
        occurrences.push({
          lineNumber: index + 1,
          content: line.trim(),
          newContent: newLine.trim(),
          gitLinkCount: lineGitLink,
          gensparkCount: 0,
          genofficeCount: 0,
          isImportExport: true
        });
      }

      gitLinkCount += lineGitLink;
    });

    if (gensparkCount === 0 && genofficeCount === 0 && gitLinkCount === 0) {
      return null;
    }

    return {
      filePath,
      gensparkCount,
      genofficeCount,
      gitLinkCount,
      total: gensparkCount + genofficeCount + gitLinkCount,
      occurrences
    };
  } catch (err) {
    return null;
  }
}

function main() {
  const files = findFiles(process.cwd());
  const results = [];

  console.log('Recherche des occurrences de GenSpark, GenOffice et liens git mDevsLabs/mAI-Office (hors packages internes)...\n');

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
    console.log(`  Total: ${result.total} occurrences (GenSpark: ${result.gensparkCount}, GenOffice: ${result.genofficeCount}, LienGit: ${result.gitLinkCount})`);

    const MAX_DISPLAY = 5;
    const toShow = result.occurrences.slice(0, MAX_DISPLAY);
    toShow.forEach(occ => {
      const tag = occ.isImportExport ? ' [import/export — affiché seulement]' : '';
      console.log(`    Ligne ${occ.lineNumber}:${tag}`);
      console.log(`      Avant : ${occ.content}`);
      console.log(`      Après : ${occ.newContent}`);
    });
    if (result.occurrences.length > MAX_DISPLAY) {
      console.log(`    ... et ${result.occurrences.length - MAX_DISPLAY} autres ligne(s)`);
    }
  });

  const totalOccurrences = results.reduce((sum, r) => sum + r.total, 0);
  console.log(`\n\nTotal: ${totalOccurrences} occurrences dans ${results.length} fichier(s)`);
}

main();