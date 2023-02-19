import { Main } from '../src/Code';
import { IBookInfo } from '../src/RakutenBooks';

// zero padding
function zp(num: number): string {
  return `'0${num}`.slice(-2);
}

function testDate(deltaDay: number): string {
  const now = Date.now();
  const date = new Date(now + deltaDay * 1000 * 60 * 60 * 24);
  return `${date.getFullYear()}-${zp(date.getMonth() + 1)}-${zp(date.getDate())}`;
}

jest.mock('../src/Config', () => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  Config: {
    loadConfig: jest.fn().mockReturnValue({
      TODOIST_API_TOKEN: '',
      TODOIST_PROJECT_ID: '',
      RAKUTEN_APP_ID: 'API-KEY',
    }),
  },
  /* eslint-enable @typescript-eslint/naming-convention */
}));

const rakutenApiResult: IBookInfo[] = [
  { title: 'とある本(1)', seriesName: 'シリーズ名', author: '著者', isbn: '1111111111111', salesDate: testDate(-1), itemPrice: 500, publisherName: '出版社', url: 'http://example.com/vol1' },
  { title: 'とある本(2)', seriesName: 'シリーズ名', author: '著者', isbn: '2222222222222', salesDate: testDate(1), itemPrice: 500, publisherName: '出版社', url: 'http://example.com/vol2' },
  { title: 'とある本(3)', seriesName: 'シリーズ名', author: '著者', isbn: '3333333333333', salesDate: testDate(10), itemPrice: 500, publisherName: '出版社', url: 'http://example.com/vol3' },
];
jest.mock('../src/RakutenBooks', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  RakutenBooks: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue(rakutenApiResult),
  })),
}));

describe('#searchAndAddEvent', () => {
  function prepareMocks(isbns: number[][]) {
    const mockIndexSheet = {
      getDataRange: jest.fn(() => ({
        getValues: jest.fn().mockReturnValue([
          ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
          ['とある本', testDate(10), testDate(-1), 'book', 'とある本', '著者', '出版社'],
        ]),
        getLastColumn: jest.fn().mockReturnValue(7),
      })),
      getRange: jest.fn(() => ({
        getValues: jest.fn().mockReturnValue([
          [],
        ]),
        getCell: jest.fn().mockImplementation(() => ({
          setValue: jest.fn(),
        })),
      })),
    };

    SpreadsheetApp.getActiveSpreadsheet = jest.fn().mockImplementation(() => ({
      getSheetByName: jest.fn((name: string) => {
        if (name === 'INDEX') {
          return mockIndexSheet;
        }
        return {
          getLastRow: jest.fn(),
          getRange: jest.fn().mockImplementation(() => ({
            getValues: jest.fn().mockReturnValue(isbns),
          })),
          appendRow: jest.fn(),
        };
      }),
      addDeveloperMetadata: jest.fn(),
    }));
  }

  const mockTodoistCli = {
    addItem: jest.fn(),
  };
  Todoist.Client = jest.fn().mockImplementation(() => mockTodoistCli);

  describe('追加する本がない場合', () => {
    prepareMocks([[1111111111111], [2222222222222], [3333333333333]]);

    test('result', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(0);
    });
  });

  test('追加する本がある場合', () => {
    prepareMocks([[1111111111111], [2222222222222]]);

    expect(Main.searchAndAddEvent).not.toThrow();
    expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(1);
    const book = rakutenApiResult[2];
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const item = { project_id: '', content: `[「${book.title}」購入](http://example.com/vol3)`, description: `${book.author} ￥${book.itemPrice}`, due: { date: book.salesDate } };
    const content = `ISBN: ${book.isbn}\n書名: ${book.title}\n著者: ${book.author}\n出版社: ${book.publisherName} ${book.seriesName}\n価格: ${book.itemPrice} 円`;
    expect(mockTodoistCli.addItem).nthCalledWith(1, item, { content });
  });
});
