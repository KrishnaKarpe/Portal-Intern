const AdmZip = require("adm-zip");
const { diffLines } = require("diff");
const {
  fetchProxyFromOrg,
  fetchLatestRevision,
  fetchProxyRevisions,
} = require("../services/apiService");

// Binary file extensions that cannot be displayed as text
const BINARY_EXTENSIONS = new Set([
  ".jar",
  ".class",
  ".zip",
  ".war",
  ".ear",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".so",
  ".dll",
  ".exe",
  ".bin",
]);

const proxyFileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (org, proxyName, revision) =>
  `${org}::${proxyName}::${revision}`;

const getCachedFilesForRevision = async (
  sourceOrg,
  proxyName,
  token,
  revision,
) => {
  const cacheKey = getCacheKey(sourceOrg, proxyName, revision);
  const now = Date.now();
  const cached = proxyFileCache.get(cacheKey);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    console.log(
      `Using cached files for ${proxyName} rev ${revision} in org ${sourceOrg}`,
    );
    return cached.files;
  }

  const files = await extractFilesFromBundle(
    sourceOrg,
    proxyName,
    token,
    revision,
  );
  proxyFileCache.set(cacheKey, { files, cachedAt: now });
  return files;
};

const getProxyRevisions = async (req, res) => {
  const { org, name, token } = req.body;
  if (!org || !name || !token) {
    return res
      .status(400)
      .json({ success: false, message: "Missing org, name, or token" });
  }
  try {
    const revisions = await fetchProxyRevisions(org, name, token);
    return res.status(200).json({ success: true, revisions }); // revisions is string[]
  } catch (error) {
    console.error("Error fetching revisions:", error.message);
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

/**
 * Check if a file is binary based on its extension
 */
const isBinaryFile = (filePath) => {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
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
const extractFilesFromBundle = async (
  sourceOrg,
  proxyName,
  token,
  revision,
) => {
  const bundleBuffer = await fetchProxyFromOrg(
    sourceOrg,
    proxyName,
    token,
    revision,
  );
  const zip = new AdmZip(Buffer.from(bundleBuffer));
  const fileMap = {};

  zip.getEntries().forEach((entry) => {
    if (entry.isDirectory) return;
    const rawBuffer = entry.getData();
    const binary = isBinaryFile(entry.entryName) || bufferIsBinary(rawBuffer);

    fileMap[entry.entryName] = {
      isBinary: binary,
      size: rawBuffer.length,
      content: binary ? null : rawBuffer.toString("utf8"),
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
    const parts = filePath.split("/");
    let currentLevel = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let existing = currentLevel.find((n) => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          type: isFile ? "file" : "folder",
          ...(isFile ? {} : { children: [] }),
        };
        currentLevel.push(existing);
      }
      if (!isFile) currentLevel = existing.children;
    });
  });
  return root;
};

/**
 * POST /api/proxy/compare/files
 * Body: {
 *   proxy1: { org, name, token, revision },
 *   proxy2: { org, name, token, revision }
 * }
 * Supports comparing proxies from different organizations
 */
const getCompareFileTree = async (req, res) => {
  const { proxy1, proxy2 } = req.body;

  // Support both old format (backward compatibility) and new format
  let p1, p2;
  if (proxy1 && proxy2) {
    // New format: two different proxies from potentially different orgs
    p1 = proxy1;
    p2 = proxy2;
  } else {
    // Old format: { sourceOrg, proxyName, sourceToken, revision1, revision2 }
    const { sourceOrg, proxyName, sourceToken, revision1, revision2 } =
      req.body;
    if (!sourceOrg || !proxyName || !sourceToken || !revision1 || !revision2) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    p1 = {
      org: sourceOrg,
      name: proxyName,
      token: sourceToken,
      revision: revision1,
    };
    p2 = {
      org: sourceOrg,
      name: proxyName,
      token: sourceToken,
      revision: revision2,
    };
  }

  if (
    !p1?.org ||
    !p1?.name ||
    !p1?.token ||
    !p1?.revision ||
    !p2?.org ||
    !p2?.name ||
    !p2?.token ||
    !p2?.revision
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Missing required fields for both proxies",
      });
  }

  try {
    console.log(
      `Comparing ${p1.name} (${p1.org} rev ${p1.revision}) vs ${p2.name} (${p2.org} rev ${p2.revision})`,
    );

    const [files1, files2] = await Promise.all([
      getCachedFilesForRevision(p1.org, p1.name, p1.token, p1.revision),
      getCachedFilesForRevision(p2.org, p2.name, p2.token, p2.revision),
    ]);

    const allPaths = [
      ...new Set([...Object.keys(files1), ...Object.keys(files2)]),
    ].sort();
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
        status = same ? "unchanged" : "modified";
      } else {
        status = inRev1 ? "removed" : "added";
      }

      return { filePath, status, isBinary: binary };
    });

    return res.status(200).json({
      success: true,
      fileTree,
      fileDiffSummary,
      proxy1: { name: p1.name, org: p1.org, revision: p1.revision },
      proxy2: { name: p2.name, org: p2.org, revision: p2.revision },
    });
  } catch (error) {
    console.error("Error in getCompareFileTree:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to compare proxy bundles",
    });
  }
};

