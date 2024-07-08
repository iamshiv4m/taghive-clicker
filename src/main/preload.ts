import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { listenClickerEvent } from '../SDK/listenEvent';

export type Channels = string;
const electronHandler: {
  ipcRenderer: { invoke: any; sendMessage: any; on: any; once: any; send: any };
  clickerSDK: any;
} = {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: Channels, args: unknown[]) {
      return ipcRenderer.invoke(channel, args);
    },
    send(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
  },
  clickerSDK: {
    initSDK: () => {
      console.log('hello');
    },
    checkPortsAndListen: () => ipcRenderer.invoke('check-ports-and-listen'),
    onFinalPortList: (callback: any) =>
      ipcRenderer.on('final-port-list', callback),
    listenClickerEventSdk: (callbackArg: any) =>
      listenClickerEvent(callbackArg),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
