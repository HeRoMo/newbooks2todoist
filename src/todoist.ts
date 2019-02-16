interface IItem {
  project_id: string;
  content: string;
  date_string: string;
  note: string;
  token?: string;
}

class Todoist {
  private static readonly ITEM_ENDPOINT = 'https://todoist.com/API/v7/items/add';
  private static readonly SYNC_ENDPOINT = 'https://todoist.com/API/v7/sync';

  private todoistToken: string;

  public constructor(token: string) {
    this.todoistToken = token;
  }

  /**
   * アイテムの追加
   * @param task [object] 内容は https://developer.todoist.com/?shell#add-item を参照のこと
   */
  public addItem(task: IItem): object {
    task.token = this.todoistToken;
    const opts: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      muteHttpExceptions: true,
      payload: task,
    };
    const response = UrlFetchApp.fetch(Todoist.ITEM_ENDPOINT, opts);
    console.info({message: 'Todoist.addItemのレスポンス', response});
    return JSON.parse(response.getContentText());
  }

  /**
   * Sync APIによるアイテム追加。
   */
  private addItemBySync(task: object): object {
    const commands = [{
      args: task,
      temp_id: Utilities.getUuid(),
      type: 'item_add',
      uuid: Utilities.getUuid(),
    }];
    return this.syncCommands(commands);
  }

  private syncCommands(commands: object): object {
    const opts: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      muteHttpExceptions: true,
      payload: {
        commands: JSON.stringify(commands),
        token: this.todoistToken,
      },
    };
    const response = UrlFetchApp.fetch(Todoist.SYNC_ENDPOINT, opts);
    console.info({message: 'Todoist.syncCommandsのレスポンス', response});
    return JSON.parse(response.getContentText());
  }
}

export default Todoist;
