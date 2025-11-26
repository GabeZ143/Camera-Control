import { useState, useMemo } from "react";
import { CGI_OPERATIONS } from "../config/cgiOperations";

/**
 * Helper functions for time calculations (no Date objects)
 */

// Parse date string YYYY-MM-DD to {year, month, day}
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

// Parse time string HH:mm to {hours, minutes}
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

// Format to YYYYMMDDhhmmss string
function formatTimestamp(year, month, day, hours, minutes, seconds = 0) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(year)}${pad(month)}${pad(day)}${pad(hours)}${pad(minutes)}${pad(seconds)}`;
}

// Add seconds to a timestamp string (YYYYMMDDhhmmss)
function addSeconds(timestamp, secondsToAdd) {
  const year = parseInt(timestamp.substring(0, 4));
  const month = parseInt(timestamp.substring(4, 6));
  const day = parseInt(timestamp.substring(6, 8));
  const hours = parseInt(timestamp.substring(8, 10));
  const minutes = parseInt(timestamp.substring(10, 12));
  const seconds = parseInt(timestamp.substring(12, 14) || "0");

  // Convert everything to total seconds, add, then convert back
  let totalSeconds = seconds + secondsToAdd;
  let newMinutes = minutes;
  let newHours = hours;
  let newDay = day;
  let newMonth = month;
  let newYear = year;

  // Handle second overflow
  while (totalSeconds >= 60) {
    totalSeconds -= 60;
    newMinutes += 1;
  }
  while (totalSeconds < 0) {
    totalSeconds += 60;
    newMinutes -= 1;
  }

  // Handle minute overflow
  while (newMinutes >= 60) {
    newMinutes -= 60;
    newHours += 1;
  }
  while (newMinutes < 0) {
    newMinutes += 60;
    newHours -= 1;
  }

  // Handle hour overflow
  while (newHours >= 24) {
    newHours -= 24;
    newDay += 1;
  }
  while (newHours < 0) {
    newHours += 24;
    newDay -= 1;
  }

  // Handle day overflow (simplified - assumes max 31 days per month)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  while (newDay > daysInMonth[newMonth - 1]) {
    newDay -= daysInMonth[newMonth - 1];
    newMonth += 1;
  }
  while (newDay < 1) {
    newMonth -= 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    newDay += daysInMonth[newMonth - 1];
  }

  // Handle month overflow
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }
  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }

  return formatTimestamp(newYear, newMonth, newDay, newHours, newMinutes, totalSeconds);
}

// Add minutes to a timestamp string (supports decimal minutes)
function addMinutes(timestamp, minutesToAdd) {
  // Convert minutes to seconds (handles decimals)
  const secondsToAdd = Math.round(minutesToAdd * 60);
  return addSeconds(timestamp, secondsToAdd);
}

// Add hours to a timestamp string
function addHours(timestamp, hoursToAdd) {
  return addMinutes(timestamp, hoursToAdd * 60);
}

// Compare two timestamps (returns -1, 0, or 1)
function compareTimestamps(ts1, ts2) {
  if (ts1 < ts2) return -1;
  if (ts1 > ts2) return 1;
  return 0;
}

// Get all days between start and end date (inclusive)
function getDaysInRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const days = [];

  let current = { ...start };
  
  while (true) {
    const currentDateStr = `${current.year}-${String(current.month).padStart(2, "0")}-${String(current.day).padStart(2, "0")}`;
    const endDateStr = `${end.year}-${String(end.month).padStart(2, "0")}-${String(end.day).padStart(2, "0")}`;
    
    if (currentDateStr > endDateStr) break;
    
    days.push({ ...current });
    
    // Move to next day
    current.day += 1;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (current.day > daysInMonth[current.month - 1]) {
      current.day = 1;
      current.month += 1;
      if (current.month > 12) {
        current.month = 1;
        current.year += 1;
      }
    }
  }
  
  return days;
}

function RecordingAutomation() {
  // Connection state
  const [connection, setConnection] = useState({
    protocol: "http",
    ip: "10.20.2.121",
    port: 80,
    username: "admin",
    password: "admin",
  });

  // Time window
  const [startDate, setStartDate] = useState("2025-11-19");
  const [endDate, setEndDate] = useState("2025-11-26");
  const [startTimeOfDay, setStartTimeOfDay] = useState("00:00");
  const [endTimeOfDay, setEndTimeOfDay] = useState("23:59");

  // Sampling pattern
  const [frequencyMode, setFrequencyMode] = useState("everyNHours");
  const [frequencyValue, setFrequencyValue] = useState(1); // N hours or times per day
  const [clipDuration, setClipDuration] = useState(5);
  const [clipDurationUnit, setClipDurationUnit] = useState("minutes"); // "minutes" or "seconds"

  // Camera settings
  const [cameraID, setCameraID] = useState(1);
  const [streamID, setStreamID] = useState(1);

  // Output
  const [outputAction, setOutputAction] = useState("generateSteps");
  const [storageFolder, setStorageFolder] = useState("");

  // Preview
  const [previewClips, setPreviewClips] = useState([]);

  const handleConnectionChange = (field, value) => {
    setConnection((prev) => ({
      ...prev,
      [field]: field === "port" ? Number(value) || 0 : value,
    }));
  };

  // Generate preview clips based on current settings
  const generatePreviewClips = () => {
    const clips = [];
    const days = getDaysInRange(startDate, endDate);
    const startTime = parseTime(startTimeOfDay);
    const endTime = parseTime(endTimeOfDay);

    // Convert start/end time of day to minutes since midnight
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;

    // Convert clip duration to seconds
    const clipDurationSeconds = clipDurationUnit === "seconds" 
      ? clipDuration 
      : Math.round(clipDuration * 60); // Convert minutes (including decimals) to seconds

    days.forEach((day) => {
      const dayStartTimestamp = formatTimestamp(
        day.year,
        day.month,
        day.day,
        startTime.hours,
        startTime.minutes
      );

      if (frequencyMode === "everyNHours") {
        // Every N hours: generate clips at fixed hourly intervals
        let currentHour = startTime.hours;
        while (currentHour <= 23) {
          const clipStart = formatTimestamp(
            day.year,
            day.month,
            day.day,
            currentHour,
            0
          );
          const clipEnd = addSeconds(clipStart, clipDurationSeconds);

          // Check if clip start is within time window
          const clipStartMinutes = currentHour * 60;
          if (clipStartMinutes < startMinutes) {
            currentHour += frequencyValue;
            continue;
          }

          // Check if clip end is within bounds
          const clipEndTime = parseTime(
            `${clipEnd.substring(8, 10)}:${clipEnd.substring(10, 12)}`
          );
          const clipEndMinutes = clipEndTime.hours * 60 + clipEndTime.minutes;

          if (clipEndMinutes <= endMinutes) {
            clips.push({
              date: `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`,
              startTime: clipStart,
              endTime: clipEnd,
              cameraID,
              streamID,
            });
          } else {
            // Clip end exceeds time window, stop for this day
            break;
          }

          currentHour += frequencyValue;
        }
      } else if (frequencyMode === "timesPerDay") {
        // N times per day: evenly distribute clips throughout the day
        const totalMinutes = endMinutes - startMinutes;
        const intervalMinutes = totalMinutes / frequencyValue;

        for (let i = 0; i < frequencyValue; i++) {
          const offsetMinutes = i * intervalMinutes;
          const clipStart = addMinutes(dayStartTimestamp, offsetMinutes);
          const clipEnd = addSeconds(clipStart, clipDurationSeconds);

          // Check if clip end is within bounds
          const clipEndTime = parseTime(
            `${clipEnd.substring(8, 10)}:${clipEnd.substring(10, 12)}`
          );
          const clipEndMinutes = clipEndTime.hours * 60 + clipEndTime.minutes;

          if (clipEndMinutes <= endMinutes) {
            clips.push({
              date: `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`,
              startTime: clipStart,
              endTime: clipEnd,
              cameraID,
              streamID,
            });
          }
        }
      }
      // Note: Only "everyNHours" and "timesPerDay" modes are supported
    });

    setPreviewClips(clips);
  };

  // Generate API Builder steps from preview clips
  const generateSteps = () => {
    // Get the record.playback operation from CGI_OPERATIONS
    const playbackOperation = CGI_OPERATIONS.find(
      (op) => op.id === "record.playback"
    );

    if (!playbackOperation) {
      console.error("record.playback operation not found in CGI_OPERATIONS");
      return [];
    }

    const steps = previewClips.map((clip) => {
      // Build query starting with fixed params
      const query = {
        ...(playbackOperation.fixedParams || {}),
      };

      // Add field values from clip data
      (playbackOperation.fields || []).forEach((field) => {
        if (field.name === "cameraID") {
          query[field.name] = clip.cameraID;
        } else if (field.name === "streamID") {
          query[field.name] = clip.streamID;
        } else if (field.name === "startTime") {
          query[field.name] = clip.startTime;
        } else if (field.name === "endTime") {
          query[field.name] = clip.endTime;
        } else if (field.defaultValue !== undefined) {
          // Use default value if available
          query[field.name] = field.defaultValue;
        }
      });

      return {
        verb: playbackOperation.verb,
        operationId: playbackOperation.id,
        label: `${playbackOperation.label} - ${clip.startTime} to ${clip.endTime}`,
        cgiPath: playbackOperation.cgiPath,
        method: playbackOperation.method,
        query,
        saveToStorage: outputAction === "runNow",
      };
    });

    return steps;
  };

  const handleGeneratePreview = () => {
    generatePreviewClips();
  };

  const handleGenerateSteps = () => {
    if (previewClips.length === 0) {
      alert("Please generate preview first");
      return;
    }

    const steps = generateSteps();
    const exportData = {
      steps,
      version: "1.0",
      exportedAt: new Date().toISOString(),
      metadata: {
        startDate,
        endDate,
        startTimeOfDay,
        endTimeOfDay,
        frequencyMode,
        frequencyValue,
        clipDuration,
        clipDurationUnit,
        cameraID,
        streamID,
        totalClips: previewClips.length,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recording-automation-${startDate}-${endDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format timestamp for display (YYYYMMDDhhmmss -> YYYY-MM-DD HH:mm:ss)
  const formatTimestampForDisplay = (timestamp) => {
    return `${timestamp.substring(0, 4)}-${timestamp.substring(4, 6)}-${timestamp.substring(6, 8)} ${timestamp.substring(8, 10)}:${timestamp.substring(10, 12)}:${timestamp.substring(12, 14)}`;
  };

  // Calculate duration between two timestamps (returns seconds)
  const calculateDuration = (start, end) => {
    const startHours = parseInt(start.substring(8, 10));
    const startMinutes = parseInt(start.substring(10, 12));
    const startSeconds = parseInt(start.substring(12, 14) || "0");

    const endHours = parseInt(end.substring(8, 10));
    const endMinutes = parseInt(end.substring(10, 12));
    const endSeconds = parseInt(end.substring(12, 14) || "0");

    // Calculate total seconds
    const startTotalSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
    const endTotalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;
    return endTotalSeconds - startTotalSeconds;
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Recording Automation</h1>

      {/* Connection Section */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Connection</h2>

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

      {/* Recording Time Window */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Recording Time Window</h2>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Start Date:&nbsp;
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            End Date:&nbsp;
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Start Time of Day:&nbsp;
            <input
              type="time"
              value={startTimeOfDay}
              onChange={(e) => setStartTimeOfDay(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            End Time of Day:&nbsp;
            <input
              type="time"
              value={endTimeOfDay}
              onChange={(e) => setEndTimeOfDay(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Sampling Pattern */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Sampling Pattern</h2>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            <input
              type="radio"
              value="everyNHours"
              checked={frequencyMode === "everyNHours"}
              onChange={(e) => setFrequencyMode(e.target.value)}
            />
            &nbsp;Every N hours
          </label>
        </div>

        {frequencyMode === "everyNHours" && (
          <div style={{ marginBottom: "0.5rem", marginLeft: "1.5rem" }}>
            <label>
              Every:&nbsp;
              <input
                type="number"
                min="1"
                value={frequencyValue}
                onChange={(e) => setFrequencyValue(Number(e.target.value) || 1)}
                style={{ width: "60px" }}
              />
              &nbsp;hour(s)
            </label>
          </div>
        )}

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            <input
              type="radio"
              value="timesPerDay"
              checked={frequencyMode === "timesPerDay"}
              onChange={(e) => setFrequencyMode(e.target.value)}
            />
            &nbsp;Times per day (evenly spaced)
          </label>
        </div>

        {frequencyMode === "timesPerDay" && (
          <div style={{ marginBottom: "0.5rem", marginLeft: "1.5rem" }}>
            <label>
              Times per day:&nbsp;
              <input
                type="number"
                min="1"
                value={frequencyValue}
                onChange={(e) => setFrequencyValue(Number(e.target.value) || 1)}
                style={{ width: "60px" }}
              />
            </label>
          </div>
        )}

        <div style={{ marginBottom: "0.5rem", marginTop: "1rem" }}>
          <label>
            Clip Duration:&nbsp;
            <input
              type="number"
              min="0.1"
              step={clipDurationUnit === "seconds" ? "1" : "0.1"}
              value={clipDuration}
              onChange={(e) => setClipDuration(Number(e.target.value) || 0.1)}
              style={{ width: "80px" }}
            />
            &nbsp;
            <select
              value={clipDurationUnit}
              onChange={(e) => setClipDurationUnit(e.target.value)}
            >
              <option value="seconds">seconds</option>
              <option value="minutes">minutes</option>
            </select>
          </label>
          <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem", marginLeft: "0.5rem" }}>
            {clipDurationUnit === "minutes" && "Supports decimals (e.g., 1.5 minutes)"}
            {clipDurationUnit === "seconds" && "Whole seconds only"}
          </div>
        </div>
      </div>

      {/* Camera Settings */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Camera Settings</h2>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Camera ID:&nbsp;
            <input
              type="number"
              min="1"
              value={cameraID}
              onChange={(e) => setCameraID(Number(e.target.value) || 1)}
              style={{ width: "60px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Stream ID:&nbsp;
            <input
              type="number"
              min="1"
              value={streamID}
              onChange={(e) => setStreamID(Number(e.target.value) || 1)}
              style={{ width: "60px" }}
            />
          </label>
        </div>
      </div>

      {/* Output */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2>Output</h2>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            <input
              type="radio"
              value="generateSteps"
              checked={outputAction === "generateSteps"}
              onChange={(e) => setOutputAction(e.target.value)}
            />
            &nbsp;Generate steps and open in API Builder
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            <input
              type="radio"
              value="runNow"
              checked={outputAction === "runNow"}
              onChange={(e) => setOutputAction(e.target.value)}
            />
            &nbsp;Run now and store recordings on backend
          </label>
        </div>

        {outputAction === "runNow" && (
          <div style={{ marginBottom: "0.5rem", marginLeft: "1.5rem" }}>
            <label>
              Storage Folder/Tag:&nbsp;
              <input
                type="text"
                value={storageFolder}
                onChange={(e) => setStorageFolder(e.target.value)}
                placeholder="e.g., test_batch_2025_11_19_26"
                style={{ width: "300px" }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Preview */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h2 style={{ margin: 0 }}>Preview</h2>
          <button onClick={handleGeneratePreview}>Generate Preview</button>
        </div>

        {previewClips.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <p>
              <strong>Total Clips: {previewClips.length}</strong>
            </p>
            <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ddd", borderRadius: 4 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
                    <th style={{ padding: "0.5rem", border: "1px solid #ddd", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "0.5rem", border: "1px solid #ddd", textAlign: "left" }}>Start Time</th>
                    <th style={{ padding: "0.5rem", border: "1px solid #ddd", textAlign: "left" }}>End Time</th>
                    <th style={{ padding: "0.5rem", border: "1px solid #ddd", textAlign: "left" }}>Duration</th>
                    <th style={{ padding: "0.5rem", border: "1px solid #ddd", textAlign: "left" }}>Camera ID</th>
                  </tr>
                </thead>
                <tbody>
                  {previewClips.map((clip, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{clip.date}</td>
                      <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{formatTimestampForDisplay(clip.startTime)}</td>
                      <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{formatTimestampForDisplay(clip.endTime)}</td>
                      <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{formatDuration(calculateDuration(clip.startTime, clip.endTime))}</td>
                      <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{clip.cameraID}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {previewClips.length === 0 && (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            Click "Generate Preview" to see the list of clips that will be created.
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button onClick={handleGenerateSteps} disabled={previewClips.length === 0}>
          Generate Steps (Export JSON)
        </button>
        {outputAction === "runNow" && (
          <button disabled style={{ opacity: 0.5 }}>
            Run Now (Coming in Phase 2)
          </button>
        )}
      </div>
    </div>
  );
}

export default RecordingAutomation;

