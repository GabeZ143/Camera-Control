import { useState, useRef, useEffect } from "react";
import { ApiBuilder } from "./ApiBuilder";
import { CGI_OPERATIONS } from "../config/cgiOperations";

function CameraApiBuilder() {
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log("Current steps", steps);
  }, [steps]);

  // Helper function to extract field values from a builtStep's query
  // by removing fixed params that come from the operation definition
  const extractFieldValues = (builtStep) => {
    if (!builtStep || !builtStep.query) return {};

    // Find the operation to get its fixed params
    const operation = CGI_OPERATIONS.find(
      (op) => op.id === builtStep.operationId && op.verb === builtStep.verb
    );

    if (!operation) {
      // If operation not found, return the query as-is (fallback)
      return builtStep.query;
    }

    // Remove fixed params to get only user-editable field values
    const fixedParams = operation.fixedParams || {};
    const fieldValues = { ...builtStep.query };
    
    Object.keys(fixedParams).forEach((key) => {
      delete fieldValues[key];
    });

    return fieldValues;
  };

  const addStep = () => {
    console.log("Adding step");
    setSteps((prev) => [
      ...prev,
      { id: Date.now(), builtStep: null }, // simple unique id
    ]);
  };

  const removeStep = (id) => {
    console.log("Removing step", id);
    setSteps((prev) => prev.filter((step) => step.id !== id));
  };

  const handleStepChange = (id, builtStep) => {
    console.log("Step changed", id, builtStep);
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

  const handleExport = () => {
    const exportData = {
      steps: steps.map((s) => s.builtStep).filter((s) => s != null),
      version: "1.0",
      exportedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `camera-api-builder-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate the imported data structure
      if (!importData.steps || !Array.isArray(importData.steps)) {
        setError("Invalid import file: missing or invalid steps array");
        return;
      }

      // Restore steps - create new IDs for each step
      const baseId = Date.now();
      const importedSteps = importData.steps.map((builtStep, index) => ({
        id: baseId + index,
        builtStep: builtStep,
      }));

      // If no valid steps, create at least one empty step
      if (importedSteps.length === 0) {
        setSteps([{ id: baseId, builtStep: null }]);
        console.log("No valid steps, created one empty step");
      } else {
        // Update state with imported steps
        console.log("Imported steps:", importedSteps);
        setSteps(importedSteps);
      }

      // Clear any previous errors
      setError(null);
      setBundleResult(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Import error:", err);
      setError(`Failed to import: ${err.message || "Invalid JSON file"}`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Camera API Builder</h1>

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
            key={step.id}
            operations={CGI_OPERATIONS}
            initialVerb={step.builtStep?.verb || "get"}
            initialOperationId={step.builtStep?.operationId || null}
            initialValues={extractFieldValues(step.builtStep)}
            onChange={(builtStep) => handleStepChange(step.id, builtStep)}
          />
        </div>
      ))}

      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={addStep}>
          + Add Step
        </button>

        <button onClick={handleRunBundle}>
          Run Bundle
        </button>

        <button onClick={handleExport} style={{ marginLeft: "0.5rem" }}>
          Export Steps
        </button>

        <button onClick={handleImportClick}>
          Import Steps
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: "none" }}
        />
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

export default CameraApiBuilder;

