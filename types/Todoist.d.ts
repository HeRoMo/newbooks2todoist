declare namespace Todoist {
  interface Client {
    addItem(item: object, note?: any): object[];
  }
  export function createClient(todoistToken: string): Client;
}
