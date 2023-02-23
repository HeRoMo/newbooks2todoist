declare namespace Todoist {
  export class Client {
    constructor(todoistToken: string);
    addItem(item: object, note?: any): object[];
  }
}
