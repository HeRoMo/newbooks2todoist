import { Main } from '../src/Code';
import { IBookInfo, ISearchCondition } from '../src/RakutenBooks';

// zero padding
function zp(num: number): string {
  return `'0${num}`.slice(-2);
}

function testDate(deltaDay: number): Date {
  const now = Date.now();
  const date = new Date(now + deltaDay * 1000 * 60 * 60 * 24);
  return date;
}

function testDateStr(deltaDay: number): string {
  const date = testDate(deltaDay);
  return `${date.getFullYear()}-${zp(date.getMonth() + 1)}-${zp(date.getDate())}`;
}

jest.mock('../src/Config', () => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  Config: {
    loadConfig: jest.fn().mockReturnValue({
      TODOIST_API_TOKEN: '',
      TODOIST_PROJECT_ID: '',
      LABELS: 'shopping,other',
      RAKUTEN_APP_ID: 'API-KEY',
    }),
  },
  /* eslint-enable @typescript-eslint/naming-convention */
}));

const rakutenApiResult: IBookInfo[] = [
  { title: 'とある本(1)', seriesName: 'シリーズ名', author: '著者', isbn: '1111111111111', salesDate: testDateStr(-1), itemPrice: 500, publisherName: '出版社', url: 'http://example.com/vol1' },
  { title: 'とある本(2)', seriesName: 'シリーズ名', author: '著者', isbn: '2222222222222', salesDate: testDateStr(1), itemPrice: 500, publisherName: '出版社', url: 'http://example.com/vol2' },
  { title: 'とある本(3)', seriesName: 'シリーズ名', author: '著者', isbn: '3333333333333', salesDate: testDateStr(10), itemPrice: 500, publisherName: '出版社', url: 'http://example.com/vol3' },
];
const rakutenApiResultOther: IBookInfo[] = [
  { title: '別の本(1)', seriesName: '別のシリーズ名', author: '別の著者', isbn: '8888888888888', salesDate: testDateStr(-10), itemPrice: 500, publisherName: '別の出版社', url: 'http://example.com/other1' },
  { title: '別の本(2)', seriesName: '別のシリーズ名', author: '別の著者', isbn: '9999999999999', salesDate: testDateStr(-1), itemPrice: 500, publisherName: '別の出版社', url: 'http://example.com/other2' },
];
const rakutenApiResultNew: IBookInfo[] = [
  { title: 'はじめての本(1)', seriesName: 'はじめてのシリーズ名', author: 'はじめての著者', isbn: '0000000000000', salesDate: testDateStr(10), itemPrice: 500, publisherName: 'はじめての出版社', url: 'http://example.com/new1' },
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
      if (cond.title === 'エラー本') {
        throw new Error('Rakuten API error');
      }
      return rakutenApiResultNew;
    }),
  })),
}));

describe('#searchAndAddEvent', () => {
  function prepareMocks(index: (string|Date)[][], isbns: number[][]) {
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
      const item = { project_id: '', content: `[「${book.title}」購入](${book.url})`, description: `${book.author} ￥${book.itemPrice}`, due: { date: book.salesDate }, labels: ['shopping', 'other'] };
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
        ['はじめての本', '', '', 'book', 'はじめての本', '別の著者', '別の出版社'],
      ];
      prepareMocks(index, []);
    });

    test('Todoが追加される', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(1);
      const book = rakutenApiResultNew[0];
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const item = { project_id: '', content: `[「${book.title}」購入](${book.url})`, description: `${book.author} ￥${book.itemPrice}`, due: { date: book.salesDate }, labels: ['shopping', 'other'] };
      const content = `ISBN: ${book.isbn}\n書名: ${book.title}\n著者: ${book.author}\n出版社: ${book.publisherName} ${book.seriesName}\n価格: ${book.itemPrice} 円`;
      expect(mockTodoistCli.addItem).nthCalledWith(1, item, { content });
    });
  });

  describe('ターゲットがない場合', () => {
    beforeEach(() => {
      const index = [
        ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
        ['チェック済みの本', testDate(-10), testDate(10), 'book', 'チェック済みの本', 'チェック済みの著者', 'チェック済みの出版社'],
      ];
      prepareMocks(index, []);
    });

    test('途中で終わる', () => {
      expect(Main.searchAndAddEvent).not.toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(0);
    });
  });

  describe('Rakuten API でエラーが発生する', () => {
    beforeEach(() => {
      const index = [
        ['SheetName', 'LastCheck', 'NextCheck', 'type', 'title', 'author', 'publisherName'],
        ['エラー本', testDate(-10), testDate(-2), 'book', 'エラー本', '著者', '出版社'],
      ];
      prepareMocks(index, []);
    });

    test('例外が発生して終わる', () => {
      expect(Main.searchAndAddEvent).toThrow();
      expect(mockTodoistCli.addItem).toHaveBeenCalledTimes(0);
    });
  });
});
