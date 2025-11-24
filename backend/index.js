const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Create storage directory if it doesn't exist
const STORAGE_DIR = path.join(__dirname, "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Operations that return binary/large data
const BINARY_OPERATIONS = ["record.playback"];

async function callCameraStep(connection, step) {
  const { protocol, ip, port, username, password } = connection;
  const { cgiPath, method, query, operationId, saveToStorage } = step;

  const baseUrl = `${protocol}://${ip}:${port}`;
  const url = `${baseUrl}${cgiPath}`;

  // Check if this operation typically returns binary data
  const isBinaryOperation = BINARY_OPERATIONS.includes(operationId);
  const shouldSave = saveToStorage === true || (saveToStorage === undefined && isBinaryOperation);

  const axiosConfig = {
    url,
    method: method || "GET",
    // Sunell camera uses query string params
    params: query || {},
    // optional auth
    auth: username && password ? { username, password } : undefined,
    // For binary operations, get the raw response
    responseType: shouldSave ? "arraybuffer" : "json",
    // you can tweak timeout / validateStatus here if needed
  };

  const response = await axios(axiosConfig);

  // If we should save this data (binary/large response)
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

// Endpoint to serve stored files
app.get("/storage/:filename", (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(STORAGE_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Set appropriate headers for video file
  res.setHeader("Content-Type", "video/h264");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Stream the file
  const fileStream = fs.createReadStream(filepath);
  fileStream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`Storage directory: ${STORAGE_DIR}`);
});

