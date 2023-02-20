import { Main } from '../src/Code';
import { IBookInfo, ISearchCondition } from '../src/RakutenBooks';

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
const rakutenApiResultOther: IBookInfo[] = [
  { title: '別の本(1)', seriesName: '別のシリーズ名', author: '別の著者', isbn: '8888888888888', salesDate: testDate(-10), itemPrice: 500, publisherName: '別の出版社', url: 'http://example.com/other1' },
  { title: '別の本(2)', seriesName: '別のシリーズ名', author: '別の著者', isbn: '9999999999999', salesDate: testDate(-1), itemPrice: 500, publisherName: '別の出版社', url: 'http://example.com/other2' },
];
const rakutenApiResultNew: IBookInfo[] = [
  { title: 'はじめての本(1)', seriesName: 'はじめてのシリーズ名', author: 'はじめての著者', isbn: '0000000000000', salesDate: testDate(10), itemPrice: 500, publisherName: 'はじめての出版社', url: 'http://example.com/new1' },
];
jest.mock('../src/RakutenBooks', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  RakutenBooks: jest.fn().mockImplementation(() => ({
    search: jest.fn((cond: ISearchCondition) => {
      if (cond.title === 'とある本') {
        return rakutenApiResult;
      }
      if (cond.title === '別の本') {
        return rakutenApiResultOther;
      }
      return rakutenApiResultNew;
    }),
  })),
}));

describe('#searchAndAddEvent', () => {
  function prepareMocks(index: string[][], isbns: number[][]) {
    const mockIndexSheet = {
      getDataRange: jest.fn(() => ({
        getValues: jest.fn().mockReturnValue(index),
        getLastColumn: jest.fn().mockReturnValue(7),
      })),
      getRange: jest.fn(() => ({
        getValues: jest.fn().mockReturnValue([index[index.length - 1]]),
        getCell: jest.fn().mockImplementation(() => ({
          setValue: jest.fn(),
        })),
      })),
    };

    const insertedSheet = {
      getRange: jest.fn((range: string) => {
        if (range === 'A1:E1') {
          return {
            setValues: jest.fn(),
          };
        }
        return {
          getValues: jest.fn().mockReturnValue([]),
        };
      }),
      getLastRow: jest.fn().mockReturnValue(1),
      appendRow: jest.fn(),
    };

    SpreadsheetApp.getActiveSpreadsheet = jest.fn().mockImplementation(() => ({
      getSheetByName: jest.fn((name: string) => {
        if (name === 'INDEX') {
          return mockIndexSheet;
        }
        if (name === 'とある本' || name === '別の本') {
          return {
            getLastRow: jest.fn(),
            getRange: jest.fn().mockImplementation(() => ({
              getValues: jest.fn().mockReturnValue(isbns),
            })),
            appendRow: jest.fn(),
          };
        }
        return null;
      }),
      insertSheet: jest.fn(() => (insertedSheet)),
    }));
  }

  const mockTodoistCli = {
    addItem: jest.fn(),
  };
  Todoist.Client = jest.fn().mockImplementation(() => mockTodoistCli);

  describe('追加する本がない場合', () => {
    beforeEach(() => {
      const index = [
        ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
        ['とある本', testDate(-10), testDate(-2), 'book', 'とある本', '著者', '出版社'],
      ];
      prepareMocks(index, [[1111111111111], [2222222222222], [3333333333333]]);
    });

    test('Todoは追加されない', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(0);
    });
  });

  describe('追加する本がある場合', () => {
    beforeEach(() => {
      const index = [
        ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
        ['とある本', testDate(-10), testDate(-2), 'book', 'とある本', '著者', '出版社'],
      ];
      prepareMocks(index, [[1111111111111], [2222222222222]]);
    });

    test('Todoが追加される', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(1);
      const book = rakutenApiResult[2];
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const item = { project_id: '', content: `[「${book.title}」購入](${book.url})`, description: `${book.author} ￥${book.itemPrice}`, due: { date: book.salesDate } };
      const content = `ISBN: ${book.isbn}\n書名: ${book.title}\n著者: ${book.author}\n出版社: ${book.publisherName} ${book.seriesName}\n価格: ${book.itemPrice} 円`;
      expect(mockTodoistCli.addItem).nthCalledWith(1, item, { content });
    });
  });

  describe('新刊がない場合', () => {
    beforeEach(() => {
      const index = [
        ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
        ['別の本', testDate(-10), testDate(-2), 'book', '別の本', '別の著者', '別の出版社'],
      ];
      prepareMocks(index, []);
    });
    test('Todoは追加されない', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(0);
    });
  });

  describe('はじめての本の場合', () => {
    beforeEach(() => {
      const index = [
        ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
        ['はじめての本', testDate(-10), testDate(-2), 'book', 'はじめての本', '別の著者', '別の出版社'],
      ];
      prepareMocks(index, []);
    });

    test('Todoが追加される', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(1);
      const book = rakutenApiResultNew[0];
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const item = { project_id: '', content: `[「${book.title}」購入](${book.url})`, description: `${book.author} ￥${book.itemPrice}`, due: { date: book.salesDate } };
      const content = `ISBN: ${book.isbn}\n書名: ${book.title}\n著者: ${book.author}\n出版社: ${book.publisherName} ${book.seriesName}\n価格: ${book.itemPrice} 円`;
      expect(mockTodoistCli.addItem).nthCalledWith(1, item, { content });
    });
  });
});
