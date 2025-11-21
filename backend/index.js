const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

async function callCameraStep(connection, step) {
  const { protocol, ip, port, username, password } = connection;
  const { cgiPath, method, query } = step;

  const baseUrl = `${protocol}://${ip}:${port}`;
  const url = `${baseUrl}${cgiPath}`;

  const axiosConfig = {
    url,
    method: method || "GET",
    // Sunell camera uses query string params
    params: query || {},
    // optional auth
    auth: username && password ? { username, password } : undefined,
    // you can tweak timeout / validateStatus here if needed
  };

  const response = await axios(axiosConfig);
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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

