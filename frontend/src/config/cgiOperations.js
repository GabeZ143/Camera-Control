export const CGI_OPERATIONS = [
  // =========================
  // 1) param.cgi - Config / Status
  // =========================

  {
    id: "param.getDeviceInfo",
    group: "Config",
    verb: "get",
    label: "Get Device Info",
    cgiPath: "/cgi-bin/param.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "deviceInfo" },
    fields: [],
  },

  {
    id: "param.setDeviceName",
    group: "Config",
    verb: "set",
    label: "Set Device Name",
    cgiPath: "/cgi-bin/param.cgi",
    method: "GET",
    fixedParams: { action: "set", type: "deviceInfo" },
    fields: [
      {
        name: "deviceName",
        label: "Device Name",
        type: "text",
        required: true,
      },
    ],
  },

  {
    id: "param.getLocalNetwork",
    group: "Config",
    verb: "get",
    label: "Get Local Network",
    cgiPath: "/cgi-bin/param.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "localNetwork" },
    fields: [
        {name: "IPProtoVer", label: "IP Protocol", type: "number", required: true, defaultValue: 1},
        {name: "netCardId", label: "Network Card ID", type: "number", required: true, defaultValue: 1}],
  },

  {
    id: "param.setLocalNetworkIPType",
    group: "Config",
    verb: "set",
    label: "Set Local Network IP Type",
    cgiPath: "/cgi-bin/param.cgi",
    method: "GET",
    fixedParams: { action: "set", type: "localNetwork" },
    fields: [
      {
        name: "IPType",
        label: "IP Type (0=Static?)",
        type: "number",
        required: true,
        defaultValue: 0,
      },
    ],
  },

  {
    id: "param.getNTP",
    group: "Config",
    verb: "get",
    label: "Get NTP Settings",
    cgiPath: "/cgi-bin/param.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "NTP" },
    fields: [],
  },

  {
    id: "param.setNTP",
    group: "Config",
    verb: "set",
    label: "Set NTP Settings",
    cgiPath: "/cgi-bin/param.cgi",
    method: "GET",
    fixedParams: { action: "set", type: "NTP" },
    fields: [
      // You can add specific fields here once you know them
      // For now, you could leave this empty and use an "advanced params" area.
    ],
  },

  // You can add more param.cgi types similarly:
  // HTTPS, OSD, motionDetect, peopleCounting, heatMap, etc.
  // Many of them are "get/set + no extra params" so fields: [] is fine.

  // =========================
  // 2) ptz.cgi - PTZ Control
  // =========================

  {
    id: "ptz.getCapabilities",
    group: "PTZ",
    verb: "get",
    label: "Get PTZ Capabilities",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "ptzCap" },
    fields: [
      {
        name: "cameraID",
        label: "Camera ID",
        type: "number",
        required: true,
        defaultValue: 1,
      },
    ],
  },

  // Basic PTZ moves
  {
    id: "ptz.up",
    group: "PTZ",
    verb: "operate",
    label: "Move Up",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "up" },
    fields: [
      {
        name: "cameraID",
        label: "Camera ID",
        type: "number",
        required: true,
        defaultValue: 1,
      },
    ],
  },

  {
    id: "ptz.down",
    group: "PTZ",
    verb: "operate",
    label: "Move Down",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "down" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  {
    id: "ptz.left",
    group: "PTZ",
    verb: "operate",
    label: "Move Left",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "left" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  {
    id: "ptz.right",
    group: "PTZ",
    verb: "operate",
    label: "Move Right",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "right" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  {
    id: "ptz.stop",
    group: "PTZ",
    verb: "operate",
    label: "Stop Movement",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "stop" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  // Zoom
  {
    id: "ptz.zoomTele",
    group: "PTZ",
    verb: "operate",
    label: "Zoom Tele",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "zoomTele" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  {
    id: "ptz.zoomWide",
    group: "PTZ",
    verb: "operate",
    label: "Zoom Wide",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "zoomWide" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  // Rotate with pan/tilt/zoom
  {
    id: "ptz.rotate",
    group: "PTZ",
    verb: "operate",
    label: "Rotate (pan/tilt/zoom)",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "rotate" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "pan", label: "Pan", type: "number", required: true },
      { name: "tilt", label: "Tilt", type: "number", required: true },
      { name: "z", label: "Zoom", type: "number", required: true },
      { name: "timeInterval", label: "Time Interval", type: "number", required: true },
    ],
  },

  // Presets (you can add more like presetDelete/listPreset later)
  {
    id: "ptz.presetAdd",
    group: "PTZ",
    verb: "operate",
    label: "Preset: Add",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "presetAdd" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "presetID", label: "Preset ID", type: "number", required: true },
      { name: "presetName", label: "Preset Name", type: "text", required: true },
    ],
  },

  {
    id: "ptz.presetInvoke",
    group: "PTZ",
    verb: "operate",
    label: "Preset: Invoke",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "presetInvoke" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "presetID", label: "Preset ID", type: "number", required: true },
    ],
  },

  {
    id: "ptz.listPreset",
    group: "PTZ",
    verb: "get",
    label: "Preset: List",
    cgiPath: "/cgi-bin/ptz.cgi",
    method: "GET",
    fixedParams: { action: "listPreset" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  // =========================
  // 3) record.cgi - Recording
  // =========================

  {
    id: "record.queryByTime",
    group: "Recording",
    verb: "get",
    label: "Query Recordings by Time",
    cgiPath: "/cgi-bin/record.cgi",
    method: "GET",
    fixedParams: { action: "query" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      {
        name: "startTime",
        label: "Start Time",
        type: "text",
        required: true,
        placeholder: "YYYYMMDDhhmmss",
      },
      {
        name: "endTime",
        label: "End Time",
        type: "text",
        required: true,
        placeholder: "YYYYMMDDhhmmss",
      },
    ],
  },

  {
    id: "record.playback",
    group: "Recording",
    verb: "operate",
    label: "Playback Recording (by time)",
    cgiPath: "/cgi-bin/record.cgi",
    method: "GET",
    fixedParams: { action: "playBack" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: false, defaultValue: 1 },
      { name: "startTime", label: "Start Time", type: "text", required: false },
      { name: "endTime", label: "End Time", type: "text", required: false },
    ],
  },

  // =========================
  // 4) image.cgi - Snapshots
  // =========================

  {
    id: "image.snapshot",
    group: "Snapshot",
    verb: "get",
    label: "Snapshot (image.cgi)",
    cgiPath: "/cgi-bin/image.cgi",
    method: "GET",
    fixedParams: {},
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "quality", label: "Quality (1-10)", type: "number", required: true, defaultValue: 5 },
    ],
  },

  {
    id: "image.snapStream",
    group: "Snapshot",
    verb: "get",
    label: "Snapshot from Stream",
    cgiPath: "/cgi-bin/image.cgi",
    method: "GET",
    fixedParams: { type: "snap" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "streamID", label: "Stream ID", type: "number", required: true, defaultValue: 1 },
      { name: "quality", label: "Quality", type: "number", required: true, defaultValue: 5 },
    ],
  },

  // =========================
  // 5) video.cgi - Live Video
  // =========================

  {
    id: "video.rtsp",
    group: "Video",
    verb: "stream",
    label: "RTSP Stream URL",
    cgiPath: "/cgi-bin/video.cgi",
    method: "GET",
    fixedParams: { type: "RTSP" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "streamID", label: "Stream ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  {
    id: "video.http",
    group: "Video",
    verb: "stream",
    label: "HTTP Stream URL",
    cgiPath: "/cgi-bin/video.cgi",
    method: "GET",
    fixedParams: { type: "HTTP" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", required: true, defaultValue: 1 },
      { name: "streamID", label: "Stream ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  // =========================
  // 6) alarm.cgi - Alarm
  // =========================

  {
    id: "alarm.getCurrentStatus",
    group: "Alarm",
    verb: "get",
    label: "Get Current Alarm Status",
    cgiPath: "/cgi-bin/alarm.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "currentAlarmStatus" },
    fields: [],
  },

  {
    id: "alarm.attach",
    group: "Alarm",
    verb: "operate",
    label: "Attach Alarm Stream",
    cgiPath: "/cgi-bin/alarm.cgi",
    method: "GET",
    fixedParams: { action: "attach" },
    fields: [],
  },

  {
    id: "alarm.manual",
    group: "Alarm",
    verb: "operate",
    label: "Manual Alarm",
    cgiPath: "/cgi-bin/alarm.cgi",
    method: "GET",
    fixedParams: { action: "manual" },
    fields: [
      { name: "alarmInID", label: "Alarm In ID", type: "number", required: true },
      { name: "alarmFlag", label: "Alarm Flag", type: "number", required: true },
      { name: "AlarmSourceType", label: "Alarm Source Type", type: "number", required: true },
    ],
  },

  // =========================
  // 7) sensor.cgi - Sensor / Lens
  // =========================

  {
    id: "sensor.getZoomFocus",
    group: "Sensor",
    verb: "get",
    label: "Get Zoom/Focus",
    cgiPath: "/cgi-bin/sensor.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "zoomFocus" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", defaultValue: 1, required: true },
    ],
  },

  {
    id: "sensor.setZoomFocus",
    group: "Sensor",
    verb: "set",
    label: "Set Zoom/Focus",
    cgiPath: "/cgi-bin/sensor.cgi",
    method: "GET",
    fixedParams: { action: "set", type: "zoomFocus" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", defaultValue: 1, required: true },
      { name: "Zoom", label: "Zoom", type: "number", required: true },
      { name: "Focus", label: "Focus", type: "number", required: true },
    ],
  },

  // (and similarly for whiteBalance, falseColor, etc.)

  // =========================
  // 8) audio.cgi - Audio
  // =========================

  {
    id: "audio.recv",
    group: "Audio",
    verb: "stream",
    label: "Receive Audio",
    cgiPath: "/cgi-bin/audio.cgi",
    method: "GET",
    fixedParams: { action: "recv" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", defaultValue: 1, required: true },
      { name: "streamID", label: "Stream ID", type: "number", defaultValue: 1, required: true },
      { name: "EncoderType", label: "Encoder Type", type: "text", defaultValue: "G.711" },
    ],
  },

  {
    id: "audio.play",
    group: "Audio",
    verb: "stream",
    label: "Play Audio",
    cgiPath: "/cgi-bin/audio.cgi",
    method: "GET",
    fixedParams: { action: "play" },
    fields: [
      { name: "cameraID", label: "Camera ID", type: "number", defaultValue: 1, required: true },
      { name: "EncoderType", label: "Encoder Type", type: "text", defaultValue: "G.711" },
    ],
  },

  // =========================
  // 9) upgrade.cgi - Upgrade
  // =========================

  {
    id: "upgrade.getUpdateStatus",
    group: "Upgrade",
    verb: "get",
    label: "Get Update Status",
    cgiPath: "/cgi-bin/upgrade.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "UpdateStatus" },
    fields: [
      { name: "FlashSpace", label: "Flash Space", type: "number", required: false },
    ],
  },

  {
    id: "upgrade.getUpdateOver",
    group: "Upgrade",
    verb: "get",
    label: "Get Update Over",
    cgiPath: "/cgi-bin/upgrade.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "UpdateOver" },
    fields: [],
  },

  // =========================
  // 10) system.cgi - System
  // =========================

  {
    id: "system.testNTP",
    group: "System",
    verb: "test",
    label: "Test NTP",
    cgiPath: "/cgi-bin/system.cgi",
    method: "GET",
    fixedParams: { action: "test", type: "NTP" },
    fields: [
      { name: "NtpServer", label: "NTP Server", type: "text", defaultValue: "ntp.aliyun.com" },
      { name: "NtpPort", label: "NTP Port", type: "number", defaultValue: 123 },
      { name: "NtpTimeDiff", label: "Time Diff", type: "number", defaultValue: 60 },
      { name: "NtpTimeOut", label: "Timeout", type: "number", defaultValue: 5 },
    ],
  },

  // =========================
  // 11) network.cgi - Network
  // =========================

  {
    id: "network.getLocalNetwork",
    group: "Network",
    verb: "get",
    label: "Get Local Network",
    cgiPath: "/cgi-bin/network.cgi",
    method: "GET",
    fixedParams: { action: "get", type: "localNetwork" },
    fields: [],
  },

  {
    id: "network.setLocalNetworkIPType",
    group: "Network",
    verb: "set",
    label: "Set Local Network IP Type",
    cgiPath: "/cgi-bin/network.cgi",
    method: "GET",
    fixedParams: { action: "set", type: "localNetwork" },
    fields: [
      { name: "IPType", label: "IP Type", type: "number", required: true, defaultValue: 0 },
    ],
  },

  // =========================
  // 12) operate.cgi - Device Ops
  // =========================

  {
    id: "operate.deviceReset",
    group: "Operate",
    verb: "operate",
    label: "Device Reset (factory-ish)",
    cgiPath: "/cgi-bin/operate.cgi",
    method: "GET",
    fixedParams: { action: "deviceReset" },
    fields: [],
  },

  {
    id: "operate.deviceRestart",
    group: "Operate",
    verb: "operate",
    label: "Device Restart",
    cgiPath: "/cgi-bin/operate.cgi",
    method: "GET",
    fixedParams: { action: "deviceRestart" },
    fields: [],
  },

  {
    id: "operate.timingRestart",
    group: "Operate",
    verb: "operate",
    label: "Timing Restart",
    cgiPath: "/cgi-bin/operate.cgi",
    method: "GET",
    fixedParams: { action: "timingRestart" },
    fields: [
      { name: "timingRestartTime", label: "Restart Time (HH:MM:SS)", type: "text", required: true, defaultValue: "03:00:00" },
    ],
  },

  {
    id: "operate.formatDisk",
    group: "Operate",
    verb: "operate",
    label: "Format Disk",
    cgiPath: "/cgi-bin/operate.cgi",
    method: "GET",
    fixedParams: { action: "format" },
    fields: [
      { name: "diskID", label: "Disk ID", type: "number", required: true, defaultValue: 1 },
    ],
  },

  {
    id: "operate.deviceDefault",
    group: "Operate",
    verb: "operate",
    label: "Restore Default",
    cgiPath: "/cgi-bin/operate.cgi",
    method: "GET",
    fixedParams: { action: "default" },
    fields: [
      { name: "defaultType", label: "Default Type", type: "number", required: true, defaultValue: 0 },
    ],
  },

  // You can continue: exportConfig, importConfig, remoteReboot, remoteUpgrade, etc.

];
