import { useState } from "react";

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
  const [ip, setIp] = useState("10.20.2.121");
  const [port, setPort] = useState("80");
  const [protocol, setProtocol] = useState("http");
  const [endpointId, setEndpointId] = useState("param");
  const [method, setMethod] = useState("GET");

  const [action, setAction] = useState("get");
  const [type, setType] = useState("deviceInfo");
  const [cameraID, setCameraID] = useState("");

  // Extra query params (key=value per line)
  const [extraParamsText, setExtraParamsText] = useState("");

  // Optional auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [requestPreview, setRequestPreview] = useState(null);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedEndpoint = ENDPOINTS.find((e) => e.id === endpointId);

  const buildQueryObject = () => {
    const query = {};

    if (action) query.action = action;
    if (type) query.type = type;
    if (cameraID) query.cameraID = cameraID;

    // Parse extra params: "key=value" per line
    extraParamsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line.includes("="))
      .forEach((line) => {
        const [key, value] = line.split("=");
        if (key) {
          query[key.trim()] = (value || "").trim();
        }
      });

    return query;
  };

  const sendRequest = async () => {
    if (!selectedEndpoint) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const query = buildQueryObject();

    const body = {
      protocol,
      ip,
      path: selectedEndpoint.path,
      method,
      query,
    };

    if (port) {
      body.port = Number(port);
    }

    if (username && password) {
      body.auth = { username, password };
    }

    setRequestPreview(body);

    try {
      const res = await fetch("http://localhost:3000/api/camera/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(
          data.message || data.proxyError || `HTTP ${res.status}`
        );
      }

      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", maxWidth: 1000 }}>
      <h1>Sunell Camera API Tester</h1>

      {/* Camera connection settings */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <label>
          Camera IP:
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Port:
          <input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Protocol:
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="http">http</option>
            <option value="https">https</option>
          </select>
        </label>
      </div>

      {/* Endpoint + method */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <label>
          CGI Endpoint:
          <select
            value={endpointId}
            onChange={(e) => setEndpointId(e.target.value)}
            style={{ width: "100%" }}
          >
            {ENDPOINTS.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          HTTP Method:
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </label>
      </div>

      {/* Common query params: action, type, cameraID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <label>
          action:
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. get, set, up, down, query"
            style={{ width: "100%" }}
          />
        </label>

        <label>
          type:
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="e.g. deviceInfo, localNetwork, ptzCap"
            style={{ width: "100%" }}
          />
        </label>

        <label>
          cameraID:
          <input
            value={cameraID}
            onChange={(e) => setCameraID(e.target.value)}
            placeholder="e.g. 1"
            style={{ width: "100%" }}
          />
        </label>
      </div>

      {/* Extra params */}
      <div style={{ marginBottom: "1rem" }}>
        <label>
          Extra query params (key=value per line):
          <textarea
            value={extraParamsText}
            onChange={(e) => setExtraParamsText(e.target.value)}
            rows={4}
            style={{ width: "100%", fontFamily: "monospace" }}
            placeholder={`Example:\nNtpServer=ntp.aliyun.com\nNtpPort=123`}
          />
        </label>
      </div>

      {/* Optional auth */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <label>
          Username (optional):
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Password (optional):
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <button onClick={sendRequest} disabled={loading}>
        {loading ? "Sending..." : "Send Request"}
      </button>

      {/* Debug: show request body */}
      {requestPreview && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Request Body (to backend)</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "1rem",
              borderRadius: "4px",
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
            {JSON.stringify(requestPreview, null, 2)}
          </pre>
        </div>
      )}

      {/* Error / response */}
      <div style={{ marginTop: "1.5rem" }}>
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {response && (
          <div>
            <h3>Camera Response (via backend)</h3>
            <pre
              style={{
                background: "#f4f4f4",
                padding: "1rem",
                borderRadius: "4px",
                maxHeight: "400px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
