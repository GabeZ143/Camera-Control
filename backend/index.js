const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Helper: actually send request to camera
 */
async function proxyToCamera({
  protocol = "http",
  ip,
  port,
  path,
  method = "GET",
  query = {},
  body = null,
  auth,
  timeoutMs = 5000,
}) {
  if (!ip) {
    throw new Error("Camera IP is required");
  }
  if (!path) {
    throw new Error("Camera path is required (e.g. /cgi-bin/param.cgi)");
  }

  // Basic safety: only allow cgi-bin paths (you can relax this later)
  if (!path.startsWith("/cgi-bin/") && path !== "/") {
    throw new Error("Invalid path (must start with /cgi-bin/ or be /)");
  }

  let host = ip;
  if (port) {
    host += `:${port}`;
  }

  const url = `${protocol}://${host}${path}`;

  const axiosConfig = {
    url,
    method: method.toLowerCase(),
    params: query,       // becomes ?action=...&type=... etc.
    timeout: timeoutMs,
    validateStatus: () => true, // don't throw on non-2xx; we’ll forward status
  };

  if (auth && auth.username && auth.password) {
    axiosConfig.auth = {
      username: auth.username,
      password: auth.password,
    };
  }

  if (body && ["post", "put", "patch"].includes(method.toLowerCase())) {
    axiosConfig.data = body;
  }

  const cameraRes = await axios(axiosConfig);

  return {
    requestedUrl: url,
    status: cameraRes.status,
    statusText: cameraRes.statusText,
    headers: cameraRes.headers,
    data: cameraRes.data,
  };
}

/**
 * Generic proxy for ANY camera endpoint.
 * Frontend posts JSON like:
 * {
 *   "protocol": "http",
 *   "ip": "10.20.2.121",
 *   "port": 80,
 *   "path": "/cgi-bin/param.cgi",
 *   "method": "GET",
 *   "query": { "action": "get", "type": "deviceInfo" },
 *   "auth": { "username": "admin", "password": "123456" }
 * }
 */
app.post("/api/camera/proxy", async (req, res) => {
  try {
    const result = await proxyToCamera(req.body);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Proxy error:", err.message);

    if (err.response) {
      // Axios got a response with non-2xx status
      return res.status(502).json({
        success: false,
        message: "Camera responded with error status",
        proxyError: err.message,
        cameraStatus: err.response.status,
        cameraData: err.response.data,
      });
    }

    if (err.request) {
      // Request was sent but no response received
      return res.status(504).json({
        success: false,
        message: "No response from camera (timeout or network issue)",
        proxyError: err.message,
      });
    }

    // Something else (bad params etc.)
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Convenience route for param.cgi (config stuff)
 * So you can still hit /api/sunell/param if you want.
 *
 * Body: { ip, query, method, auth, protocol, port }
 * query e.g. { action: "get", type: "deviceInfo" }
 */
app.post("/api/sunell/param", async (req, res) => {
  const { ip, query = {}, method = "GET", protocol, port, auth } = req.body;

  try {
    const result = await proxyToCamera({
      protocol,
      ip,
      port,
      path: "/cgi-bin/param.cgi",
      method,
      query,
      auth,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Sunell param.cgi error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Convenience route for PTZ (ptz.cgi)
 */
app.post("/api/sunell/ptz", async (req, res) => {
  const { ip, query = {}, method = "GET", protocol, port, auth } = req.body;

  try {
    const result = await proxyToCamera({
      protocol,
      ip,
      port,
      path: "/cgi-bin/ptz.cgi",
      method,
      query,
      auth,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Sunell ptz.cgi error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
