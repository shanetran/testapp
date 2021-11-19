import {synchronize} from '@nozbe/watermelondb/sync';
import axios from 'axios';
import {Q} from '@nozbe/watermelondb';


// your_local_machine_ip_address usually looks like 192.168.0.x
// on *nix system, you would find it out by running the ifconfig command
const SYNC_API_URL = 'http://<your_local_machine_ip_address>:40030/sync';

export function buildSyncApiUrl({ip, port = 40030, online = false}) {
  if (online) return SYNC_API_URL;

  return `http://${ip}:${port}`;
}

export async function sync(database, syncApiUrl) {
  console.log('Begin syncing...');

  try {
    await synchronize({
      database,
      pullChanges: async ({lastPulledAt = 1}) => {
        try {
          const response = await axios.post(`${syncApiUrl}/pull`, {lastPulledAt});
          const {changes = {}, timestamp = 1} = response.data;
          return {changes, timestamp};
        } catch (err) {
          console.log('Pull changes error', JSON.stringify(err));
          return {changes: {}, timestamp: lastPulledAt};
        }
      },
      pushChanges: async ({changes, lastPulledAt = 1}) => {
        try {
          const response = await axios.post(`${syncApiUrl}/push`, {changes, lastPulledAt});
        } catch (err) {
          console.log('Push changes error', JSON.stringify(err));
        }
      },
      sendCreatedAsUpdated: true,
    });
  } catch (err) {}
  console.log('Sync done...');
}

async function applyChanges(changes, database) {
  let created = [];
  let updated = [];
  let deleted = [];

  if (changes?.todos?.created?.length > 0) {
    created = changes.todos.created;
  }

  if (changes?.todos?.updated?.length > 0) {
    updated = changes.todos.updated;
  }

  if (changes?.todos?.deleted?.length > 0) {
    deleted = changes.todos.deleted;
  }

  await database.write(async () => {
    await Promise.all(created.map(async remoteEntry => {
      let todo = null;
      try {
        todo = await database.get('todos').find(remoteEntry.id);
      } catch (err) { }

      if (!todo) {
        console.log('Create todo', remoteEntry)
        await database.get('todos').create(t => {
          if (remoteEntry.id) {
            t._raw.id = remoteEntry.id;
          }
          t.title = remoteEntry.title;
        })
      } else {
        await todo.update(t => {
          t.title = remoteEntry.title;
        });
      }
    }));

    await Promise.all(updated.map(async remoteEntry => {
      let todo = null;
      try {
        todo = await database.get('todos').find(remoteEntry.id);
      } catch (err) { }

      if (!todo) {
        await database.get('todos').create(t => {
          if (remoteEntry.id) {
            t._raw.id = remoteEntry.id;
          }
          t.title = remoteEntry.title;
        })
      } else {
        await todo.update(t => {
          t.title = remoteEntry.title;
        });
      }
    }));

    await Promise.all(deleted.map(async deletingId => {
      let todo = null;
      try {
        todo = await database.get('todos').find(deletingId);
      } catch (err) { }

      if (todo) {
        await todo.destroyPermanently();
      }
    }));
  });
}

export async function pull(request, database) {
  const body = request.postData ? JSON.parse(request.postData) : {};
  const {changes} = body;
  await applyChanges(changes, database);
}

function getSafeLastPulledAt(request) {
  const body = request.postData ? JSON.parse(request.postData) : {};
  const {lastPulledAt} = body;
  if (lastPulledAt && lastPulledAt !== 'null') {
    return new Date(parseInt(lastPulledAt)).getTime();
  }
  try {
    const timestamp = new Date(1).getTime();
    return timestamp;
  } catch (err) {
    console.log('getSafeLastPulledAt', JSON.stringify(err));
    return 0;
  }
}

export async function push(request, database) {
  const lastPulledAt = getSafeLastPulledAt(request);
  try {
    let updated = await database.get('todos').query(Q.where('updated_at', Q.gt(lastPulledAt))).fetch();

    updated = updated.map(({_raw}) => {
      return {
        id: _raw.id,
        title: _raw.title,
        created_at: _raw.created_at,
        updated_at: _raw.updated_at,
      };
    });

    return {
      changes: {
        todos: {
          created: [],
          updated,
          deleted: [],
        },
      },
      timestamp: new Date().getTime(),
    };
  } catch (err) {
    console.log(err);
    return {
      changes: {},
      timestamp: new Date().getTime(),
    };
  }
}
