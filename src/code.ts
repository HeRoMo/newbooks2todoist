
var Main = {
  
  /**
   *  Apazon Product Advertising API の結果をパースして必要な情報を取り出す。
   *  紙の本かつこれから発売される情報のみに絞り込む
   *  @param [xmlDoc] xmlDoc
   *  @return 
   */
  parseResult: function(xmlDoc){
    if (!xmlDoc) return [];
    Logger.log("xmlDoc is undefined")
    var root = xmlDoc.getRootElement();
    var items = root.getChild('Items',NS).getChildren('Item',NS);
  
    var values = []
    items.forEach(function(item){
      var attrs = item.getChild('ItemAttributes',NS);
      
      //紙の本のみ（ISBNを持つ）に絞り込む
      var isbn = attrs.getChild('ISBN',NS)
      if (isbn == undefined) return;
      
      //未発売のものだけに絞り込む
      var pubDate = attrs.getChild('PublicationDate',NS).getText()
      if (Date.now() > new Date(pubDate.replace(/-/g,'/')).getTime()) return;
      
      var val = []
      val.push(isbn.getText())
      val.push(attrs.getChild('Title',NS).getText())
      if(attrs.getChild('ListPrice',NS)){
        val.push(attrs.getChild('ListPrice',NS).getChild('FormattedPrice',NS).getText())
      } else {
        val.push("NA"); //価格が取れないときがある。
      }
      val.push(pubDate)
      
      //amazonの商品ページ
      var itmeUrl = item.getChild('DetailPageURL',NS).getText()
      val.push(itmeUrl)
      
      values.push(val)
    })
    return values
  },
  
  /**
   * スプレッドシートから条件を読み出し、Amazonで検索し、
   * 新着があればスプレッドシートに記録し、Googleカレンダーに追加する
   */
  searchAndAddEvent: function(){
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 次のターゲットを決める
    var sheet = ss.getSheetByName('INDEX')
    var range = sheet.getDataRange();
    var values = range.getValues()
    
    var header = values.shift();
    var nextCheckIdx = header.findIndex(function(e){
      return e === 'NextCheck'
    })
    
    var nextTargetIndex = values.findIndex(function(val){
      var ncheck = val[nextCheckIdx]
      if(!(ncheck instanceof Date)) return true
      return ncheck.getTime() < Date.now();
    })
    if(nextTargetIndex < 0) return; //ターゲット候補がないので終了
    
    var targetRange = sheet.getRange(nextTargetIndex+2,1,1,range.getLastColumn())    
    var nextTarget = targetRange.getValues()[0];
    
    // ターゲットの条件を取得する
    var cond = {}
    for(var i=3; i<header.length; i++) {
      if (header[i] == '') break;
      if (nextTarget[i] == '') continue;
      cond[header[i]]=nextTarget[i]
    }
    
    // 条件を元に検索
    try {
      var resultXML = AdvertisingAPI.execItemSearch(cond);
    } catch(error){
      Util.log("ERROR", "AdvertisingAPI.execItemSearch", error)
    }
    Util.log("INFO", "AdvertisingAPI.execItemSearch結果", "resultXML: "+ resultXML)
    var result = Main.parseResult(resultXML)
    
    // NextCheckの更新
    var now = new Date(Date.now())
    targetRange.getCell(1,2).setValue(now) //LastCheck
    now.setDate(now.getDate()+7)
    targetRange.getCell(1,3).setValue(now) //NextCheck
    
    // 結果を書き込み
    var rowNum = result.length
    if (rowNum==0) return;//結果がなければ終了
    
    var targetSheet = ss.getSheetByName(nextTarget[0])
    if(targetSheet == null){ //結果を書き込むシートがなければ作る
      targetSheet = ss.insertSheet(nextTarget[0]);
      targetSheet.getRange('A1:E1').setValues([["ISBN","Title","FormattedPrice","PublicationDate","URL"]])
    }
    var exists = targetSheet.getRange('A1:A'+targetSheet.getLastRow()).getValues();
    result.forEach(function(rowContents){
      if(!exists.includes(rowContents[0]) /*&& rowContents[2]!="NA"*/){
        targetSheet.appendRow(rowContents);
        Main.createTask(rowContents);
      }
    })
  },
  
  /**
   * Todoist の買い物プロジェクトにタスクを追加する
   */
  createTask: function(data){
    var task = {
      project_id: Todoist.P_SHOPPING,
      content: Utilities.formatString('[「%s」購入](%s)', data[1], data[4]),
      date_string: data[3],
      note: Utilities.formatString("ISBN: %s\n書名: %s\n価格: %s", data[0], data[1],data[2])
    }
    var res = Todoist.addItem(task)
    return res
  },
  
  /**
   * Google Calendar に予定を追加する
   * @param [Array] 追加する予定のデータ［ISBN,書名,価格,発売日］の配列
   * Todoistへの登録に変更したので使っていない。2017/04/23
   */
  createCalEvent: function(data){
    var cal = CalendarApp.getCalendarById(CAL_ID)
    var title = Utilities.formatString('「%s」購入', data[1])
    var date = new Date(data[3].replace(/-/g,'/'))
    var description = Utilities.formatString("ISBN: %s\n書名: %s\n価格: %s", data[0], data[1],data[2])
    
    cal.createAllDayEvent(title, date, {description: description})
  }
}

Util={
  log:function(level, subject, message){
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName('LOG')
    var time = new Date()
    var log =[
      time,
      level,
      subject,
      message.toString()
    ]
    logSheet.appendRow(log);
  }
}

function execute(){
  Main.searchAndAddEvent();
}