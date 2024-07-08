import { useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';

function Hello() {
  const [eventNum, setEventNum] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  const startSDK = () => {
    console.log(window.electron.clickerSDK, 'check window');
    window.electron.clickerSDK.initSDK();

    window.electron.clickerSDK.checkPortsAndListen().then((ports: any) => {
      for (const port of ports) {
        if (!port.vendorId) {
          continue;
        }

        window.electron.clickerSDK.listenClickerEventSdk(
          (eventNum: any, deviceId: any) => {
            console.log(eventNum, 'eventNum');
            console.log(deviceId, 'deviceId');
            setEventNum(eventNum);
            setDeviceId(deviceId);
          },
        );

        console.log(
          window.electron.clickerSDK.listenClickerEventSdk,
          'remoteControl',
        );
      }
      console.log('ports: ', ports);
    });
  };

  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        <button type="button" onClick={startSDK}>
          <span role="img" aria-label="books">
            📚
          </span>
          SDK Taghive Clicker
        </button>
      </div>
      <h1>Event Number: {eventNum}</h1>
      <h2>Device ID: {deviceId}</h2>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
