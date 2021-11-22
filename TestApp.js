import React, {useState, useEffect} from 'react';
import axios from 'axios';
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

const adapter = new SQLiteAdapter({
  schema: publicSchema,
});

const database = new Database({
  adapter,
  modelClasses: [Todo],
});

import {sync, buildSyncApiUrl, pull, push} from './src/sync';

const App = () => {
  const todoCollection = database.collections.get('todos');

  const [ipAddress, setIpAddress] = useState(null);
  const [message, setMessage] = useState(null);
  const [inputValue, setInputValue] = useState(null);
  const [syncing, setSyncing] = useState(false)

  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    httpBridge.start(40030, 'http_service', async function (request) {
      // you can use request.url, request.type and request.postData here
      if (request.type === 'POST' && request.url.split('/')[1] === 'pull') {
        // handle pull data
        try {
          const result = await push(request, database);
          httpBridge.respond(
            request.requestId,
            200,
            'application/json',
            JSON.stringify(result),
          );
        } catch (err) {
          httpBridge.respond(
            request.requestId,
            400,
            'application/json',
            JSON.stringify({err}),
          );
        }
      } else if (
        request.type === 'POST' &&
        request.url.split('/')[1] === 'push'
      ) {
        // handle push data
        await pull(request, database);
        httpBridge.respond(
          request.requestId,
          200,
          'application/json',
          JSON.stringify({message: 'push data'}),
        );
      } else {
        httpBridge.respond(
          request.requestId,
          404,
          'application/json',
          JSON.stringify({message: 'Not found'}),
        );
      }
    });
    return () => {
      httpBridge.stop();
    };
  }, []);

  async function handleSync() {
    if (syncing) return;
    if (!ipAddress) return;
    const syncApiUrl = buildSyncApiUrl({ip: ipAddress});
    setSyncing(true)
    await sync(database, syncApiUrl);
    setSyncing(false)
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
          <View style={{paddingTop: 50}}>
            <Text>IP</Text>
            <TextInput
              style={{borderWidth: 1}}
              value={ipAddress}
              onChangeText={setIpAddress}
              placeholder='192.168.0.1'
            />
            <TouchableOpacity
              style={{
                borderRadius: 4,
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
                padding: 6,
              }}
              disabled={syncing || !ipAddress}
              onPress={handleSync}>
              <Text>{syncing ? 'Syncing...' : 'Sync'}</Text>
            </TouchableOpacity>
            <View>
              <Text>{message}</Text>
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
    <View style={{justifyContent: "space-between", alignItems: "center", flexDirection: "row", marginBottom: 6}}>
      <Text style={{ fontSize: 10 }}>{todo.id}</Text>
      <Text style={{fontSize: 18}}>{todo.title}</Text>
      <TouchableOpacity
        onPress={handleDelete.bind(this, todo)}
      >
        <Text style={{fontWeight: "bold", color: "#c00"}}>Delete</Text>
      </TouchableOpacity>
    </View>
  )
}

const EnhancedTodoItem = withObservables(['todo'], ({todo}) => ({
  todo: todo.observe(),
}))(TodoItem);

function TodoList ({todos, handleDelete}) {
  return (
    <View style={{marginVertical: 20}}>
      <Text style={{fontWeight: "bold", fontSize: 20, color: "#008378"}}>Todo List</Text>
      {todos && todos.length > 0 ? (
        <View style={{paddingTop: 10}}>
          {todos.map(todo => (
            <EnhancedTodoItem key={todo.id} todo={todo} handleDelete={handleDelete} />
          ))}
        </View>
      ): (
        <Text style={{textAlign: "center"}}>Empty.</Text>
      )}
    </View>
  )
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