/**
 * POST /api/proxy/compare/file-content
 * Body: {
 *   proxy1: { org, name, token, revision },
 *   proxy2: { org, name, token, revision },
 *   filePath
 * }
 * Supports comparing file content from proxies in different organizations
 */
const getCompareFileContent = async (req, res) => {
  const { proxy1, proxy2, filePath } = req.body;

  // Support both old format (backward compatibility) and new format
  let p1, p2;
  if (proxy1 && proxy2) {
    p1 = proxy1;
    p2 = proxy2;
  } else {
    const { sourceOrg, proxyName, sourceToken, revision1, revision2 } =
      req.body;
    if (
      !sourceOrg ||
      !proxyName ||
      !sourceToken ||
      !revision1 ||
      !revision2 ||
      !filePath
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    p1 = {
      org: sourceOrg,
      name: proxyName,
      token: sourceToken,
      revision: revision1,
    };
    p2 = {
      org: sourceOrg,
      name: proxyName,
      token: sourceToken,
      revision: revision2,
    };
  }

  if (
    !p1?.org ||
    !p1?.name ||
    !p1?.token ||
    !p1?.revision ||
    !p2?.org ||
    !p2?.name ||
    !p2?.token ||
    !p2?.revision ||
    !filePath
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    console.log(
      `File content: ${filePath} | ${p1.name} (${p1.org} rev ${p1.revision}) vs ${p2.name} (${p2.org} rev ${p2.revision})`,
    );

    const [files1, files2] = await Promise.all([
      getCachedFilesForRevision(p1.org, p1.name, p1.token, p1.revision),
      getCachedFilesForRevision(p2.org, p2.name, p2.token, p2.revision),
    ]);

    const f1 = files1[filePath] || null;
    const f2 = files2[filePath] || null;
    const binary = f1?.isBinary || f2?.isBinary || false;

    const isDifferent = binary
      ? (f1?.size ?? -1) !== (f2?.size ?? -1)
      : (f1?.content ?? "") !== (f2?.content ?? "");

    // Line-by-line diff for text files only
    let diffChunks = null;
    if (!binary) {
      const content1 = f1?.content ?? "";
      const content2 = f2?.content ?? "";
      diffChunks = [];

      diffLines(content1, content2).forEach((part) => {
        const lines = part.value.split("\n");
        if (lines[lines.length - 1] === "") lines.pop(); // remove trailing empty from split
        lines.forEach((line) => {
          diffChunks.push({
            line,
            type: part.added ? "added" : part.removed ? "removed" : "unchanged",
          });
        });
      });
    }

    return res.status(200).json({
      success: true,
      filePath,
      isBinary: binary,
      isDifferent,
      revision1: {
        revision: p1.revision,
        content: f1?.content ?? null,
        exists: !!f1,
        size: f1?.size ?? null,
      },
      revision2: {
        revision: p2.revision,
        content: f2?.content ?? null,
        exists: !!f2,
        size: f2?.size ?? null,
      },
      diffChunks,
    });
  } catch (error) {
    console.error("Error in getCompareFileContent:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch file content",
    });
  }
};

module.exports = {
  getCompareFileTree,
  getCompareFileContent,
  getProxyRevisions,
};
