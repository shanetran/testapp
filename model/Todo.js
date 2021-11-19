import {Model} from '@nozbe/watermelondb';
import {date, text, readonly} from '@nozbe/watermelondb/decorators';

/*
  Decorator
  @action
  @children
  @date
  @field
  @immutableRelation
  @json
  @lazy
  @nochange
  @readonly
  @relation
  @text
*/
export default class Todo extends Model {
  static table = 'todos';

  @text('title') title;
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
}
