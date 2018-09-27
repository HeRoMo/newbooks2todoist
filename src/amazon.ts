/**
 * Amazon Advertising API
 */
const AdvertisingAPI = {
  /**
   * 現在時刻を取得する
   * @return ISOString形式の現在時刻
   */
  timestamp(): string {
    return new Date().toISOString();
  },

  /**
   * Apazon Product Advertising APIリクエストのクエリストリングを作る
   * @param [Object] 検索条件を含むはハッシュ
   * @return キーが名前順にソートされたクエリストリング
   */
  buildQuery(hash: object): string {
    const keys = Object.keys(hash).sort();
    const query = keys.map((key) => {
      return `${key}=${encodeURIComponent(hash[key])}`;
    });
    return query.join('&');
  },

  /**
   * クエリストリングにApazon Product Advertising APIの仕様に従った署名をつける。
   * @param [String] クエリストリング
   * @return クエリストリングから計算した署名文字列
   */
  sign(query: string): string {
    const value = `GET\nwebservices.amazon.co.jp\n/onca/xml\n${query}`;
    const signature = Utilities.computeHmacSha256Signature(value, awsSecretyKey);
    const signatureStr = Utilities.base64Encode(signature);
    return encodeURIComponent(signatureStr);
  },

  /**
   *  Apazon Product Advertising API のリクエストURLを作る。
   *  必要なクエリパラメータを追加し、署名（Signature）も付加する
   *  @param [Object] queryMap 検索条件
   *  @return Apazon Product Advertising API のリクエストURL
   */
  buildUrl(queryMap: object): string {
    const baseQuery = {
      Service: 'AWSECommerceService',
      // tslint:disable-next-line:object-literal-sort-keys
      Operation: 'ItemSearch',
      SubscriptionId: awsAccessKey,
      AssociateTag: associateTag,
      Version: '2011-08-02',
      SearchIndex: 'Books',
      Sort: 'daterank',
      ResponseGroup: 'ItemAttributes',
      Timestamp: this.timestamp(),
    };

    Object.keys(queryMap).forEach((key) => {
      baseQuery[key] = queryMap[key];
    });
    const query = this.buildQuery(baseQuery);
    return `https://webservices.amazon.co.jp/onca/xml?${query}&Signature=${this.sign(query)}`;
  },

  /**
   *  Apazon Product Advertising API にリクエストを送信し、ItemSearchを実行する。
   *  @param [Object] queryCond 検索条件
   *  @return 検索結果を含むXMLDocオブジェクト
   */
  execItemSearch(queryCond: object): GoogleAppsScript.XML_Service.Document {
    const url = this.buildUrl(queryCond);
    console.info({message: 'ItemSearch URL', url});
    try {
      const response = UrlFetchApp.fetch(url);
      return XmlService.parse(response.getContentText());
    } catch (error) {
      throw error;
    }
  },
};

export default AdvertisingAPI;
