const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Create storage directory if it doesn't exist
const STORAGE_DIR = path.join(__dirname, "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Create images directory within storage if it doesn't exist
const IMAGES_DIR = path.join(STORAGE_DIR, "images");
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Create recordings directory within storage if it doesn't exist
const RECORDINGS_DIR = path.join(STORAGE_DIR, "recordings");
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Create firmware directory if it doesn't exist
const FIRMWARE_DIR = path.join(__dirname, "firmware");
if (!fs.existsSync(FIRMWARE_DIR)) {
  fs.mkdirSync(FIRMWARE_DIR, { recursive: true });
}

// Configure multer for firmware uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FIRMWARE_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `firmware_${timestamp}_${originalName}`);
  },
});

const upload = multer({ storage });

// Operations that return binary/large data
const BINARY_OPERATIONS = ["record.playback"];

// Operations that return image data
const IMAGE_OPERATIONS = ["image.snapshot", "image.snapStream"];


async function callCameraStep(connection, step, storageFolder = null) {
  const { protocol, ip, port, username, password } = connection;
  const { cgiPath, method, query, operationId, saveToStorage } = step;
  
  // Check if step has a storageFolder field in query, use it if provided
  // Otherwise fall back to the parameter (for backward compatibility)
  const folderToUse = (query && query.storageFolder) ? query.storageFolder : storageFolder;

  const baseUrl = `${protocol}://${ip}:${port}`;
  const url = `${baseUrl}${cgiPath}`;

  // Check if this operation typically returns binary data
  const isBinaryOperation = BINARY_OPERATIONS.includes(operationId);
  const isImageOperation = IMAGE_OPERATIONS.includes(operationId);
  const shouldSave = saveToStorage === true || (saveToStorage === undefined && (isBinaryOperation || isImageOperation));

  const axiosConfig = {
    url,
    method: method || "GET",
    // Sunell camera uses query string params
    params: query || {},
    // optional auth
    auth: username && password ? { username, password } : undefined,
    // For binary/image operations, get the raw response
    responseType: shouldSave ? "arraybuffer" : "json",
    // you can tweak timeout / validateStatus here if needed
  };

  const response = await axios(axiosConfig);

  // If this is an image operation, save it as PNG to images folder
  if (isImageOperation && Buffer.isBuffer(response.data)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${operationId || "image"}_${timestamp}.jpg`;
    
    // Determine the target directory (with optional subfolder)
    let targetDir = IMAGES_DIR;
    if (folderToUse) {
      // Sanitize folder name to prevent directory traversal
      const sanitizedFolder = folderToUse.replace(/[^a-zA-Z0-9._-]/g, "_");
      targetDir = path.join(IMAGES_DIR, sanitizedFolder);
      
      // Create subdirectory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }
    
    const filepath = path.join(targetDir, filename);
    fs.writeFileSync(filepath, response.data);

    // Build the relative path for API access
    const relativePath = folderToUse
      ? `/storage/images/${folderToUse.replace(/[^a-zA-Z0-9._-]/g, "_")}/${filename}`
      : `/storage/images/${filename}`;

    // Return metadata instead of the binary data
    return {
      saved: true,
      filename,
      filepath: relativePath,
      size: response.data.length,
      contentType: response.headers["content-type"] || "image/png",
      message: `Image saved to ${folderToUse ? `${folderToUse.replace(/[^a-zA-Z0-9._-]/g, "_")}/` : ""}${filename}`,
    };
  }

  // If we should save this data (binary/large response - like recordings)
  if (shouldSave && Buffer.isBuffer(response.data)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${operationId || "recording"}_${timestamp}.h264`;
    
    // Determine the target directory (with optional subfolder)
    let targetDir = RECORDINGS_DIR;
    if (folderToUse) {
      // Sanitize folder name to prevent directory traversal
      const sanitizedFolder = folderToUse.replace(/[^a-zA-Z0-9._-]/g, "_");
      targetDir = path.join(RECORDINGS_DIR, sanitizedFolder);
      
      // Create subdirectory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }
    
    const filepath = path.join(targetDir, filename);
    fs.writeFileSync(filepath, response.data);

    // Build the relative path for API access
    const relativePath = folderToUse
      ? `/storage/recordings/${folderToUse.replace(/[^a-zA-Z0-9._-]/g, "_")}/${filename}`
      : `/storage/recordings/${filename}`;

    // Return metadata instead of the binary data
    return {
      saved: true,
      filename,
      filepath: relativePath,
      size: response.data.length,
      contentType: response.headers["content-type"] || "video/h264",
      message: `Recording saved to ${storageFolder ? `${storageFolder}/` : ""}${filename}`,
    };
  }

  // For regular JSON responses, return as before
  return response.data;
}

app.post("/api/camera/bundle", async (req, res) => {
  const { connection, steps } = req.body;

  if (!connection || !Array.isArray(steps)) {
    return res
      .status(400)
      .json({ error: "Missing connection or steps array" });
  }

  const results = [];

  for (const step of steps) {
    try {
      const data = await callCameraStep(connection, step);
      results.push({
        ok: true,
        operationId: step.operationId,
        label: step.label,
        data,
      });
    } catch (err) {
      console.error(
        "Bundle step error:",
        step.operationId,
        err.message
      );
      results.push({
        ok: false,
        operationId: step.operationId,
        label: step.label,
        error: err.message,
        status: err.response?.status || 500,
        data: err.response?.data,
      });
      // if you want to stop on first error, you could `break;` here
    }
  }

  res.json({ results });
});

// Endpoint for recording automation - executes multiple clips
app.post("/api/camera/recording-automation", async (req, res) => {
  const { connection, clips, storageFolder } = req.body;

  if (!connection || !Array.isArray(clips)) {
    return res
      .status(400)
      .json({ error: "Missing connection or clips array" });
  }

  if (clips.length === 0) {
    return res
      .status(400)
      .json({ error: "Clips array is empty" });
  }

  // Sanitize storage folder if provided (for backward compatibility)
  let sanitizedFolder = null;
  if (storageFolder && storageFolder.trim()) {
    sanitizedFolder = storageFolder.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  const results = [];
  const totalClips = clips.length;

  console.log(`Starting recording automation: ${totalClips} clips${sanitizedFolder ? ` in folder: ${sanitizedFolder}` : ""}`);

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    
    // Build step from clip data
    const step = {
      verb: "operate",
      operationId: "record.playback",
      label: `Playback ${clip.startTime} - ${clip.endTime}`,
      cgiPath: "/cgi-bin/record.cgi",
      method: "GET",
      query: {
        action: "playBack",
        cameraID: clip.cameraID,
        streamID: clip.streamID,
        startTime: clip.startTime,
        endTime: clip.endTime,
      },
      saveToStorage: true, // Always save recordings
    };

    // If clip has storageFolder, add it to query (takes precedence over parameter)
    if (clip.storageFolder && clip.storageFolder.trim()) {
      step.query.storageFolder = clip.storageFolder.trim();
    }

    try {
      // Pass sanitizedFolder as fallback (for backward compatibility)
      const data = await callCameraStep(connection, step, sanitizedFolder);
      results.push({
        ok: true,
        clipIndex: i + 1,
        totalClips,
        startTime: clip.startTime,
        endTime: clip.endTime,
        operationId: step.operationId,
        label: step.label,
        data,
      });
      
      console.log(`Clip ${i + 1}/${totalClips} completed: ${clip.startTime} - ${clip.endTime}`);
    } catch (err) {
      console.error(
        `Recording automation clip ${i + 1}/${totalClips} error:`,
        clip.startTime,
        err.message
      );
      results.push({
        ok: false,
        clipIndex: i + 1,
        totalClips,
        startTime: clip.startTime,
        endTime: clip.endTime,
        operationId: step.operationId,
        label: step.label,
        error: err.message,
        status: err.response?.status || 500,
        data: err.response?.data,
      });
      // Continue processing other clips even if one fails
    }
  }

  const successCount = results.filter(r => r.ok).length;
  const failureCount = results.filter(r => !r.ok).length;

  console.log(`Recording automation completed: ${successCount} succeeded, ${failureCount} failed`);

  res.json({
    success: true,
    totalClips,
    successCount,
    failureCount,
    storageFolder: sanitizedFolder,
    results,
  });
});

// Endpoint to get all directories in storage
app.get("/storage", (req, res) => {
  try {
    const items = fs.readdirSync(STORAGE_DIR);
    const directories = items.filter(item => {
      const itemPath = path.join(STORAGE_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    res.json({ directories });
  } catch (err) {
    res.status(500).json({ error: "Failed to read storage directory", message: err.message });
  }
});

// Endpoint to get files from a specific directory
app.get("/storage/:directory", (req, res) => {
  const directory = req.params.directory;
  
  // Validate directory name to prevent directory traversal
  if (directory.includes("..") || directory.includes("/") || directory.includes("\\")) {
    return res.status(400).json({ error: "Invalid directory name" });
  }
  
  const directoryPath = path.join(STORAGE_DIR, directory);
  
  // Check if directory exists
  if (!fs.existsSync(directoryPath)) {
    return res.status(404).json({ error: "Directory not found" });
  }
  
  // Check if it's actually a directory
  if (!fs.statSync(directoryPath).isDirectory()) {
    return res.status(400).json({ error: "Not a directory" });
  }
  
  try {
    const items = fs.readdirSync(directoryPath);
    const files = [];
    const subdirectories = [];
    
    items.forEach(item => {
      const itemPath = path.join(directoryPath, item);
      if (fs.statSync(itemPath).isFile()) {
        files.push(item);
      } else if (fs.statSync(itemPath).isDirectory()) {
        subdirectories.push(item);
      }
    });
    
    res.json({ directory, files, subdirectories });
  } catch (err) {
    res.status(500).json({ error: "Failed to read directory", message: err.message });
  }
});

// Endpoint to get files from recordings subdirectory (e.g., /storage/recordings/folder_name)
app.get("/storage/recordings/:subdirectory", (req, res) => {
  const subdirectory = req.params.subdirectory;
  
  // Validate subdirectory name to prevent directory traversal
  if (subdirectory.includes("..") || subdirectory.includes("/") || subdirectory.includes("\\")) {
    return res.status(400).json({ error: "Invalid subdirectory name" });
  }
  
  const subdirectoryPath = path.join(RECORDINGS_DIR, subdirectory);
  
  // Check if subdirectory exists
  if (!fs.existsSync(subdirectoryPath)) {
    return res.status(404).json({ error: "Subdirectory not found" });
  }
  
  // Check if it's actually a directory
  if (!fs.statSync(subdirectoryPath).isDirectory()) {
    return res.status(400).json({ error: "Not a directory" });
  }
  
  try {
    const items = fs.readdirSync(subdirectoryPath);
    const files = [];
    const subdirectories = [];
    
    items.forEach(item => {
      const itemPath = path.join(subdirectoryPath, item);
      if (fs.statSync(itemPath).isFile()) {
        files.push(item);
      } else if (fs.statSync(itemPath).isDirectory()) {
        subdirectories.push(item);
      }
    });
    
    res.json({ directory: `recordings/${subdirectory}`, files, subdirectories });
  } catch (err) {
    res.status(500).json({ error: "Failed to read subdirectory", message: err.message });
  }
});

// Endpoint to get files from images subdirectory (e.g., /storage/images/folder_name)
app.get("/storage/images/:subdirectory", (req, res) => {
  const subdirectory = req.params.subdirectory;
  
  // Validate subdirectory name to prevent directory traversal
  if (subdirectory.includes("..") || subdirectory.includes("/") || subdirectory.includes("\\")) {
    return res.status(400).json({ error: "Invalid subdirectory name" });
  }
  
  const subdirectoryPath = path.join(IMAGES_DIR, subdirectory);
  
  // Check if subdirectory exists
  if (!fs.existsSync(subdirectoryPath)) {
    return res.status(404).json({ error: "Subdirectory not found" });
  }
  
  // Check if it's actually a directory
  if (!fs.statSync(subdirectoryPath).isDirectory()) {
    return res.status(400).json({ error: "Not a directory" });
  }
  
  try {
    const items = fs.readdirSync(subdirectoryPath);
    const files = [];
    const subdirectories = [];
    
    items.forEach(item => {
      const itemPath = path.join(subdirectoryPath, item);
      if (fs.statSync(itemPath).isFile()) {
        files.push(item);
      } else if (fs.statSync(itemPath).isDirectory()) {
        subdirectories.push(item);
      }
    });
    
    res.json({ directory: `images/${subdirectory}`, files, subdirectories });
  } catch (err) {
    res.status(500).json({ error: "Failed to read subdirectory", message: err.message });
  }
});

// Endpoint to serve files from images subdirectories (e.g., /storage/images/folder_name/file.jpg)
app.get("/storage/images/:subdirectory/:filename", (req, res) => {
  const subdirectory = req.params.subdirectory;
  const filename = req.params.filename;
  
  // Validate subdirectory and filename to prevent directory traversal
  if (subdirectory.includes("..") || subdirectory.includes("/") || subdirectory.includes("\\") ||
      filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid path" });
  }
  
  const filepath = path.join(IMAGES_DIR, subdirectory, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }
  
  // Check if it's actually a file
  if (!fs.statSync(filepath).isFile()) {
    return res.status(400).json({ error: "Not a file" });
  }

  // Determine content type based on file extension
  const ext = path.extname(filepath).toLowerCase();
  let contentType = "application/octet-stream";
  let contentDisposition = `attachment; filename="${filename}"`;

  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    contentType = ext === ".png" ? "image/png" : "image/jpeg";
    contentDisposition = `attachment; filename="${filename}"`;
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", contentDisposition);

  // Stream the file
  const fileStream = fs.createReadStream(filepath);
  fileStream.pipe(res);
});

// Endpoint to serve stored files from directories
app.get("/storage/:directory/:filename", (req, res) => {
  const directory = req.params.directory;
  const filename = req.params.filename;
  
  // Validate directory and filename to prevent directory traversal
  if (directory.includes("..") || directory.includes("/") || directory.includes("\\") ||
      filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid path" });
  }
  
  const filepath = path.join(STORAGE_DIR, directory, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }
  
  // Check if it's actually a file
  if (!fs.statSync(filepath).isFile()) {
    return res.status(400).json({ error: "Not a file" });
  }

  // Determine content type based on file extension
  const ext = path.extname(filepath).toLowerCase();
  let contentType = "application/octet-stream";
  let contentDisposition = `attachment; filename="${filename}"`;

  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    contentType = ext === ".png" ? "image/png" : "image/jpeg";
    contentDisposition = `attachment; filename="${filename}"`;
  } else if (ext === ".h264" || ext === ".mp4") {
    contentType = "video/h264";
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", contentDisposition);

  // Stream the file
  const fileStream = fs.createReadStream(filepath);
  fileStream.pipe(res);
});

// Endpoint to serve files from recordings subdirectories (e.g., /storage/recordings/folder_name/file.h264)
app.get("/storage/recordings/:subdirectory/:filename", (req, res) => {
  const subdirectory = req.params.subdirectory;
  const filename = req.params.filename;
  
  // Validate subdirectory and filename to prevent directory traversal
  if (subdirectory.includes("..") || subdirectory.includes("/") || subdirectory.includes("\\") ||
      filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid path" });
  }
  
  const filepath = path.join(RECORDINGS_DIR, subdirectory, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }
  
  // Check if it's actually a file
  if (!fs.statSync(filepath).isFile()) {
    return res.status(400).json({ error: "Not a file" });
  }

  // Determine content type based on file extension
  const ext = path.extname(filepath).toLowerCase();
  let contentType = "application/octet-stream";
  let contentDisposition = `attachment; filename="${filename}"`;

  if (ext === ".h264" || ext === ".mp4") {
    contentType = "video/h264";
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", contentDisposition);

  // Stream the file
  const fileStream = fs.createReadStream(filepath);
  fileStream.pipe(res);
});

// Firmware upload endpoint with checksum verification
app.post("/api/firmware/upload", upload.single("firmware"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const clientChecksum = req.body.checksum;
    if (!clientChecksum) {
      // Clean up uploaded file if checksum is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Checksum not provided" });
    }

    // Calculate checksum of received file
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    const serverChecksum = hash.digest("hex");

    // Compare checksums
    if (clientChecksum !== serverChecksum) {
      // Clean up uploaded file if checksums don't match
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "Checksum mismatch",
        clientChecksum,
        serverChecksum,
        message: "File integrity check failed. The file may have been corrupted during upload.",
      });
    }

    // Checksums match - file is valid
    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      checksum: serverChecksum,
      message: "Firmware uploaded and verified successfully",
    });
  } catch (err) {
    console.error("Firmware upload error:", err);
    
    // Clean up file if it exists and there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Firmware upload failed",
      message: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`Storage directory: ${STORAGE_DIR}`);
  console.log(`Images directory: ${IMAGES_DIR}`);
  console.log(`Recordings directory: ${RECORDINGS_DIR}`);
  console.log(`Firmware directory: ${FIRMWARE_DIR}`);
});

