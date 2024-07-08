const ElectronService = require("electron");
const { Subject } = require("rxjs");

class RemoteControlService {
  constructor() {
    this.events = new Subject();
    this._receivedBuffer;
    this.isListening = false;
  }

  open() {
    if (!checkElectronValidity()) return false;
    if (!this.isListening) {
      this.isListening = true;
      ElectronService.ipcRenderer.on("serialport", (event, data) => {
        onSerialPortData(this.events, this._receivedBuffer, event, data);
      });
    }
    ElectronService.ipcRenderer.send("serialport", { type: "open" });
    this._receivedBuffer = Buffer.alloc(0);
    return true;
  }

  close() {
    if (!checkElectronValidity()) return false;
    ElectronService.ipcRenderer.send("serialport", { type: "close" });
    this._receivedBuffer = Buffer.alloc(0);
    return true;
  }

  subscribeEvents(callbackArg) {
    if (this.subscription) {
      unsubscribeEvents();
    }
    this.subscription = this.events.subscribe((data) => callbackArg(data));
  }

  unsubscribeEvents() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  startRegister(classNumber, number, registrationKey) {
    console.log(classNumber, number, registrationKey, "HERREEE");
    if (!checkElectronValidity()) return false;
    ElectronService.ipcRenderer.send("serialport", {
      type: "write",
      payload: [
        0x02,
        0x07,
        classNumber,
        number,
        0x10,
        0x01,
        registrationKey,
        0x1e,
        0x03,
        0x0d,
      ],
    });
    return true;
  }

  finishRegister() {
    if (!checkElectronValidity()) return false;
    ElectronService.ipcRenderer.send("serialport", {
      type: "write",
      payload: [0x02, 0x07, 0x00, 0x00, 0x10, 0x10, 0x00, 0x19, 0x03, 0x0d],
    });
    return true;
  }
}

function checkElectronValidity() {
  if (!window.navigator.userAgent.match(/Electron/)) {
    console.log("this is not electron app");
    return false;
  }
  if (!ElectronService.ipcRenderer) {
    console.log("you are calling from ipcMain");
    return false;
  }
  return true;
}

function onSerialPortData(events, receivedBuffer, _event, data) {
  const eventsSubject = events;

  switch (data.type) {
    case "opened":
      eventsSubject.next({ type: "opened" });
      break;
    case "closed":
      eventsSubject.next({ type: "closed" });
      break;
    case "error":
      eventsSubject.next({ type: "error", payload: data.payload });
      break;
    case "data":
      receivedBuffer = Buffer.concat(
        [receivedBuffer, data.payload],
        receivedBuffer.length + data.payload.length
      );

      while (readyForRead(receivedBuffer)) {
        const payloadLength = receivedBuffer[1] + 2;

        if (payloadLength === 15) {
          const addressTokens = [];
          for (let index = 7; index < 13; index++) {
            const token = receivedBuffer[index].toString(16);
            addressTokens.push(token.length === 2 ? token : "0" + token);
          }

          const payload = {
            id: addressTokens.join(":"),
            classNumber: receivedBuffer[2],
            studentNumber: receivedBuffer[3],
          };

          switch (receivedBuffer[4]) {
            case 0x11: // payload type : data
              payload["value"] = receivedBuffer[5];
              payload["voltage"] = receivedBuffer[6];
              break;
            case 0x10:
              if (receivedBuffer[5] == 2) {
                // payload['voltage'] = this.receivedBuffer[6] * 10;
              }
              break;
          }
          eventsSubject.next({
            type: "clicked",
            payload: payload,
            data: data.payload,
          });
        }

        receivedBuffer = receivedBuffer.slice(payloadLength);
      }
      break;
  }
}

function readyForRead(receivedBuffer) {
  do {
    const stxOffset = receivedBuffer.indexOf(0x02);

    if (stxOffset === -1) {
      // no STX
      receivedBuffer = Buffer.alloc(0);
      return false;
    }

    if (stxOffset > 0) {
      receivedBuffer = receivedBuffer.slice(stxOffset);
    }

    if (receivedBuffer.length < 4) {
      // not enough payload length, min-length is 4 byte (STX + LEN + CHECKSUM + ETX)
      return false;
    }

    if (receivedBuffer[1] < 2) {
      // invalid value. minimum of LEN is 2. (1 byte for LEN, 1 byte for CHECKSUM)
      receivedBuffer = receivedBuffer.slice(2);
      continue;
    }

    if (receivedBuffer.length < receivedBuffer[1] + 2) {
      // not enough payload length
      return false;
    }

    if (receivedBuffer[receivedBuffer[1] + 1] !== 0x03) {
      // invalid ETX
      receivedBuffer = receivedBuffer.slice(1);
      continue;
    }

    let checksum = 0;
    for (let index = 1; index < receivedBuffer[1]; index++) {
      checksum += receivedBuffer[index];
    }
    checksum &= 0xff; // mask to unsigned 8bit
    if (receivedBuffer[receivedBuffer[1]] === checksum) {
      return true;
    }

    receivedBuffer = receivedBuffer.slice(1);
  } while (true);
}

module.exports = new RemoteControlService();
