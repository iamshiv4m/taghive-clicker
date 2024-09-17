import { useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function Hello() {
  const [eventNum, setEventNum] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');

  const initializeClickerSdk = (): void => {
    if (!window?.electron?.clickerSDK) {
      console.error('ClickerSDK is not available.');
      return;
    }

    try {
      window.electron.clickerSDK
        .checkPortsAndListen()
        .then((ports: { vendorId?: string }[]) => {
          console.log('ports: ', ports);
          if (!ports.length) {
            console.warn('No ports found to listen to.');
            return;
          }

          ports.forEach((port) => {
            if (!port.vendorId) return;
            console.log('port.vendorId: ', port.vendorId);

            window.electron.clickerSDK.listenClickerEventSdk(
              (eventNum: number, deviceId: string) => {
                console.log('deviceId: ', deviceId);
                console.log('eventNum: ', eventNum);
                const formattedMacAddress = deviceId
                  ?.split(':')
                  ?.reverse()
                  ?.join(':')
                  ?.toUpperCase();
                setDeviceId(formattedMacAddress);
                setEventNum(eventNum?.toString());
                console.log(formattedMacAddress, 'formattedMacAddress');
              },
            );
          });
        })
        .catch((error: any) => {
          console.error(
            'Error while checking ports or starting to listen:',
            error,
          );
        });
    } catch (error: any) {
      console.error('Error initializing Clicker SDK:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success('Copied to clipboard!');
      },
      (err) => {
        console.error('Could not copy text:', err);
        toast.error('Failed to copy!');
      },
    );
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="Hello">
        <img
          width="200"
          alt="icon"
          src={
            'https://static.pw.live/5eb393ee95fab7468a79d189/dcc477eb-193c-4e43-9c45-addc22698493.webp'
          }
        />
      </div>
      <h1>FOR only QA Purpose</h1>
      <div className="Hello">
        <button type="button" onClick={initializeClickerSdk}>
          <span role="img" aria-label="books">
            📚
          </span>
          Click Me
        </button>
      </div>
      <h1>Event Number: {eventNum}</h1>
      <h2>
        Device ID:
        <span
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => copyToClipboard(deviceId)}
          title="Click to copy"
        >
          {deviceId}
        </span>
      </h2>
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
