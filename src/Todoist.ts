interface IItem {
  project_id: string;
  content: string;
  date_string: string;
  note: string;
  token?: string;
}

class Todoist {
  private static readonly ITEM_ENDPOINT = 'https://todoist.com/API/v7/items/add';

  private apiToken: string;

  public constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * アイテムの追加
   * @param task [object] 内容は https://developer.todoist.com/?shell#add-item を参照のこと
   */
  public addItem(task: IItem): object {
    task.token = this.apiToken;
    try {
      const opts: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        muteHttpExceptions: true,
        payload: task,
      };
      const response = UrlFetchApp.fetch(Todoist.ITEM_ENDPOINT, opts);
      console.info({message: 'Todoist.addItemのレスポンス', response});
      return JSON.parse(response.getContentText());
    } catch (error) {
      console.error({error});
    }
  }
}

export default Todoist;
