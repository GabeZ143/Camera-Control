import CameraApiBuilder from "./components/CameraApiBuilder";
import FirmwareUpload from "./components/FirmwareUpload";
import BackendStorage from "./components/BackendStorage";

function App() {
  return (
    <>
      <BackendStorage />
      <CameraApiBuilder />
      <FirmwareUpload />
    </>
  );
}

export default App;
