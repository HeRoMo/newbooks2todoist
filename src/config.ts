
function loadConfig(): {[key: string]: string} {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName('CONFIG');
  const range = sheet.getDataRange();
  const values = range.getValues();

  const config: {[key: string]: string} = {};
  for (const val of values) {
    config[String(val[0])] = String(val[1]);
  }
  return config;
}

export default loadConfig;
