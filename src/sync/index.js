import {synchronize} from '@nozbe/watermelondb/sync';
import {database} from '../db/database';
import Todo from '../model/todo';
import {DateTime} from 'luxon';

// your_local_machine_ip_address usually looks like 192.168.0.x
// on *nix system, you would find it out by running the ifconfig command
const SYNC_API_URL = 'http://<your_local_machine_ip_address>:40030/sync';

export function buildSyncApiUrl({ip, port = 40030, online = false}) {
  if (online) return SYNC_API_URL;

  return `http://${ip}:${port}/sync`;
}

export async function sync(syncApiUrl) {
  await synchronize({
    database,
    pullChanges: async ({lastPulledAt}) => {
      const response = await fetch(syncApiUrl, {
        body: JSON.stringify({lastPulledAt}),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const {changes, timestamp} = await response.json();
      return {changes, timestamp};
    },
    pushChanges: async ({changes, lastPulledAt}) => {
      const response = await fetch(
        `${syncApiUrl}?lastPulledAt=${lastPulledAt}`,
        {
          method: 'POST',
          body: JSON.stringify(changes),
        },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
  });
}

export async function pull(request) {
  console.log('pull request', request)
  const changes = request.postData['changes'] || {};

  if (changes?.todos?.created?.length > 0) {
    await Todo.createMany(
      changes.todos.created
        .filter(remoteEntry => remoteEntry.created_at)
        .map(remoteEntry => ({
          todo: remoteEntry.todo,
          completed: remoteEntry.completed,
          watermelonId: remoteEntry.id,
          createdAt: DateTime.fromMillis(parseInt(remoteEntry.created_at)),
        })),
    );
  }

  if (changes?.todos?.updated?.length > 0) {
    const updateQueries = changes.todos.updated.map(remoteEntry => {
      return Todo.query().where('watermelonId', remoteEntry.id).update({
        todo: remoteEntry.todo,
        completed: remoteEntry.completed,
      });
    });
    await Promise.all(updateQueries);
  }

  if (changes?.todos?.deleted?.length > 0) {
    await Todo.query().where('watermelon_id', changes.todos.deleted).exec();
  }
}

function getSafeLastPulledAt(request) {
  const lastPulledAt = request.postData['lastPulledAt'];
  if (lastPulledAt !== 'null') {
    return DateTime.fromMillis(parseInt(lastPulledAt)).toString();
  }
  return DateTime.fromMillis(1).toString();
}

export async function push(request) {
  console.log('push request', request)
  const lastPulledAt = getSafeLastPulledAt(request);
  const created = await Todo.query()
    .where('created_at', '>', lastPulledAt)
    .exec();
  const updated = await Todo.query()
    .where('updated_at', '>', lastPulledAt)
    .exec();
  return {
    changes: {
      todos: {
        created,
        updated,
        deleted: [],
      },
    },
    timestamp: Date.now(),
  };
}
