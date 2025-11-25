import { useState } from "react";

function BackendStorage() {
  const [storedFiles, setStoredFiles] = useState([]);
  const [viewingFiles, setViewingFiles] = useState(false);

  const fetchStoredFiles = async () => {
    const response = await fetch("http://localhost:3000/storage");
    const data = await response.json();
    setStoredFiles(data.files);
  };

  const handleViewFiles = () => {
    fetchStoredFiles();
    setViewingFiles(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        background: "rgba(255,255,255,0.98)",
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: "1rem",
        width: 300,
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        zIndex: 1000,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Backend Storage</h3>

      {!viewingFiles ? (
        <button
          style={{ marginBottom: "0.5rem" }}
          onClick={handleViewFiles}
        >
          View Files
        </button>
      ) : (
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={fetchStoredFiles}>
            Refresh Files
          </button>
          <button onClick={() => setViewingFiles(false)}>
            Minimize
          </button>
        </div>
      )}

      {viewingFiles ? (
        storedFiles && storedFiles.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, maxHeight: "60vh", overflow: "auto", margin: 0 }}>
            {storedFiles.map(filename => (
              <li key={filename} style={{ marginBottom: "0.5em", wordBreak: "break-all" }}>
                <a
                  href={`http://localhost:3000/storage/${encodeURIComponent(filename)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#0067c5",
                    textDecoration: "underline",
                    fontSize: "0.95em",
                  }}
                  title={filename}
                >
                  {filename}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#888", fontSize: "0.96em" }}>No files in storage.</p>
        )
      ) : null}
    </div>
  );
}

export default BackendStorage;

