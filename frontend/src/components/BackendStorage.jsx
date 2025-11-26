import { useState, useEffect } from "react";

function BackendStorage() {
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [files, setFiles] = useState([]);
  const [viewingFiles, setViewingFiles] = useState(false);

  const fetchDirectories = async () => {
    try {
      const response = await fetch("http://localhost:3000/storage");
      const data = await response.json();
      setDirectories(data.directories || []);
    } catch (err) {
      console.error("Failed to fetch directories:", err);
    }
  };

  const fetchFiles = async (directory) => {
    try {
      const response = await fetch(`http://localhost:3000/storage/${encodeURIComponent(directory)}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setFiles([]);
    }
  };

  const handleViewFiles = () => {
    fetchDirectories();
    setViewingFiles(true);
  };

  const handleDirectorySelect = (directory) => {
    // If clicking the same directory that's already selected, deselect it
    if (selectedDirectory === directory) {
      setSelectedDirectory(null);
      setFiles([]);
    } else {
      // Clear files immediately when switching directories
      setFiles([]);
      setSelectedDirectory(directory);
      fetchFiles(directory);
    }
  };

  // Fetch directories when component mounts if viewing
  useEffect(() => {
    if (viewingFiles && directories.length === 0) {
      fetchDirectories();
    }
  }, [viewingFiles]);

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
          View Storage
        </button>
      ) : (
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={fetchDirectories}>
            Refresh
          </button>
          <button onClick={() => {
            setViewingFiles(false);
            setSelectedDirectory(null);
            setFiles([]);
          }}>
            Minimize
          </button>
        </div>
      )}

      {viewingFiles && (
        <div>
          {/* Directory Selection */}
          <div style={{ marginBottom: "0.75rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: "bold" }}>
              Directories:
            </h4>
            {directories.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {directories.map(dir => (
                  <button
                    key={dir}
                    onClick={() => handleDirectorySelect(dir)}
                    style={{
                      padding: "0.4rem 0.6rem",
                      textAlign: "left",
                      backgroundColor: selectedDirectory === dir ? "#e3f2fd" : "#f5f5f5",
                      border: selectedDirectory === dir ? "1px solid #2196f3" : "1px solid #ddd",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: "0.85em",
                    }}
                  >
                    📁 {dir}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: "#888", fontSize: "0.85em" }}>No directories found.</p>
            )}
          </div>

          {/* Files in Selected Directory */}
          {selectedDirectory && (
            <div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: "bold" }}>
                Files in {selectedDirectory}:
              </h4>
              {files.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, maxHeight: "40vh", overflow: "auto", margin: 0 }}>
                  {files.map(filename => (
                    <li key={filename} style={{ marginBottom: "0.5em", wordBreak: "break-all" }}>
                      <a
                        href={`http://localhost:3000/storage/${encodeURIComponent(selectedDirectory)}/${encodeURIComponent(filename)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#0067c5",
                          textDecoration: "underline",
                          fontSize: "0.85em",
                        }}
                        title={filename}
                      >
                        {filename}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#888", fontSize: "0.85em" }}>No files in this directory.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BackendStorage;

