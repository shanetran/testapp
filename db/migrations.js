import {
  schemaMigrations,
  createTable,
} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'todos',
          columns: [
            {name: 'title', type: 'string'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
          ],
        }),
      ],
    },
  ],
});
