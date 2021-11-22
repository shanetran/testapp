import {useState, useEffect} from 'react';
import httpBridge from 'react-native-http-bridge';

import {pull, push} from './sync';

export default function useServer(database) {
  const [server, setServer] = useState(null);
  useEffect(() => {
    const s = httpBridge.start(40030, 'http_service', async function (request) {
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
    setServer(s);
    return () => {
      httpBridge.stop();
    };
  }, []);

  return {
    server,
  };
}
