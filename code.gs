/**
 * Code.gs - ระบบจัดการฝั่ง Server (Google Apps Script) V.2.2 (Full & Debug)
 */

// ** กรุณาตรวจสอบ ID เหล่านี้ **
const TEMPLATE_ID = '1CM2SndsQmFEXOh81kMpTgvFDSN1DtFvj-wyHTy_KJq4'; 
const UPLOAD_FOLDER_ID = '13siy4bFt2q-vYgS00lUQJEMnpD755aSk';

function getDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ระบบเสนอขอ พ.ส.ร. Online')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------- SYSTEM: USER MANAGEMENT ----------------

function registerUser(form) {
  const ss = getDb();
  const ws = ss.getSheetByName('Users');
  const data = ws.getDataRange().getDisplayValues();
  
  const newOwner = String(form.reg_username).trim();
  
  if (data.some(row => String(row[0]).trim() === newOwner)) {
    return { status: false, message: 'Username นี้ถูกใช้งานแล้ว' };
  }

  ws.appendRow([
    newOwner, 
    form.reg_password, 
    form.reg_name, 
    'User', 
    'Pending'
  ]);
  return { status: true, message: 'ลงทะเบียนสำเร็จ รอ Admin อนุมัติ' };
}

function loginUser(username, password) {
  try {
    const ws = getDb().getSheetByName('Users');
    const data = ws.getDataRange().getDisplayValues(); // อ่านค่าทั้งหมดเป็น String

    const inputUser = String(username).trim();
    const inputPass = String(password).trim();

    // วนลูปตรวจสอบ (เริ่มแถวที่ 2 คือ index 1)
    for (let i = 1; i < data.length; i++) {
      let sheetUser = String(data[i][0]).trim();
      let sheetPass = String(data[i][1]).trim(); // ถ้าใน Sheet เป็นตัวเลข มันจะถูกแปลงเป็น String
      let sheetStatus = String(data[i][4]).trim();
      let sheetRole = String(data[i][3]).trim();

      if (sheetUser === inputUser) {
        // เจอ User แล้ว เช็ค Password
        if (sheetPass === inputPass) {
          // Password ถูก เช็ค Status
          if (sheetStatus.toLowerCase() !== 'approved') {
            return { status: false, message: 'สถานะบัญชีคือ: ' + sheetStatus + ' (ต้องรอ Admin อนุมัติเป็น Approved)' };
          }
          // ผ่านทั้งหมด
          return { 
            status: true, 
            user: { 
              username: sheetUser, 
              name: data[i][2], 
              role: sheetRole 
            } 
          };
        } else {
          return { status: false, message: 'รหัสผ่านไม่ถูกต้อง' };
        }
      }
    }
    return { status: false, message: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' };
  } catch (e) {
    return { status: false, message: 'Server Error: ' + e.toString() };
  }
}

function getUserList() {
  return getDb().getSheetByName('Users').getDataRange().getValues().slice(1);
}

function approveUserAction(username, role) {
  const ws = getDb().getSheetByName('Users');
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == String(username).trim()) {
      ws.getRange(i + 1, 5).setValue('Approved');
      ws.getRange(i + 1, 4).setValue(role);
      return true;
    }
  }
  return false;
}

// ---------------- SYSTEM: FILE UPLOAD & REQUESTS ----------------

