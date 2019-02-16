export interface IBookInfo {
  title: string;
  seriesName: string;
  author: string;
  isbn: string;
  salesDate: string;
  itemPrice: number;
  url: string;
}
class RakutenBooks {
  private static readonly endpoint = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404';

  private appId: string;
  private baseQuery = {applicationId: null, format: 'json', sort: '-releaseDate'};

  public constructor(appId: string) {
    this.appId = appId;
    this.baseQuery.applicationId = this.appId;
  }

  public search(query: {[key: string]: string}): IBookInfo[] {
    const url = `${RakutenBooks.endpoint}?${this.makeQuery(query)}`;
    const response = UrlFetchApp.fetch(url);
    const result = JSON.parse(response.getContentText());
    const books = result.Items.map((item: any) => {
      const {title, seriesName, author, isbn, salesDate, itemPrice, itemUrl} = item.Item;
      const date = salesDate.slice(0, -1).replace(/年|月/g, '-');
      return {title, seriesName, author, isbn, salesDate: date, itemPrice, url: itemUrl};
    });
    console.info({books});
    return books;
  }

  private makeQuery(query: {[key: string]: string}): string {
    const queryParams = {...this.baseQuery, ...query};
    const keys = Object.keys(queryParams);
    const queries = keys.map((key) => `${key}=${encodeURIComponent(queryParams[key])}`);
    return queries.join('&');
  }
}

export default RakutenBooks;
