// const isElevated = require('is-elevated'); // Importing the 'is-elevated' package for checking if the process is running with elevated privileges

const { app, ipcMain } = require('electron'); // Importing the 'app' and 'ipcMain' modules from the 'electron' package
const SerialPort = require('serialport').SerialPort; // Importing the 'SerialPort' class from the 'serialport' package

let Node = {
  child: require('child_process'), // Importing the 'child_process' module and assigning it to the 'child' property of the 'Node' object
};

let MAX_BUFFER = 134217728; // Setting the maximum buffer size for child process execution

// Initializing a dongle
function init(execName, callback) {
  console.log('hello iniht');
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
    let classKeySerialPort;

    switch (data.type) {
      case 'open':
        portList().then((ports) => {
          for (const port of ports) {
            if (!port.vendorId) continue; // Skip ports without a vendor ID

            console.log('port vendorId: ' + port.vendorId); // Log the vendor ID of the serial port

            // Check if the device matches the expected vendor and product IDs
            if (
              port.vendorId === '1915' &&
              (port.productId === '521a' ||
                port.productId === '521A' ||
                port.productId === 'c00a' ||
                port.productId === 'C00A')
            ) {
              console.log('path', port.path); // Log the path of the serial port

              classKeySerialPort = new SerialPort(
                {
                  path: port.path,
                  baudRate: 115200,
                  databits: 8,
                  parity: 'none',
                },
                false,
              ); // Create a new SerialPort instance

              // Function to handle reconnection attempts
              const reconnect = () => {
                console.log('Attempting to reconnect...');
                setTimeout(() => {
                  classKeySerialPort.open((err) => {
                    if (err) {
                      console.log('Reconnection failed, retrying...');
                      reconnect(); // Retry on failure
                    } else {
                      console.log('Reconnected successfully!');
                      event.sender.send('serialport', { type: 'reconnected' }); // Notify the renderer of successful reconnection
                    }
                  });
                }, 5000); // Reconnection delay
              };

              // Event listeners for the serial port
              classKeySerialPort
                .on('open', () => {
                  console.log('Serial port opened');
                  event.sender.send('serialport', { type: 'opened' }); // Notify the renderer when the port is opened
                })
                .on('close', () => {
                  console.log('Serial port closed');
                  event.sender.send('serialport', { type: 'closed' }); // Notify the renderer when the port is closed
                  reconnect(); // Attempt to reconnect
                })
                .on('error', (error) => {
                  console.log('Serial port error:', error.message); // Log the error message
                  event.sender.send('serialport', {
                    type: 'error',
                    payload: { message: error.message },
                  }); // Notify the renderer of the error
                  reconnect(); // Attempt to reconnect
                })
                .on('data', (data) => {
                  console.log('Data received'); // Log data received
                  console.log(data); // Log the actual data
                  event.sender.send('serialport', {
                    type: 'data',
                    payload: data,
                  }); // Notify the renderer of the data
                });

              return; // Exit the loop when the correct device is found
            }
          }

          // If the correct device is not found, send an error to the renderer
          console.log('Device not found');
          event.sender.send('serialport', {
            type: 'error',
            payload: {
              message: 'Device not found. Please connect the USB device.',
            },
          });
        });
        break;

      case 'close':
        if (classKeySerialPort && classKeySerialPort.isOpen) {
          classKeySerialPort.close(); // Close the port if it is open
        }
        break;

      case 'write':
        if (classKeySerialPort && classKeySerialPort.isOpen) {
          const writeBuffer = Buffer.from(data.payload); // Convert payload to buffer
          classKeySerialPort.write(writeBuffer, (err, result) => {
            if (err) {
              console.log('Error while sending message: ' + err); // Log error
              event.sender.send('serialport', {
                type: 'error',
                payload: { message: 'Failed to send data to the USB device.' },
              }); // Notify the renderer of the error
            }
            if (result) {
              console.log('Response received after sending message: ' + result); // Log response
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
