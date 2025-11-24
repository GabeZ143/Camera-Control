import { useState } from "react";
import { ApiBuilder } from "./components/ApiBuilder";
import { CGI_OPERATIONS } from "./config/cgiOperations";

const ENDPOINTS = [
  { id: "param", label: "param.cgi (Config)", path: "/cgi-bin/param.cgi" },
  { id: "ptz", label: "ptz.cgi (PTZ)", path: "/cgi-bin/ptz.cgi" },
  { id: "video", label: "video.cgi (Live Video)", path: "/cgi-bin/video.cgi" },
  { id: "record", label: "record.cgi (Recording)", path: "/cgi-bin/record.cgi" },
  { id: "image", label: "image.cgi (Snapshot)", path: "/cgi-bin/image.cgi" },
  { id: "alarm", label: "alarm.cgi (Alarm)", path: "/cgi-bin/alarm.cgi" },
  { id: "sensor", label: "sensor.cgi (Sensor)", path: "/cgi-bin/sensor.cgi" },
  { id: "audio", label: "audio.cgi (Audio)", path: "/cgi-bin/audio.cgi" },
  { id: "upgrade", label: "upgrade.cgi (Upgrade)", path: "/cgi-bin/upgrade.cgi" },
  { id: "system", label: "system.cgi (System)", path: "/cgi-bin/system.cgi" },
  { id: "network", label: "network.cgi (Network)", path: "/cgi-bin/network.cgi" },
  { id: "operate", label: "operate.cgi (Operate)", path: "/cgi-bin/operate.cgi" },
];

