
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import httpBridge from 'react-native-http-bridge';

import {
  DeviceEventEmitter, TextInput,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';


const App = () => {

  const [ipAddress, setIpAddress] = useState(null)
  const [message, setMessage] = useState(null)

  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    httpBridge.start(40030, 'http_service', function (request) {
      // you can use request.url, request.type and request.postData here
      if (request.type === "GET" && request.url.split("/")[1] === "users") {
        httpBridge.respond(request.requestId, 200, "application/json", "{\"message\": \"OK\"}");
      } else {
        httpBridge.respond(request.requestId, 400, "application/json", "{\"message\": \"Bad Request\"}");
      }
    });
    return () => {
      httpBridge.stop();
    }
  }, []);


  function handleRequest() {
    console.log('ipAddress', ipAddress);
    axios.get(`http://${ipAddress}:40030/users`)
    .then(function (response) {
      setMessage("Success")
    })
    .catch(function (error) {
      // console.log('err', JSON.stringify(error))
      setMessage("Error")
    })
  }

  return (
    <SafeAreaView style={{}}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{padding: 20}}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Text>
            Edit <Text style={styles.highlight}>App.js</Text> to change this screen and then come back to see your edits.
          </Text>
          <View style={{paddingTop: 10}}>
            <Text>Url</Text>
            <TextInput 
              style={{borderWidth: 1}}
              value={ipAddress}
              onChangeText={setIpAddress}
              placeholder='172.20.10.1'
            />
            <TouchableOpacity 
              style={{borderRadius: 4, borderWidth: 1, justifyContent: "center", alignItems: "center", marginTop: 10, padding: 6}} 
              onPress={handleRequest}
            >
              <Text>Submit</Text>
            </TouchableOpacity>
            <View>
              <Text>{message}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
