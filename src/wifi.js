import FindLocalDevices from 'react-native-find-local-devices';
import {DeviceEventEmitter} from 'react-native';
import {useEffect, useRef, useState} from 'react';
import {NetworkInfo} from 'react-native-network-info';

export default function useWifi() {
  const [ipAddresses, setIpAddresses] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const listenersRef = useRef({});
  const [currentIp, setCurrentIp] = useState(null);
  const ipRef = useRef(null);

  function onStopScanning() {
    setIsScanning(false);
  }

  function onResult(devices) {
    const addresses = devices
      .map(({ipAddress}) => ipAddress)
      .filter(ipAddress => ipAddress !== ipRef.current);
    setIpAddresses(addresses);
    setIsScanning(false);
  }

  function onDeviceAdded(device) {
    if (device.ipAddress !== ipRef.current) {
      setIpAddresses(prev => [...prev, device.ipAddress]);
      console.log(`NEW DEVICE FOUND: ${device.ipAddress}:${device.port}`);
    }
  }

  function onChecking(device) {
    console.log(`CHECKING: ${device.ipAddress}:${device.port}`);
  }

  useEffect(() => {
    async function init() {
      const ipv4Address = await NetworkInfo.getIPV4Address();
      setCurrentIp(ipv4Address);
      ipRef.current = ipv4Address;
      listenersRef.current['onDeviceAdded'] = DeviceEventEmitter.addListener('NEW_DEVICE_FOUND', onDeviceAdded);
      listenersRef.current['onResult'] = DeviceEventEmitter.addListener('RESULTS', onResult);
      listenersRef.current['onStopScanning'] = DeviceEventEmitter.addListener('NO_DEVICES', onStopScanning);
      listenersRef.current['onChecking'] = DeviceEventEmitter.addListener('CHECK', onChecking);
      // Getting local devices which have active socket server on the following ports:
      return () => {
        FindLocalDevices.cancelDiscovering();
        Object.keys(listenersRef.current).forEach(key => {
          listenersRef.current[key]?.remove();
        });
      };
    }
    init();
  }, []);

  async function scan() {
    if (isScanning) return;
    setIsScanning(true);
    FindLocalDevices.getLocalDevices({
      ports: [40030],
      timeout: 100,
    });
    // setIsScanning(false);
  }

  function stopScan() {
    FindLocalDevices.cancelDiscovering();
  }

  return {
    ipAddresses,
    scan,
    stopScan,
    isScanning,
    currentIpAddress: currentIp,
  };
}
