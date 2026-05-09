# Google Sheets Setup Guide

Follow these steps to set up your Expense Tracker database.

## 1. Create the Spreadsheet
Create a new Google Sheet and rename the first sheet to `Transactions`.
Add the following headers in the first row:
`ID | Date | Description | Category | Method | Flow | Amount`

**Note your Sheet ID**: Copy the long string in your browser address bar between `/d/` and `/edit`.
Example: `https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F/edit` -> Sheet ID is `1A2B3C4D5E6F`.

## 2. API Key vs Apps Script
- **API Key (Read-Only)**: Used to fetch your data quickly. You have already provided this.
- **Apps Script (Write-Access)**: Used to *save* new transactions. You **must** set this up to enable adding new entries.
2. Delete any existing code and paste the following script:

```javascript
/**
 * Expense Tracker Backend Script
 * Handles GET (fetch) and POST (save) requests from the web app.
 */

const DB = {
  Transactions: 'Transactions',
  Categories: 'Categories',
  Settings: 'Settings',
  PartnerIncome: 'PartnerIncome'
};

function doGet(e) {
  const sheetName = e.parameter.sheet || DB.Transactions;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  if (sheetName === DB.Settings) {
    let settings = {};
    data.forEach(row => { if(row[0]) settings[row[0]] = row[1]; });
    return ContentService.createTextOutput(JSON.stringify(settings)).setMimeType(ContentService.MimeType.JSON);
  }

  const json = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header.toLowerCase()] = row[i];
    });
    if (obj.date instanceof Date) {
      obj.date = Utilities.formatDate(obj.date, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(json.reverse()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const sheetName = params.sheet || DB.Transactions;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    let success = false;
    
    if (params.action === 'delete') {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(params.id) || String(data[i][0]) === String(params.name)) { 
          sheet.deleteRow(i + 1);
          success = true;
          break;
        }
      }
    } else if (params.action === 'update') {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(params.id) || String(data[i][0]) === String(params.originalName)) {
          let rowData = [];
          if (sheetName === DB.Transactions) {
            rowData = [params.id, params.date, params.description, params.category, params.method, params.flow, params.amount];
          } else if (sheetName === DB.PartnerIncome) {
            rowData = [params.id, params.date, params.description, params.total_amount, params.percentage, params.user_share, params.status, params.method];
          } else {
            rowData = [params.name, params.icon, params.color];
          }
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          success = true;
          break;
        }
      }
    } else if (params.action === 'update_settings') {
      Object.keys(params).forEach(key => {
        if (key === 'action' || key === 'sheet') return;
        let found = false;
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] == key) {
            sheet.getRange(i + 1, 2).setValue(params[key]);
            found = true; break;
          }
        }
        if (!found) sheet.appendRow([key, params[key]]);
      });
      success = true;
    } else {
      let row = [];
      if (sheetName === DB.Transactions) {
        row = [String(Date.now()), params.date, params.description, params.category, params.method, params.flow, params.amount];
      } else if (sheetName === DB.PartnerIncome) {
        row = [String(Date.now()), params.date, params.description, params.total_amount, params.percentage, params.user_share, params.status, params.method];
      } else {
        row = [params.name, params.icon, params.color];
      }
      sheet.appendRow(row);
      success = true;
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: success ? 'success' : 'not_found' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

```

## 3. Deploy the Script
1. Click **Deploy** > **New Deployment**.
2. Select **Web App** as the type.
3. Description: `Expense Tracker API`.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Click **Deploy**.
7. Copy the **Web App URL**.

## 4. Connect to Web App
1. Open `assets/js/config.js` in your project.
2. Paste the URL into the `SCRIPT_URL` field:
   ```javascript
   const CONFIG = {
       SCRIPT_URL: 'YOUR_URL_HERE',
       // ...
   };
   ```
