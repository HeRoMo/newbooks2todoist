import AdvertisingAPI from './amazon';

const Main = {
  /**
   *  Apazon Product Advertising API の結果をパースして必要な情報を取り出す。
   *  紙の本かつこれから発売される情報のみに絞り込む
   *  @param [xmlDoc] xmlDoc
   *  @return
   */
  parseResult(xmlDoc: GoogleAppsScript.XML_Service.Document): string[][] {
    if (!xmlDoc) return [];
    Logger.log('xmlDoc is undefined');
    const root = xmlDoc.getRootElement();
    const items = root.getChild('Items', NS).getChildren('Item', NS);

    const values: string[][] = [];
    items.forEach((item) => {
      const attrs = item.getChild('ItemAttributes', NS);

      // 紙の本のみ（ISBNを持つ）に絞り込む
      const isbn = attrs.getChild('ISBN', NS);
      if (isbn === undefined) return;

      // 未発売のものだけに絞り込む
      const pubDate = attrs.getChild('PublicationDate', NS).getText();
      if (Date.now() > new Date(pubDate.replace(/-/g, '/')).getTime()) return;

      const val: string[] = [];
      val.push(isbn.getText());
      val.push(attrs.getChild('Title', NS).getText());
      if (attrs.getChild('ListPrice', NS)) {
        val.push(attrs.getChild('ListPrice', NS).getChild('FormattedPrice', NS).getText());
      } else {
        val.push('NA'); // 価格が取れないときがある。
      }
      val.push(pubDate);

      // amazonの商品ページ
      const itmeUrl = item.getChild('DetailPageURL', NS).getText();
      val.push(itmeUrl);

      values.push(val);
    });
    return values;
  },

  /**
   * スプレッドシートから条件を読み出し、Amazonで検索し、
   * 新着があればスプレッドシートに記録し、Googleカレンダーに追加する
   */
  searchAndAddEvent(): void {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 次のターゲットを決める
    const sheet = ss.getSheetByName('INDEX');
    const range = sheet.getDataRange();
    const values = range.getValues();

    const header = values.shift();
    const nextCheckIdx = header.findIndex((e) => {
      return e === 'NextCheck';
    });

    const nextTargetIndex = values.findIndex((val) => {
      const ncheck = val[nextCheckIdx];
      if (!(ncheck instanceof Date)) return true;
      return ncheck.getTime() < Date.now();
    });
    if (nextTargetIndex < 0) return; // ターゲット候補がないので終了

    const targetRange = sheet.getRange(nextTargetIndex + 2, 1, 1, range.getLastColumn());
    const nextTarget = targetRange.getValues()[0];

    // ターゲットの条件を取得する
    const cond = {};
    for (let i = 3; i < header.length; i++) {
      if (header[i] === '') break;
      if (nextTarget[i] === '') continue;
      cond[String(header[i])] = nextTarget[i];
    }

    // 条件を元に検索
    let resultXML;
    try {
      resultXML = AdvertisingAPI.execItemSearch(cond);
    } catch (error) {
      Util.log('ERROR', 'AdvertisingAPI.execItemSearch', error);
    }
    Util.log('INFO', 'AdvertisingAPI.execItemSearch結果', 'resultXML: ' + resultXML);
    const result = Main.parseResult(resultXML);

    // NextCheckの更新
    const now = new Date(Date.now());
    targetRange.getCell(1, 2).setValue(now); // LastCheck
    now.setDate(now.getDate() + 7);
    targetRange.getCell(1, 3).setValue(now); // NextCheck

    // 結果を書き込み
    const rowNum = result.length;
    if (rowNum === 0) return; // 結果がなければ終了

    let targetSheet = ss.getSheetByName(String(nextTarget[0]));
    if (targetSheet == null) { // 結果を書き込むシートがなければ作る
      targetSheet = ss.insertSheet(nextTarget[0]);
      targetSheet.getRange('A1:E1').setValues([['ISBN', 'Title', 'FormattedPrice', 'PublicationDate', 'URL']]);
    }
    const exists = targetSheet.getRange('A1:A' + targetSheet.getLastRow()).getValues();
    result.forEach((rowContents) => {
      if (!exists.includes(Object(rowContents[0])) /*&& rowContents[2]!="NA"*/) {
        targetSheet.appendRow(rowContents);
        Main.createTask(rowContents);
      }
    });
  },

  /**
   * Todoist の買い物プロジェクトにタスクを追加する
   */
  createTask(data) {
    // tslint:disable:object-literal-sort-keys
    const task = {
      project_id: P_SHOPPING,
      content: Utilities.formatString('[「%s」購入](%s)', data[1], data[4]),
      date_string: data[3],
      note: Utilities.formatString('ISBN: %s\n書名: %s\n価格: %s', data[0], data[1], data[2]),
    };
    // tslint:eable:object-literal-sort-keys
    const res = Todoist.addItem(task);
    return res;
  },

  /**
   * Google Calendar に予定を追加する
   * @param [Array] 追加する予定のデータ［ISBN,書名,価格,発売日］の配列
   * Todoistへの登録に変更したので使っていない。2017/04/23
   */
  createCalEvent(data) {
    const cal = CalendarApp.getCalendarById(CAL_ID);
    const title = Utilities.formatString('「%s」購入', data[1]);
    const date = new Date(data[3].replace(/-/g, '/'));
    const description = Utilities.formatString('ISBN: %s\n書名: %s\n価格: %s', data[0], data[1], data[2]);

    cal.createAllDayEvent(title, date, {description});
  },
};

export const Util = {
  log(level: string, subject: string, message: string): void {
    const log = {
      level,
      subject,
      message: message.toString(),
    };
    console.info(log);
  },
};

function execute() {
  Main.searchAndAddEvent();
}
