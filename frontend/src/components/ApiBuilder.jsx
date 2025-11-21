import { useState, useMemo, useEffect } from "react";

/**
 * ApiBuilder
 *
 * Props:
 * - operations: array of operation defs (e.g. SUNELL_OPERATIONS)
 * - initialVerb: string (optional, default "get")
 * - initialOperationId: string | null (optional)
 * - initialValues: object of { [fieldName]: value } (optional)
 * - onChange: function(builtStep | null) called whenever internal state changes
 *
 * builtStep shape (what you get from onChange):
 * {
 *   verb,
 *   operationId,
 *   label,
 *   cgiPath,
 *   method,
 *   query: { ...fixedParams, ...fieldValues }
 * }
 */
export function ApiBuilder({
  operations,
  initialVerb = "get",
  initialOperationId = null,
  initialValues = {},
  onChange,
}) {
  const [verb, setVerb] = useState(initialVerb);
  const [operationId, setOperationId] = useState(initialOperationId);
  const [fieldValues, setFieldValues] = useState(initialValues);

  // Filter operations by current verb
  const operationsForVerb = useMemo(
    () => operations.filter((op) => op.verb === verb),
    [operations, verb]
  );

  // Resolve currently selected operation
  const selectedOperation = useMemo(
    () => operationsForVerb.find((op) => op.id === operationId) || null,
    [operationsForVerb, operationId]
  );

  // When verb changes, reset operation + fields
  useEffect(() => {
    setOperationId(null);
    setFieldValues({});
  }, [verb]);

  // When operation changes, reset fieldValues and pre-fill defaults
  useEffect(() => {
    if (!selectedOperation) {
      setFieldValues({});
      return;
    }

    const defaults = {};
    (selectedOperation.fields || []).forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      }
    });
    setFieldValues(defaults);
  }, [selectedOperation]);

  // Build the object that parent cares about
  const builtStep = useMemo(() => {
    if (!selectedOperation) return null;

    return {
      verb,
      operationId: selectedOperation.id,
      label: selectedOperation.label,
      cgiPath: selectedOperation.cgiPath,
      method: selectedOperation.method,
      // Combine fixed params with user-entered values
      query: {
        ...(selectedOperation.fixedParams || {}),
        ...fieldValues,
      },
    };
  }, [verb, selectedOperation, fieldValues]);

  // Notify parent whenever the built step changes
  useEffect(() => {
    if (onChange) {
      onChange(builtStep);
    }
  }, [builtStep]);

  const handleFieldChange = (name, value) => {
    setFieldValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <h2 style={{ marginTop: 0 }}>API Builder</h2>

      {/* Step 1: Verb selector */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label>
          Verb:&nbsp;
          <select
            value={verb}
            onChange={(e) => setVerb(e.target.value)}
          >
            <option value="get">Get</option>
            <option value="set">Set</option>
            <option value="operate">Operate</option>
            <option value="stream">Stream</option>
            <option value="test">Test</option>
          </select>
        </label>
      </div>

      {/* Step 2: Operation selector (filtered by verb) */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label>
          Operation:&nbsp;
          <select
            value={operationId || ""}
            onChange={(e) => setOperationId(e.target.value || null)}
          >
            <option value="">-- choose operation --</option>
            {operationsForVerb.map((op) => (
              <option key={op.id} value={op.id}>
                {op.group ? `[${op.group}] ` : ""}
                {op.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Step 3: Dynamic fields for this operation */}
      {selectedOperation && (
        <div style={{ marginBottom: "0.75rem" }}>
          <h4 style={{ margin: "0.5rem 0" }}>Parameters</h4>
          {(selectedOperation.fields || []).length === 0 && (
            <p style={{ fontSize: "0.9rem", color: "#555" }}>
              This operation has no parameters.
            </p>
          )}

          {(selectedOperation.fields || []).map((field) => (
            <div key={field.name} style={{ marginBottom: "0.5rem" }}>
              <label>
                {field.label}
                {field.required && <span style={{ color: "red" }}>*</span>}
                <br />
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={
                    fieldValues[field.name] ?? field.defaultValue ?? ""
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      field.name,
                      field.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value
                    )
                  }
                  placeholder={field.placeholder || ""}
                  style={{ width: "100%", maxWidth: 300 }}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Summary */}
      <div>
        <h4 style={{ margin: "0.5rem 0" }}>Summary</h4>
        {!builtStep && (
          <p style={{ fontSize: "0.9rem", color: "#777" }}>
            Choose a verb and operation to see summary.
          </p>
        )}
        {builtStep && (
          <pre
            style={{
              background: "#f5f5f5",
              padding: "0.75rem",
              borderRadius: 4,
              fontSize: "0.8rem",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
{JSON.stringify(builtStep, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
