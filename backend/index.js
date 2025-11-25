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


async function callCameraStep(connection, step) {
  const { protocol, ip, port, username, password } = connection;
  const { cgiPath, method, query, operationId, saveToStorage } = step;

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
    const filepath = path.join(IMAGES_DIR, filename);

    fs.writeFileSync(filepath, response.data);

    // Return metadata instead of the binary data
    return {
      saved: true,
      filename,
      filepath: `/storage/images/${filename}`, // relative path for API access
      size: response.data.length,
      contentType: response.headers["content-type"] || "image/png",
      message: `Image saved to ${filename}`,
    };
  }

  // If we should save this data (binary/large response - like recordings)
  if (shouldSave && Buffer.isBuffer(response.data)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${operationId || "recording"}_${timestamp}.h264`;
    const filepath = path.join(STORAGE_DIR, filename);

    fs.writeFileSync(filepath, response.data);

    // Return metadata instead of the binary data
    return {
      saved: true,
      filename,
      filepath: `/storage/${filename}`, // relative path for API access
      size: response.data.length,
      contentType: response.headers["content-type"] || "video/h264",
      message: `Recording saved to ${filename}`,
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

// Endpoint to display all stored files (including images)
app.get("/storage", (req, res) => {
  const files = fs.readdirSync(STORAGE_DIR).filter(file => {
    // Exclude the images directory from the main listing
    const filePath = path.join(STORAGE_DIR, file);
    return fs.statSync(filePath).isFile();
  });
  
  // Get image files
  const imageFiles = fs.existsSync(IMAGES_DIR) 
    ? fs.readdirSync(IMAGES_DIR).map(file => `images/${file}`)
    : [];
  
  res.json({ files: [...files, ...imageFiles] });
});

// Endpoint to serve stored files (including images)
app.get("/storage/:filename", (req, res) => {
  let filename = req.params.filename;
  let filepath;

  // Check if it's an image file (from images subdirectory)
  if (filename.startsWith("images/")) {
    const imageFilename = filename.replace("images/", "");
    filepath = path.join(IMAGES_DIR, imageFilename);
  } else {
    filepath = path.join(STORAGE_DIR, filename);
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Determine content type based on file extension
  const ext = path.extname(filepath).toLowerCase();
  let contentType = "application/octet-stream";
  let contentDisposition = `attachment; filename="${path.basename(filename)}"`;

  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    contentType = ext === ".png" ? "image/png" : "image/jpeg";
    contentDisposition = `inline; filename="${path.basename(filename)}"`;
  } else if (ext === ".h264" || ext === ".mp4") {
    contentType = "video/h264";
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", contentDisposition);

  // For image files, force download by setting Content-Disposition to attachment
  // (the header is already set above; just stream the file)
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filename)}"`);
  }
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
  console.log(`Firmware directory: ${FIRMWARE_DIR}`);
});

