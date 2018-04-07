"use strict"

/**
 * Amazon Advertising API
 */
var AdvertisingAPI = {
  
  /**
   * 現在時刻を取得する
   * @return ISOString形式の現在時刻
   */
  timestamp: function(){
    return new Date().toISOString()
  },
  
  /**
   * Apazon Product Advertising APIリクエストのクエリストリングを作る
   * @param [Object] 検索条件を含むはハッシュ
   * @return キーが名前順にソートされたクエリストリング
   */
  buildQuery: function(hash){
    var keys = Object.keys(hash).sort();
    var query = keys.map(function(key){
      return key+'='+encodeURIComponent(hash[key])
    })
    return query.join('&')
  },
  
  /**
   * クエリストリングにApazon Product Advertising APIの仕様に従った署名をつける。
   * @param [String] クエリストリング
   * @return クエリストリングから計算した署名文字列
   */
  sign: function(query) {
    var value = "GET\n"+
      "webservices.amazon.co.jp\n"+
        "/onca/xml\n"+query
        
        var signature = Utilities.computeHmacSha256Signature(value,awsSecretyKey);
    signature = Utilities.base64Encode(signature);
    return encodeURIComponent(signature);
  },
  
  /**
   *  Apazon Product Advertising API のリクエストURLを作る。
   *  必要なクエリパラメータを追加し、署名（Signature）も付加する
   *  @param [Object] queryMap 検索条件
   *  @return Apazon Product Advertising API のリクエストURL
   */
  buildUrl: function(queryMap){
    var baseQuery ={
      Service:"AWSECommerceService",
      Operation:"ItemSearch",
      SubscriptionId:awsAccessKey,
      AssociateTag:associateTag,
      Version:"2011-08-02",
      SearchIndex:"Books",
      Sort:'daterank',
      ResponseGroup:'ItemAttributes',
      Timestamp: this.timestamp()
    }
    
    Object.keys(queryMap).forEach(function(key){
      baseQuery[key] = queryMap[key]
    });
    var query = this.buildQuery(baseQuery)
    return "https://webservices.amazon.co.jp/onca/xml?"+query+'&Signature='+this.sign(query)
  },
  
  /**
   *  Apazon Product Advertising API にリクエストを送信し、ItemSearchを実行する。
   *  @param [Object] queryCond 検索条件
   *  @return 検索結果を含むXMLDocオブジェクト
   */
  execItemSearch: function(queryCond){
    var url = this.buildUrl(queryCond)
    Logger.log('ItemSearch URL: %s', url)
    Util.log("INFO","ItemSearch URL", url)
    try {
      var response = UrlFetchApp.fetch(url)
      return XmlService.parse(response.getContentText());
    } catch(error){
      throw error;
    }
  }
}


