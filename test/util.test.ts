import { convertIsbn13To10 } from '../src/util';

describe('convertIsbn13To10', () => {
  test('success', () => {
    const subject = (): string => {
      return convertIsbn13To10('9781111111111')
    }
    expect(subject).not.toThrow();
    expect(subject()).toEqual('1111111111');
  })
  test('not isbn13', () => {
    const subject = (): string => {
      return convertIsbn13To10('1111111111111')
    }
    expect(subject).not.toThrow();
    expect(subject()).toEqual('');
  })
})
