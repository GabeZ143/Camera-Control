import { useState, useRef } from "react";

function FirmwareUpload() {
  const [firmwareFile, setFirmwareFile] = useState(null);
  const [firmwareUploading, setFirmwareUploading] = useState(false);
  const [firmwareError, setFirmwareError] = useState(null);
  const [firmwareSuccess, setFirmwareSuccess] = useState(null);
  const fileInputRef = useRef(null);

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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
            ref={fileInputRef}
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
    </div>
  );
}

export default FirmwareUpload;

