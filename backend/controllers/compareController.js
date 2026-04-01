const AdmZip = require('adm-zip');
const { diffLines } = require('diff');
const { fetchProxyFromOrg } = require('../services/apiService');

// Binary file extensions that cannot be displayed as text
const BINARY_EXTENSIONS = new Set([
  '.jar', '.class', '.zip', '.war', '.ear',
  '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.so', '.dll', '.exe', '.bin',
]);

/**
 * Check if a file is binary based on its extension
 */
const isBinaryFile = (filePath) => {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
};

/**
 * Double-check buffer for binary content
 * (catches binaries with unknown/missing extensions)
 */
const bufferIsBinary = (buffer) => {
  const sampleSize = Math.min(buffer.length, 512);
  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    if (byte === 0) return true; // null byte = binary
    if (byte < 8 || (byte > 13 && byte < 32 && byte !== 27)) return true;
  }
  return false;
};

/**
 * Download a proxy bundle zip and extract all files.
 * Returns { filePath: { content, isBinary, size } }
 */
const extractFilesFromBundle = async (sourceOrg, proxyName, token, revision) => {
  const bundleBuffer = await fetchProxyFromOrg(sourceOrg, proxyName, token, revision);
  const zip = new AdmZip(Buffer.from(bundleBuffer));
  const fileMap = {};

  zip.getEntries().forEach((entry) => {
    if (entry.isDirectory) return;
    const rawBuffer = entry.getData();
    const binary = isBinaryFile(entry.entryName) || bufferIsBinary(rawBuffer);

    fileMap[entry.entryName] = {
      isBinary: binary,
      size: rawBuffer.length,
      content: binary ? null : rawBuffer.toString('utf8'),
    };
  });

  return fileMap;
};

/**
 * Build nested file tree from flat file path list
 */
const buildFileTree = (filePaths) => {
  const root = [];
  filePaths.forEach((filePath) => {
    const parts = filePath.split('/');
    let currentLevel = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let existing = currentLevel.find((n) => n.name === part);
      if (!existing) {
        existing = { name: part, type: isFile ? 'file' : 'folder', ...(isFile ? {} : { children: [] }) };
        currentLevel.push(existing);
      }
      if (!isFile) currentLevel = existing.children;
    });
  });
  return root;
};

/**
 * POST /api/proxy/compare/files
 * Body: { sourceOrg, proxyName, sourceToken, revision1, revision2 }
 */
const getCompareFileTree = async (req, res) => {
  const { sourceOrg, proxyName, sourceToken, revision1, revision2 } = req.body;

  if (!sourceOrg || !proxyName || !sourceToken || !revision1 || !revision2) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    console.log(`Comparing ${proxyName}: rev ${revision1} vs rev ${revision2}`);

    const [files1, files2] = await Promise.all([
      extractFilesFromBundle(sourceOrg, proxyName, sourceToken, revision1),
      extractFilesFromBundle(sourceOrg, proxyName, sourceToken, revision2),
    ]);

    const allPaths = [...new Set([...Object.keys(files1), ...Object.keys(files2)])].sort();
    const fileTree = buildFileTree(allPaths);

    const fileDiffSummary = allPaths.map((filePath) => {
      const f1 = files1[filePath];
      const f2 = files2[filePath];
      const inRev1 = !!f1;
      const inRev2 = !!f2;
      const binary = f1?.isBinary || f2?.isBinary || false;

      let status;
      if (inRev1 && inRev2) {
        const same = binary ? f1.size === f2.size : f1.content === f2.content;
        status = same ? 'unchanged' : 'modified';
      } else {
        status = inRev1 ? 'removed' : 'added';
      }

      return { filePath, status, isBinary: binary };
    });

    return res.status(200).json({ success: true, fileTree, fileDiffSummary, revision1, revision2 });
  } catch (error) {
    console.error('Error in getCompareFileTree:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to compare proxy bundles',
    });
  }
};

/**
 * POST /api/proxy/compare/file-content
 * Body: { sourceOrg, proxyName, sourceToken, revision1, revision2, filePath }
 */
const getCompareFileContent = async (req, res) => {
  const { sourceOrg, proxyName, sourceToken, revision1, revision2, filePath } = req.body;

  if (!sourceOrg || !proxyName || !sourceToken || !revision1 || !revision2 || !filePath) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    console.log(`File content: ${filePath} | rev ${revision1} vs ${revision2}`);

    const [files1, files2] = await Promise.all([
      extractFilesFromBundle(sourceOrg, proxyName, sourceToken, revision1),
      extractFilesFromBundle(sourceOrg, proxyName, sourceToken, revision2),
    ]);

    const f1 = files1[filePath] || null;
    const f2 = files2[filePath] || null;
    const binary = f1?.isBinary || f2?.isBinary || false;

    const isDifferent = binary
      ? (f1?.size ?? -1) !== (f2?.size ?? -1)
      : (f1?.content ?? '') !== (f2?.content ?? '');

    // Line-by-line diff for text files only
    let diffChunks = null;
    if (!binary) {
      const content1 = f1?.content ?? '';
      const content2 = f2?.content ?? '';
      diffChunks = [];

      diffLines(content1, content2).forEach((part) => {
        const lines = part.value.split('\n');
        if (lines[lines.length - 1] === '') lines.pop(); // remove trailing empty from split
        lines.forEach((line) => {
          diffChunks.push({
            line,
            type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
          });
        });
      });
    }

    return res.status(200).json({
      success: true,
      filePath,
      isBinary: binary,
      isDifferent,
      revision1: { revision: revision1, content: f1?.content ?? null, exists: !!f1, size: f1?.size ?? null },
      revision2: { revision: revision2, content: f2?.content ?? null, exists: !!f2, size: f2?.size ?? null },
      diffChunks,
    });
  } catch (error) {
    console.error('Error in getCompareFileContent:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to fetch file content',
    });
  }
};

module.exports = { getCompareFileTree, getCompareFileContent };