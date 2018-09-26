interface IItem {
  project_id: string;
  content: string;
  date_string: string;
  note: string;
  token?: string;
}

const Todoist = {

  ITEM_ENDPOINT: 'https://todoist.com/API/v7/items/add',
  SYNC_ENDPOINT: 'https://todoist.com/API/v7/sync',

  /**
   * アイテムの追加
   * @param task [object] 内容は https://developer.todoist.com/?shell#add-item を参照のこと
   */
  addItem(task: IItem): object {
    task.token = TD_TOKEN;
    const opts: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      muteHttpExceptions: true,
      payload: task,
    };
    const response = UrlFetchApp.fetch(this.ITEM_ENDPOINT, opts);
    console.info({message: 'Todoist.addItemのレスポンス', response});
    return JSON.parse(response.getContentText());
  },

  /**
   * Sync APIによるアイテム追加。
   */
  addItemBySync(task: object): object {
    const commands = [{
      args: task,
      temp_id: Utilities.getUuid(),
      type: 'item_add',
      uuid: Utilities.getUuid(),
    }];
    return this.syncCommands(commands);
  },

  syncCommands(commands: object): object {
    const opts: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      muteHttpExceptions: true,
      payload: {
        commands: JSON.stringify(commands),
        token: TD_TOKEN,
      },
    };
    const response = UrlFetchApp.fetch(this.SYNC_ENDPOINT, opts);
    console.info({message: 'Todoist.syncCommandsのレスポンス', response});
    return JSON.parse(response.getContentText());
  },
};