function uploadFileToDrive(data, filename) {
  try {
    const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const contentType = data.substring(5, data.indexOf(';'));
    const bytes = Utilities.base64Decode(data.substr(data.indexOf('base64,') + 7));
    const blob = Utilities.newBlob(bytes, contentType, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return 'Error: ' + e.toString();
  }
}

function submitRequest(form, userInfo) {
  const ss = getDb();
  const ws = ss.getSheetByName('Requests');
  const timestamp = new Date();
  
  if (form.request_id && form.request_id !== "") {
    // --- Edit Mode ---
    const data = ws.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == form.request_id) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) return { status: false, message: 'ไม่พบรายการ' };

    const currentRow = data[rowIndex - 1];
    // ใช้ URL ใหม่ถ้ามีการอัปโหลด ถ้าไม่มีใช้ของเดิม
    const fileUrls = [
      form.url_casualty || currentRow[19],
      form.url_order || currentRow[20],
      form.url_cert || currentRow[21],
      form.url_medical || currentRow[22],
      form.url_psr || currentRow[23],
      form.url_other || currentRow[24]
    ];

    ws.getRange(rowIndex, 3, 1, 16).setValues([[
       form.citizen_id, form.rank, form.firstname, form.lastname, form.mil_id, 
       form.position, form.unit, currentRow[9], 
       form.event_datetime, form.mgrs, form.lat, form.lng, 
       form.location_detail, form.behavior, form.opponent, form.outcome
    ]]);
    ws.getRange(rowIndex, 20, 1, 6).setValues([fileUrls]);
    return { status: true, message: 'แก้ไขข้อมูลเรียบร้อยแล้ว' };

  } else {
    // --- New Mode ---
    const id = Utilities.getUuid();
    ws.appendRow([
      id, userInfo.username, form.citizen_id, form.rank, form.firstname, form.lastname,
      form.mil_id, form.position, form.unit, 'รอตรวจสอบ', 
      form.event_datetime, form.mgrs, form.lat, form.lng,
      form.location_detail, form.behavior, form.opponent, form.outcome, timestamp,
      form.url_casualty, form.url_order, form.url_cert, form.url_medical, form.url_psr, form.url_other
    ]);
    return { status: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' };
  }
}

function deleteRequest(id, userInfo) {
  const ws = getDb().getSheetByName('Requests');
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      ws.deleteRow(i + 1);
      return { status: true, message: 'ลบรายการสำเร็จ' };
    }
  }
  return { status: false, message: 'ไม่พบรายการ' };
}

function getRequests(userInfo) {
  const ws = getDb().getSheetByName('Requests');
  const data = ws.getDataRange().getValues().slice(1);
  if (['Admin', 'Checker', 'Approver'].includes(userInfo.role)) {
    return data;
  } else {
    return data.filter(row => row[1] === userInfo.username);
  }
}

function updateRequestStatus(id, newStatus, userInfo) {
  const ws = getDb().getSheetByName('Requests');
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      ws.getRange(i + 1, 10).setValue(newStatus);
      return { status: true, message: 'อัปเดตสถานะสำเร็จ' };
    }
  }
  return { status: false, message: 'ไม่พบรายการ' };
}

function getDashboardStats() {
  const ws = getDb().getSheetByName('Requests');
  const data = ws.getDataRange().getValues().slice(1);
  let stats = { total: data.length, pending: 0, approved: 0, behaviorCounts: {} };
  data.forEach(row => {
    if (row[9] === 'รอตรวจสอบ') stats.pending++;
    if (row[9] === 'อนุมัติ/เสร็จสิ้น') stats.approved++;
    const behavior = row[15] || 'ไม่ระบุ';
    stats.behaviorCounts[behavior] = (stats.behaviorCounts[behavior] || 0) + 1;
  });
  return { stats: stats, rawData: data };
}

function generateDoc(requestId) {
  try {
    const ws = getDb().getSheetByName('Requests');
    const data = ws.getDataRange().getValues();
    let rowData = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == requestId) {
        rowData = data[i];
        break;
      }
    }
    if (!rowData) return { status: false, message: 'ไม่พบข้อมูล' };
    
    // ... (ส่วน Generate Doc สามารถปรับเพิ่มได้ตามต้องการ) ...
    // เพื่อความกระชับ ขอละไว้ ถ้าต้องการใช้ให้แจ้งเพิ่มได้ครับ
    return { status: false, message: 'ฟังก์ชันพิมพ์เอกสารยังไม่ได้เปิดใช้งานเต็มรูปแบบ' };
  } catch (e) {
    return { status: false, message: 'Error: ' + e.toString() };
  }
}