function App() {

  const [steps, setSteps] = useState([
    { id: 1, builtStep: null },  // start with one blank builder
  ]);

   const [connection, setConnection] = useState({
    protocol: "http",
    ip: "10.20.2.121",
    port: 80,
    username: "admin",
    password: "admin",
  });

  const [bundleResult, setBundleResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  // Firmware upload state
  const [firmwareFile, setFirmwareFile] = useState(null);
  const [firmwareUploading, setFirmwareUploading] = useState(false);
  const [firmwareError, setFirmwareError] = useState(null);
  const [firmwareSuccess, setFirmwareSuccess] = useState(null);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: Date.now(), builtStep: null }, // simple unique id
    ]);
  };

  const removeStep = (id) => {
    setSteps((prev) => prev.filter((step) => step.id !== id));
  };

  const handleStepChange = (id, builtStep) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, builtStep } : step
      )
    );
  };

 const handleRunBundle = async () => {
    setError(null);
    setBundleResult(null);

    const validSteps = steps
      .map((s) => s.builtStep)
      .filter((s) => s != null);

    if (validSteps.length === 0) {
      setError("No valid steps configured.");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch(
        "http://localhost:3000/api/camera/bundle",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            connection,
            steps: validSteps,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error ||
            `Bundle request failed with status ${response.status}`
        );
      } else {
        setBundleResult(data);
      }
    } catch (err) {
      console.error("Bundle run error:", err);
      setError(err.message || "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleConnectionChange = (field, value) => {
    setConnection((prev) => ({
      ...prev,
      [field]: field === "port" ? Number(value) || 0 : value,
    }));
  };

  // Calculate SHA-256 checksum of a file
  const calculateChecksum = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  };

  const handleFirmwareFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFirmwareFile(file);
      setFirmwareError(null);
      setFirmwareSuccess(null);
    }
  };

  const handleFirmwareUpload = async () => {
    if (!firmwareFile) {
      setFirmwareError("Please select a firmware file");
      return;
    }

    setFirmwareUploading(true);
    setFirmwareError(null);
    setFirmwareSuccess(null);

    try {
      // Calculate checksum on frontend
      const checksum = await calculateChecksum(firmwareFile);
      console.log("Frontend checksum:", checksum);

      // Create FormData to send file
      const formData = new FormData();
      formData.append("firmware", firmwareFile);
      formData.append("checksum", checksum);

      // Upload to backend
      const response = await fetch("http://localhost:3000/api/firmware/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setFirmwareError(data.error || data.message || "Upload failed");
      } else {
        setFirmwareSuccess(data);
        setFirmwareFile(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
      }
    } catch (err) {
      console.error("Firmware upload error:", err);
      setFirmwareError(err.message || "Unknown error occurred");
    } finally {
      setFirmwareUploading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>

      <h1>Sunell Camera API Builder</h1>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Camera Connection</h2>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Protocol:&nbsp;
            <select
              value={connection.protocol}
              onChange={(e) => handleConnectionChange("protocol", e.target.value)}
            >
              <option value="http">http</option>
              <option value="https">https</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            IP:&nbsp;
            <input
              type="text"
              value={connection.ip}
              onChange={(e) => handleConnectionChange("ip", e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Port:&nbsp;
            <input
              type="number"
              value={connection.port}
              onChange={(e) => handleConnectionChange("port", e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Username:&nbsp;
            <input
              type="text"
              value={connection.username}
              onChange={(e) => handleConnectionChange("username", e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Password:&nbsp;
            <input
              type="password"
              value={connection.password}
              onChange={(e) => handleConnectionChange("password", e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* List of ApiBuilder components */}
      {steps.map((step, index) => (
        <div
          key={step.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Step {index + 1}</h3>
            {steps.length > 1 && (
              <button onClick={() => removeStep(step.id)}>
                Remove
              </button>
            )}
          </div>

          <ApiBuilder
            operations={CGI_OPERATIONS}
            onChange={(builtStep) => handleStepChange(step.id, builtStep)}
          />
        </div>
      ))}

      <button onClick={addStep} style={{ marginRight: "0.5rem" }}>
        + Add Step
      </button>

      <button onClick={handleRunBundle}>
        Run Bundle
      </button>

      {/* Firmware Upload Section */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginTop: "1.5rem",
        }}
      >
        <h2>Firmware Upload</h2>
        <div style={{ marginBottom: "0.5rem" }}>
          <input
            type="file"
            accept=".bin,.hex,.fw,.img"
            onChange={handleFirmwareFileChange}
            disabled={firmwareUploading}
            style={{ marginBottom: "0.5rem" }}
          />
        </div>
        {firmwareFile && (
          <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
            Selected: {firmwareFile.name} ({(firmwareFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
        <button
          onClick={handleFirmwareUpload}
          disabled={!firmwareFile || firmwareUploading}
          style={{
            backgroundColor: firmwareFile && !firmwareUploading ? "#4CAF50" : "#ccc",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: 4,
            cursor: firmwareFile && !firmwareUploading ? "pointer" : "not-allowed",
          }}
        >
          {firmwareUploading ? "Uploading..." : "Upload Firmware"}
        </button>

        {firmwareError && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              background: "#fff5f5",
              border: "1px solid #fcc",
              borderRadius: 4,
              color: "#c00",
            }}
          >
            <strong>Error:</strong> {firmwareError}
          </div>
        )}

        {firmwareSuccess && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              background: "#f5fff5",
              border: "1px solid #cfc",
              borderRadius: 4,
              color: "#0c0",
            }}
          >
            <strong>Success:</strong> {firmwareSuccess.message}
            <div style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
              File: {firmwareSuccess.filename}
              <br />
              Checksum: {firmwareSuccess.checksum}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h2>Current Bundle Snapshot</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "0.75rem",
            borderRadius: 4,
            fontSize: "0.8rem",
          }}
        >
{JSON.stringify(
  steps.map((s) => s.builtStep),
  null,
  2
)}
        </pre>
      </div>

      {error && (
        <div style={{ marginTop: "1rem", color: "red" }}>
          <h2>Bundle Error</h2>
          <p>{error}</p>
        </div>
      )}

      {isRunning && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#eef",
            borderRadius: 6,
            border: "1px solid #99f",
            fontWeight: "bold",
          }}
        >
          Running bundle… please wait.
        </div>
      )}

      {bundleResult && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2>Bundle Results</h2>

          {Array.isArray(bundleResult.results) &&
            bundleResult.results.map((r, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: "0.75rem",
                  marginBottom: "0.75rem",
                  background: r.ok ? "#f5fff5" : "#fff5f5",
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  Step {idx + 1}: {r.label || r.operationId}
                </h3>
                <p>
                  Status:{" "}
                  <strong style={{ color: r.ok ? "green" : "red" }}>
                    {r.ok ? "OK" : "ERROR"}
                  </strong>
                </p>

                {r.status && (
                  <p style={{ margin: 0 }}>HTTP Status: {r.status}</p>
                )}

                {r.error && (
                  <p style={{ margin: 0 }}>Error: {r.error}</p>
                )}

                <details style={{ marginTop: "0.5rem" }}>
                  <summary>Raw Data</summary>
                  <pre
                    style={{
                      background: "#f5f5f5",
                      padding: "0.5rem",
                      borderRadius: 4,
                      fontSize: "0.8rem",
                      overflow: "auto",
                    }}
                  >
{JSON.stringify(r.data, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
        </div>
      )}
    </div>
  );

}

export default App;
