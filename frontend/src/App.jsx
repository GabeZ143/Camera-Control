import CameraApiBuilder from "./components/CameraApiBuilder";
import FirmwareUpload from "./components/FirmwareUpload";
import BackendStorage from "./components/BackendStorage";
import RecordingAutomation from "./components/RecordingAutomation";

function App() {
  return (
    <>
      <BackendStorage />
      <CameraApiBuilder />
      <RecordingAutomation />
      <FirmwareUpload />
    </>
  );
}

export default App;
