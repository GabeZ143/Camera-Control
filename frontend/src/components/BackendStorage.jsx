import { useState, useEffect } from "react";

function BackendStorage() {
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [files, setFiles] = useState([]);
  const [subdirectories, setSubdirectories] = useState([]);
  const [currentPath, setCurrentPath] = useState([]); // Track navigation path
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
      setSubdirectories(data.subdirectories || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setFiles([]);
      setSubdirectories([]);
    }
  };

  const fetchSubdirectory = async (parentDir, subdir) => {
    try {
      // Handle special cases for images and recordings subdirectories
      let url;
      if (parentDir === "images") {
        url = `http://localhost:3000/storage/images/${encodeURIComponent(subdir)}`;
      } else if (parentDir === "recordings") {
        url = `http://localhost:3000/storage/recordings/${encodeURIComponent(subdir)}`;
      } else {
        // For other directories, try the standard path
        url = `http://localhost:3000/storage/${encodeURIComponent(parentDir)}/${encodeURIComponent(subdir)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setFiles(data.files || []);
      setSubdirectories(data.subdirectories || []); // In case there are nested subdirectories
    } catch (err) {
      console.error("Failed to fetch subdirectory:", err);
      setFiles([]);
      setSubdirectories([]);
    }
  };

  const handleViewFiles = () => {
    fetchDirectories();
    setViewingFiles(true);
  };

  const handleDirectorySelect = (directory) => {
    // If clicking the same directory that's already selected, deselect it
    if (selectedDirectory === directory && currentPath.length === 0) {
      setSelectedDirectory(null);
      setFiles([]);
      setSubdirectories([]);
      setCurrentPath([]);
    } else {
      // Clear files immediately when switching directories
      setFiles([]);
      setSubdirectories([]);
      setSelectedDirectory(directory);
      setCurrentPath([]);
      fetchFiles(directory);
    }
  };

  const handleSubdirectoryClick = (subdir) => {
    const newPath = [...currentPath, subdir];
    setCurrentPath(newPath);
    fetchSubdirectory(selectedDirectory, subdir);
  };

  const handleNavigateUp = () => {
    if (currentPath.length === 1) {
      // Go back to parent directory
      setCurrentPath([]);
      fetchFiles(selectedDirectory);
    } else if (currentPath.length > 1) {
      // Navigate up one level
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      const parentSubdir = newPath[newPath.length - 1];
      fetchSubdirectory(selectedDirectory, parentSubdir);
    }
  };

  const getCurrentPathString = () => {
    if (currentPath.length === 0) {
      return selectedDirectory;
    }
    return `${selectedDirectory}/${currentPath.join("/")}`;
  };

  const getFileUrl = (filename) => {
    if (currentPath.length === 0) {
      return `http://localhost:3000/storage/${encodeURIComponent(selectedDirectory)}/${encodeURIComponent(filename)}`;
    }
    // Handle subdirectory paths
    if (selectedDirectory === "images") {
      return `http://localhost:3000/storage/images/${encodeURIComponent(currentPath.join("/"))}/${encodeURIComponent(filename)}`;
    } else if (selectedDirectory === "recordings") {
      return `http://localhost:3000/storage/recordings/${encodeURIComponent(currentPath.join("/"))}/${encodeURIComponent(filename)}`;
    }
    // Fallback for other directories
    return `http://localhost:3000/storage/${encodeURIComponent(selectedDirectory)}/${encodeURIComponent(currentPath.join("/"))}/${encodeURIComponent(filename)}`;
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
            setSubdirectories([]);
            setCurrentPath([]);
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

          {/* Files and Subdirectories in Selected Directory */}
          {selectedDirectory && (
            <div>
              {/* Breadcrumb Navigation */}
              {currentPath.length > 0 && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <button
                    onClick={handleNavigateUp}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.8em",
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.85em", color: "#666" }}>
                    {getCurrentPathString()}
                  </span>
                </div>
              )}

              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: "bold" }}>
                {currentPath.length > 0 ? `Contents of ${getCurrentPathString()}:` : `Contents of ${selectedDirectory}:`}
              </h4>

              {/* Subdirectories */}
              {subdirectories.length > 0 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <h5 style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", fontWeight: "bold", color: "#555" }}>
                    Subdirectories:
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {subdirectories.map(subdir => (
                      <button
                        key={subdir}
                        onClick={() => handleSubdirectoryClick(subdir)}
                        style={{
                          padding: "0.4rem 0.6rem",
                          textAlign: "left",
                          backgroundColor: "#f5f5f5",
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: "0.85em",
                        }}
                      >
                        📁 {subdir}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {files.length > 0 ? (
                <div>
                  <h5 style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", fontWeight: "bold", color: "#555" }}>
                    Files:
                  </h5>
                  <ul style={{ listStyle: "none", padding: 0, maxHeight: "40vh", overflow: "auto", margin: 0 }}>
                    {files.map(filename => (
                      <li key={filename} style={{ marginBottom: "0.5em", wordBreak: "break-all" }}>
                        <a
                          href={getFileUrl(filename)}
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
                </div>
              ) : subdirectories.length === 0 ? (
                <p style={{ color: "#888", fontSize: "0.85em" }}>No files in this directory.</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BackendStorage;

