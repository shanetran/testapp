import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'todos',
          columns: [
            { name: 'title', type: 'string' }
          ],
        }),
      ],
    },
  ],
})