// const isElevated = require('is-elevated'); // Importing the 'is-elevated' package for checking if the process is running with elevated privileges

const { app, ipcMain } = require('electron'); // Importing the 'app' and 'ipcMain' modules from the 'electron' package
const SerialPort = require('serialport').SerialPort; // Importing the 'SerialPort' class from the 'serialport' package

let Node = {
  child: require('child_process'), // Importing the 'child_process' module and assigning it to the 'child' property of the 'Node' object
};

let MAX_BUFFER = 134217728; // Setting the maximum buffer size for child process execution

// Initializing a dongle
function init(execName, callback) {
  app.on('ready', async () => {
    // Event listener for when the Electron app is ready
    const gotTheLock = app.requestSingleInstanceLock(); // Checking if the app has acquired the single instance lock
    try {
      await sleep(500); // Waiting for 500 milliseconds
      if (!gotTheLock) {
        this.quit(); // Quitting the app if the single instance lock is not acquired
      } else {
        let isElevatedResult = true; //await isElevated(); // Checking if the process is running with elevated privileges
        if (isElevatedResult) {
          setupSerialPort(); // Setting up the serial port communication
          //callback();
        } else {
          var command = [
            '/usr/bin/pkexec',
            'env',
            'DISPLAY=$DISPLAY',
            'XAUTHORITY=$XAUTHORITY',
          ]; // Command for running a process with elevated privileges
          var magic = 'SUDOPROMPT'; // Magic string used for identifying the prompt
          command.push(
            '/bin/bash -c "echo ' + magic.trim() + ' ; ' + execName + '"',
          ); // Adding the command to execute the main process with elevated privileges
          //https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
          command = command.join(' '); // Joining the command array into a single string
          Node.child.exec(
            command,
            { encoding: 'utf-8', maxBuffer: MAX_BUFFER },
            (_error, _stdout, _stderr) => {
              app.quit(); // Quitting the app after executing the main process with elevated privileges
            },
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
}

async function portList() {
  try {
    const list = await SerialPort.list(); // Getting the list of available serial ports
    return list;
  } catch (error) {
    console.log(error, 'ERROR');
  }
}

function setupSerialPort() {
  ipcMain.on('serialport', (event, data) => {
    // Event listener for serial port communication
    var classKeySerialPort;
    switch (data.type) {
      case 'open':
        portList().then((ports) => {
          // Getting the list of available serial ports
          for (var port of ports) {
            if (port.vendorId === undefined) {
              continue;
            }
            console.log('port vendorId: ' + port.vendorId); // Logging the vendor ID of the serial port
            if (
              port.vendorId === '1915' &&
              (port.productId === '521a' ||
                port.productId === '521A' ||
                port.productId === 'c00a' ||
                port.productId === 'C00A')
            ) {
              console.log('path', port.path); // Logging the path of the serial port
              classKeySerialPort = new SerialPort(
                {
                  path: port.path,
                  baudRate: 115200,
                  databits: 8,
                  parity: 'none',
                },
                false,
              ); // Creating a new instance of the SerialPort class
              classKeySerialPort
                .on('open', () => {
                  event.sender.send('serialport', { type: 'opened' }); // Sending an event to the renderer process when the serial port is opened
                })
                .on('close', () => {
                  console.log('close'); // Logging when the serial port is closed
                  event.sender.send('serialport', { type: 'closed' }); // Sending an event to the renderer process when the serial port is closed
                })
                .on('error', (error) => {
                  console.log('error'); // Logging any errors that occur during serial port communication
                  console.error(error);
                  event.sender.send('serialport', {
                    type: 'error',
                    payload: { message: error.message },
                  }); // Sending an event to the renderer process with the error message
                })
                .on('data', (data) => {
                  console.log('data received'); // Logging when data is received from the serial port
                  console.log(data); // Logging the received data
                  console.log('data received finished');
                  event.sender.send('serialport', {
                    type: 'data',
                    payload: data,
                  }); // Sending an event to the renderer process with the received data
                });
              return;
            }
          }
          console.log('device not found'); // Logging when the specified device is not found
          event.sender.send('serialport', {
            type: 'error',
            payload: { message: 'device not found' },
          }); // Sending an event to the renderer process with the error message
          //}
        });
        break;
      case 'close':
        if (classKeySerialPort && classKeySerialPort.isOpen) {
          classKeySerialPort.close(); // Closing the serial port if it is open
        }
        break;
      case 'write':
        if (classKeySerialPort && classKeySerialPort.isOpen) {
          var writeBuffer = Buffer.from(data.payload); // Converting the payload data to a buffer
          classKeySerialPort.write(writeBuffer, function (err, result) {
            // Writing the buffer to the serial port
            if (err) {
              console.log('Error while sending message : ' + err); // Logging any errors that occur while sending the message
            }
            if (result) {
              console.log(
                'Response received after sending message : ' + result,
              ); // Logging the response received after sending the message
            }
          });
        }
        break;
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = init; // Exporting the 'init' function as the module's main export
module.exports.portList = portList; // Exporting the 'portList' function as a named export
