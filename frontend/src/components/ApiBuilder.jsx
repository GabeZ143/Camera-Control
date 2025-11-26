import { useState, useMemo, useEffect, useRef } from "react";

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
  const initializedFromPropsRef = useRef(false);
  const hasValidBuiltStepRef = useRef(false);
  const initialOperationIdRef = useRef(initialOperationId);
  
  // Update ref when initialOperationId changes
  useEffect(() => {
    initialOperationIdRef.current = initialOperationId;
  }, [initialOperationId]);

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

  // Track if we've initialized from props (only once on mount)
  // This prevents clearing fieldValues that were set via initialValues
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      initializedFromPropsRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - intentionally not including initialValues

  // When verb changes, reset operation + fields
  // But preserve operationId if it's still valid for the new verb
  useEffect(() => {
    // Don't reset if we have initialOperationId and the operation is still valid
    if (initialOperationId && operationId === initialOperationId) {
      const opsForNewVerb = operations.filter((op) => op.verb === verb);
      const opStillValid = opsForNewVerb.some((op) => op.id === initialOperationId);
      if (opStillValid) {
        return; // Keep the operation
      }
    }
    // Otherwise reset
    setOperationId(null);
    setFieldValues({});
    initializedFromPropsRef.current = false;
    hasValidBuiltStepRef.current = false;
  }, [verb]);

  // When operation changes, merge defaults with existing fieldValues
  // This preserves initialValues that were passed in
  useEffect(() => {
    if (!selectedOperation) {
      // If we've initialized from props, don't clear - preserve imported values
      if (initializedFromPropsRef.current) {
        return;
      }
      // Only clear if we truly have no operation and no initial values
      setFieldValues({});
      return;
    }

    // Use functional update to access current fieldValues state
    setFieldValues((prev) => {
      // If we already have values from initialValues, preserve them
      if (initializedFromPropsRef.current && Object.keys(prev).length > 0) {
        // Only add defaults for fields that are missing
        const defaults = {};
        (selectedOperation.fields || []).forEach((field) => {
          if (field.defaultValue !== undefined && prev[field.name] === undefined) {
            defaults[field.name] = field.defaultValue;
          }
        });

        if (Object.keys(defaults).length > 0) {
          return {
            ...prev, // Existing values first (preserve them)
            ...defaults, // Then add defaults for missing fields
          };
        }
        // No changes needed
        return prev;
      }

      // Normal case: merge defaults with existing values
      const defaults = {};
      (selectedOperation.fields || []).forEach((field) => {
        if (field.defaultValue !== undefined && prev[field.name] === undefined) {
          defaults[field.name] = field.defaultValue;
        }
      });

      if (Object.keys(defaults).length > 0) {
        return {
          ...prev,
          ...defaults,
        };
      }

      return prev;
    });

    initializedFromPropsRef.current = true;
  }, [selectedOperation]); // Don't include initialValues - it's a new object on every render

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
  // Store onChange in a ref to avoid dependency issues
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!onChangeRef.current) return;

    if (builtStep !== null) {
      hasValidBuiltStepRef.current = true;
      onChangeRef.current(builtStep);
    } else if (initialOperationIdRef.current === null) {
      // Only send null if we don't have an initialOperationId
      // This prevents clearing imported steps that should have a valid operation
      onChangeRef.current(builtStep);
    }
    // If builtStep is null but we have initialOperationId, don't send null
    // (the operation should be restored soon)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builtStep]); // Only depend on builtStep - use refs for onChange and initialOperationId

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
