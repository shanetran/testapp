
import React, { useState, useEffect } from 'react';
import axios from 'axios';

var httpBridge = require('react-native-app-server')
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
    httpBridge.start(5000, "http_service", function(request) {
      if (request.type === "GET" && request.url.split("/")[1] === "users") {
        httpBridge.respond(200, "application/json", "{\"message\": \"This is test OK\"}");
      } else {
        httpBridge.respond(400, "application/json", "{\"message\": \"Tested Bad Request\"}");
      }
    });
    return () => httpBridge.stop()
  }, [])


  function handleRequest() {
    axios.get(`${ipAddress}/users`)
    .then(function (response) {
      setMessage("Success")
    })
    .catch(function (error) {
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
              onChange={e => setIpAddress(e.target.value)}
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
