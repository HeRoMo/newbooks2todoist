export function convertIsbn13To10(isbn13: string): string {
  // 念のため13桁のISBN(978始まり)であることを確認
  if (isbn13.length !== 13 || !isbn13.startsWith("978")) {
    return "";
  }

  // 先頭の '978' と末尾のチェックディジット(1桁)を除いた9桁を抽出
  const core = isbn13.substring(3, 12);

  // ISBN-10用のチェックディジットを計算
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(core[i], 10) * (10 - i);
  }

  const mod = sum % 11;
  let checkDigit = "";
  if (mod === 0) {
    checkDigit = "0";
  } else if (11 - mod === 10) {
    checkDigit = "X";
  } else {
    checkDigit = (11 - mod).toString();
  }

  // 9桁の文字列に再計算したチェックディジットを結合
  return core + checkDigit;
}
