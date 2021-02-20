import loadConfig from './config';
import RakutenBooks, { IBookInfo, ISerachConditiuoin } from './RakutenBooks';

function today(): Date {
  const date = new Date();
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

const Main = { // eslint-disable-line @typescript-eslint/naming-convention
  /**
   *  RakutenBooks API の結果をパースして必要な情報を取り出す。
   *  紙の本かつこれから発売される情報のみに絞り込む
   *  @param [xmlDoc] xmlDoc
   *  @return
   */
  parseResult(result: IBookInfo[]): string[][] {
    const res = [];
    const todayObj = today();
    result.forEach((book) => {
      const pubDate = new Date(book.salesDate);
      if (pubDate >= todayObj) {
        res.push([book.isbn, book.title, book.itemPrice, book.salesDate, book.url]);
      }
    });
    return res;
  },

  /**
   * スプレッドシートから条件を読み出し、楽天Booksで検索し、
   * 新着があればスプレッドシートに記録し、Todoistに追加する
   */
  searchAndAddEvent(): void {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 次のターゲットを決める
    const sheet = ss.getSheetByName('INDEX');
    const range = sheet.getDataRange();
    const values = range.getValues();

    const header = values.shift();
    const nextCheckIdx = header.findIndex((e) => e === "NextCheck");

    const nextTargetIndex = values.findIndex((val) => {
      const ncheck = val[nextCheckIdx];
      if (!(ncheck instanceof Date)) return true;
      return ncheck.getTime() < Date.now();
    });
    if (nextTargetIndex < 0) return; // ターゲット候補がないので終了

    const targetRange = sheet.getRange(nextTargetIndex + 2, 1, 1, range.getLastColumn());
    const nextTarget = targetRange.getValues()[0];

    // ターゲットの条件を取得する
    const cond: ISerachConditiuoin = { type: 'book' };
    for (let i = 3; i < header.length; i += 1) {
      if (header[i] === '') break;
      if (nextTarget[i] === '') continue; // eslint-disable-line no-continue
      cond[String(header[i])] = nextTarget[i];
    }

    // 条件を元に検索
    let resultSearch: IBookInfo[];
    try {
      const config = loadConfig();
      const client = new RakutenBooks(config.RAKUTEN_APP_ID);
      resultSearch = client.search(cond);
    } catch (error) {
      console.error({ message: 'RakutenBooks#searchエラー', error });
    }
    console.info({ message: 'RakutenBooks#search結果', resultSearch });
    const result = Main.parseResult(resultSearch);

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
      targetSheet.getRange('A1:E1').setValues([['ISBN/JAN', 'Title', 'FormattedPrice', 'PublicationDate', 'URL']]);
    }
    const exists = targetSheet.getRange(`A2:A${targetSheet.getLastRow()}`).getValues().flat() as number[];
    result.forEach((rowContents) => {
      if (!exists.includes(Number(rowContents[0]))) {
        targetSheet.appendRow(rowContents);
        Main.createTask(rowContents);
      }
    });
  },

  /**
   * Todoist の買い物プロジェクトにタスクを追加する
   */
  createTask(data: string[]) {
    const config = loadConfig();
    /* eslint-disable @typescript-eslint/naming-convention */
    const item = {
      project_id: config.TODOIST_PROJECT_ID,
      content: Utilities.formatString('[「%s」購入](%s)', data[1], data[4]),
      date_string: data[3],
    };
    const note = { content: Utilities.formatString('ISBN: %s\n書名: %s\n価格: %s', data[0], data[1], data[2]) };
    /* eslint-enable @typescript-eslint/naming-convention */
    // tslint:eable:object-literal-sort-keys
    const todoistClient = new Todoist.Client(config.TODOIST_API_TOKEN);
    const res = todoistClient.addItem(item, note);
    return res;
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function execute() {
  Main.searchAndAddEvent();
}
