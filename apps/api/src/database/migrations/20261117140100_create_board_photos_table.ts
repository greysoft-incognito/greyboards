import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateBoardPhotosTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('board_photos', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('cascade')
        .as('board')
        .inverseAlias('photos')
      table
        .uuid('takenById')
        .nullable()
        .map('taken_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('takenBy')
        .inverseAlias('boardPhotos')
      table.string('path')
      table.string('disk')
      table.integer('width')
      table.integer('height')
      table.float('latitude').nullable()
      table.float('longitude').nullable()
      table.float('accuracyM').nullable().map('accuracy_m')
      table.timestamp('takenAt').nullable().map('taken_at')
      table.timestamps()
      table.index(['boardId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('board_photos')
  }
}
