export interface IBookInfo {
  title: string;
  seriesName: string;
  author: string;
  isbn: string;
  salesDate: string;
  itemPrice: number;
  url: string;
}

export interface ISerachConditiuoin {
  title: string;
  seriesName: string;
  author: string;
  salesDate: string;
  itemPrice: string;
  itemUrl: string;
  type: 'book'|'magazine';
}

class RakutenBooks {
  private static readonly bookEndpoint = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404';
  private static readonly magazineEndpoint = 'https://app.rakuten.co.jp/services/api/BooksMagazine/Search/20170404';

  private appId: string;
  private baseQuery = {applicationId: null, format: 'json', sort: '-releaseDate'};

  public constructor(appId: string) {
    this.appId = appId;
    this.baseQuery.applicationId = this.appId;
  }

  /**
   * 与えられた条件で本を検索する。
   * tyoe=magazineの場合、書籍検索と雑誌検索両方実行した結果を返す。
   * @param query 検索条件
   */
  public search(query: ISerachConditiuoin): IBookInfo[] {
    const books = this.execSearch(query);
    if (query.type === 'magazine') {
      books.concat(this.execSearch(query));
    }
    return books;
  }

  /**
   * Rakuten Books APIで検索する。
   * @param type 検索のタイプ
   * @param query 検索条件
   */
  private execSearch(query: ISerachConditiuoin): IBookInfo[] {
    const type = query.type || 'book';
    const endpoint = (type === 'book') ? RakutenBooks.bookEndpoint : RakutenBooks.magazineEndpoint;
    const url = `${endpoint}?${this.makeQuery(query)}`;
    const response = UrlFetchApp.fetch(url);
    const result = JSON.parse(response.getContentText());
    const books = result.Items.map((item: any) => {
      const {title, seriesName, author, salesDate, itemPrice, itemUrl} = item.Item;
      const isbn = (type === 'book') ? item.Item.isbn : item.Item.jan;
      const date = salesDate.slice(0, -1).replace(/年|月/g, '-');
      return {title, seriesName, author, isbn, salesDate: date, itemPrice, url: itemUrl};
    });
    console.info({url, books});
    return books;
  }

  /**
   * APIリクエストのクエリーパラメータを生成する。
   * @param query
   */
  private makeQuery(query: ISerachConditiuoin): string {
    const queryParams = {...this.baseQuery, ...query};
    delete queryParams.type;
    const keys = Object.keys(queryParams);
    const queries = keys.map((key) => `${key}=${encodeURIComponent(queryParams[key])}`);
    return queries.join('&');
  }
}

export default RakutenBooks;
