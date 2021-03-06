import React, {useState, useEffect} from 'react';
import httpBridge from 'react-native-http-bridge';
import migrations from './db/migrations';
import withObservables from '@nozbe/with-observables';
import Todo from './model/Todo';
import {Q} from '@nozbe/watermelondb';

import {
  TextInput,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import publicSchema from './db/schema';
import useWifi from './src/wifi';
import useServer from './src/server';

const adapter = new SQLiteAdapter({
  schema: publicSchema,
});

const database = new Database({
  adapter,
  modelClasses: [Todo],
});

import {sync, buildSyncApiUrl} from './src/sync';

const App = () => {
  const todoCollection = database.collections.get('todos');
  const [message, setMessage] = useState(null);
  const [inputValue, setInputValue] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const {server} = useServer(database);
  const {scan, isScanning, ipAddresses, currentIpAddress} = useWifi();

  const isDarkMode = useColorScheme() === 'dark';

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await Promise.all(
        ipAddresses.map(async ipAddress => {
          try {
            const syncApiUrl = buildSyncApiUrl({ip: ipAddress});
            await sync(database, syncApiUrl);
          } catch (err) {
            console.log(err);
          }
        }),
      );
    } catch (err) {
      console.log('handle sync error', err);
    }
    setSyncing(false);
  }

  async function handleNew() {
    if (inputValue) {
      try {
        const newTodo = await database.write(async () => {
          const todo = await todoCollection.create(todo => {
            todo.title = inputValue || 'New Todo';
          });
          return todo;
        });
        setInputValue('');
      } catch (error) {}
    }
  }

  async function handleDelete(todo) {
    try {
      await database.write(async () => {
        await todo.markAsDeleted();
      });
    } catch (error) {}
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
          <Text>Current IP: {currentIpAddress}</Text>
          <View style={{marginTop: 30}}>
            <TouchableOpacity
              style={{
                borderRadius: 4,
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
                padding: 6,
              }}
              disabled={isScanning}
              onPress={scan}>
              <Text>{isScanning ? 'Scanning...' : 'Scan'}</Text>
            </TouchableOpacity>
            <Text style={{ marginTop: 5, marginBottom: 5 }}>Local devices:</Text>
            <View style={{flex: 1, marginBottom: 10}}>
              {ipAddresses.map(ipAddress => {
                return (
                  <View
                    key={ipAddress}
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexDirection: 'row',
                      marginBottom: 6,
                    }}>
                    <Text>{ipAddress}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View>
            <View
              style={{
                marginBottom: 10,
                borderWidth: 1,
                borderColor: "#475669",
                borderRadius: 4,
                paddingHorizontal: 10,
                paddingVertical: 16,
              }}>
              <Text
                style={{
                  marginBottom: 4,
                  color: '#008378',
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                Form Input
              </Text>
              <TextInput 
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Input your task"
                style={{
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: 4,
                }}
              />
              <TouchableOpacity
                onPress={handleNew}
                style={{
                  borderRadius: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 10,
                  marginTop: 10,
                  backgroundColor: '#008378',
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#fff',
                    fontWeight: 'bold',
                  }}>
                  New Todo
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{
                borderRadius: 4,
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
                padding: 6,
              }}
              disabled={syncing}
              onPress={handleSync}>
              <Text>{syncing ? 'Syncing...' : 'Sync'}</Text>
            </TouchableOpacity>
            <EnhancedTodoList
              todoCollection={todoCollection}
              handleDelete={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function TodoItem({todo, handleDelete}) {
  return (
    <View
      style={{
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 6,
      }}>
      <Text style={{fontSize: 10}}>{todo.id}</Text>
      <Text style={{fontSize: 18}}>{todo.title}</Text>
      <TouchableOpacity onPress={handleDelete.bind(this, todo)}>
        <Text style={{fontWeight: 'bold', color: '#c00'}}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const EnhancedTodoItem = withObservables(['todo'], ({todo}) => ({
  todo: todo.observe(),
}))(TodoItem);

function TodoList({todos, handleDelete}) {
  return (
    <View style={{marginVertical: 20}}>
      <Text
        style={{
          fontWeight: 'bold',
          fontSize: 20,
          color: '#008378',
        }}>
        Todo List
      </Text>
      {todos && todos.length > 0 ? (
        <View style={{paddingTop: 10}}>
          {todos.map(todo => (
            <EnhancedTodoItem
              key={todo.id}
              todo={todo}
              handleDelete={handleDelete}
            />
          ))}
        </View>
      ) : (
        <Text style={{textAlign: 'center'}}>Empty.</Text>
      )}
    </View>
  );
}

const EnhancedTodoList = withObservables([], ({todoCollection}) => ({
  todos: todoCollection.query(Q.sortBy('created_at', Q.asc)),
}))(TodoList);

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
