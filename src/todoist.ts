var Todoist = {

  SYNC_ENDPOINT: "https://todoist.com/API/v7/sync",
  ITEM_ENDPOINT: "https://todoist.com/API/v7/items/add",

  /**
   * アイテムの追加
   * @param task [object] 内容は https://developer.todoist.com/?shell#add-item を参照のこと
   */
  addItem: function(task){
    task.token = TD_TOKEN
    var opts = {
      method: "post",
      payload: task,
      muteHttpExceptions:true
    }
    var response = UrlFetchApp.fetch(this.ITEM_ENDPOINT, opts);
    Logger.log(response)
    return JSON.parse(response.getContentText())
  },

  /**
   * Sync APIによるアイテム追加。
   */
  addItemBySync: function(task){
    var commands = [{
      type: "item_add",
      uuid: Utilities.getUuid(),
      temp_id: Utilities.getUuid(),
      args: task
    }]
    return this.syncCommands(commands)
  },
  syncCommands: function(commands){
    var opts = {
      method: "post",
      payload: {
        token: TD_TOKEN,
        commands: JSON.stringify(commands)
      },
      muteHttpExceptions:true
    }
    var response = UrlFetchApp.fetch(this.SYNC_ENDPOINT, opts);
    Logger.log(response)
    return JSON.parse(response.getContentText())
  }
}
