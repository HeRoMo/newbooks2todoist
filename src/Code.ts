import { Config } from './Config';
import { RakutenBooks, IBookInfo, ISearchCondition } from './RakutenBooks';

function today_(): Date {
  const date = new Date();
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

export class Main {
  /**
   *  RakutenBooks API の結果を紙の本かつこれから発売される情報のみに絞り込む。
   */
  static filterNewBooks(result: IBookInfo[]): IBookInfo[] {
    const todayObj = today_();
    return result.filter((book) => todayObj <= new Date(book.salesDate));
  }

  /**
   * スプレッドシートから条件を読み出し、楽天Booksで検索し、
   * 新着があればスプレッドシートに記録し、Todoistに追加する
   */
  static searchAndAddEvent(): void {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 次のターゲットを決める
    const sheet = ss.getSheetByName('INDEX');
    const range = sheet.getDataRange();
    const values = range.getValues();

    const header = values.shift();
    const nextCheckColNum = header.findIndex((e) => e === 'NextCheck');

    const nextTargetIndex = values.findIndex((val) => {
      const ncheck = val[nextCheckColNum];
      if (!(ncheck instanceof Date)) return true;
      return ncheck.getTime() < Date.now();
    });
    if (nextTargetIndex < 0) return; // ターゲット候補がないので終了

    const targetRange = sheet.getRange(nextTargetIndex + 2, 1, 1, range.getLastColumn());
    const nextTarget = targetRange.getValues()[0];

    // ターゲットの条件を取得する
    const cond: ISearchCondition = { type: 'book' };
    for (let i = 3; i < header.length; i += 1) {
      if (header[i] === '') break;
      if (nextTarget[i] === '') continue; // eslint-disable-line no-continue
      cond[String(header[i])] = nextTarget[i];
    }

    // 条件を元に楽天で検索
    let resultSearch: IBookInfo[];
    try {
      const config = Config.loadConfig();
      const client = new RakutenBooks(config.RAKUTEN_APP_ID);
      resultSearch = client.search(cond);
    } catch (error) {
      console.error({ message: 'RakutenBooks#searchエラー', error });
      throw error;
    }
    console.info({ message: 'RakutenBooks#search結果', resultSearch });
    const newBooks = Main.filterNewBooks(resultSearch);

    // IndexシートのNextCheckの更新
    const now = new Date(Date.now());
    targetRange.getCell(1, 2).setValue(now); // LastCheck
    now.setDate(now.getDate() + 7);
    targetRange.getCell(1, 3).setValue(now); // NextCheck

    if (newBooks.length === 0) return; // 検索結果に新刊本がなければ終了

    let targetSheet = ss.getSheetByName(String(nextTarget[0]));
    if (targetSheet == null) { // 結果を書き込むシートがなければ作る
      targetSheet = ss.insertSheet(nextTarget[0]);
      targetSheet.getRange('A1:E1').setValues([['ISBN/JAN', 'Title', 'FormattedPrice', 'PublicationDate', 'URL']]);
    }
    const existngIsbns = targetSheet.getRange(`A2:A${targetSheet.getLastRow()}`).getValues().flat() as number[]; // すでに登録されている本のISDNリスト
    newBooks.forEach((book) => {
      if (!existngIsbns.includes(Number(book.isbn))) {
        targetSheet.appendRow([book.isbn, book.title, book.itemPrice, book.salesDate, book.url]);
        Main.createTask(book);
      }
    });
  }

  /**
   * Todoist の買い物プロジェクトにタスクを追加する
   */
  static createTask(book: IBookInfo) {
    const config = Config.loadConfig();
    /* eslint-disable @typescript-eslint/naming-convention */
    const item = {
      project_id: config.TODOIST_PROJECT_ID,
      content: `[「${book.title}」購入](${book.url})`,
      description: `${book.author} ￥${book.itemPrice}`,
      due: { date: book.salesDate },
      labels: config.LABELS.split(','),
    };
    const note = { content: `ISBN: ${book.isbn}\n書名: ${book.title}\n著者: ${book.author}\n出版社: ${book.publisherName} ${book.seriesName}\n価格: ${book.itemPrice} 円` };
    /* eslint-enable @typescript-eslint/naming-convention */
    const todoistClient = new Todoist.Client(config.TODOIST_API_TOKEN);
    const res = todoistClient.addItem(item, note);
    return res;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function execute() {
  Main.searchAndAddEvent();
}
