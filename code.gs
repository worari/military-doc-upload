
/**
 * Code.gs - ระบบจัดการฝั่ง Server (Google Apps Script) V.2.1 (Fix Login)
 */

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
  const data = ws.getDataRange().getDisplayValues(); // ใช้ DisplayValues เพื่อให้ได้ String เสมอ
  
  // เช็ค username (ตัดช่องว่าง)
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
    // ใช้ getDisplayValues เพื่อป้องกันปัญหาเรื่องตัวเลข/Text
    const data = ws.getDataRange().getDisplayValues(); 

    const inputUser = String(username).trim();
    const inputPass = String(password).trim();

    // เริ่มวนลูปที่ index 1 (ข้าม Header)
    for (let i = 1; i < data.length; i++) {
      let sheetUser = String(data[i][0]).trim();
      let sheetPass = String(data[i][1]).trim();
      let sheetStatus = String(data[i][4]).trim();
      let sheetRole = String(data[i][3]).trim();

      // เปรียบเทียบรหัสผ่าน (Case Sensitive)
      if (sheetUser === inputUser && sheetPass === inputPass) {
        
        // เช็คสถานะ (ไม่สนใจตัวพิมพ์เล็กใหญ่ เช่น approved = Approved)
        if (sheetStatus.toLowerCase() !== 'approved') {
          return { status: false, message: 'บัญชีรออนุมัติ หรือถูกระงับ (สถานะปัจจุบัน: ' + sheetStatus + ')' };
        }
        
        return { 
          status: true, 
          user: { 
            username: sheetUser, 
            name: data[i][2], 
            role: sheetRole 
          } 
        };
      }
    }
    return { status: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  } catch (e) {
    return { status: false, message: 'Server Error: ' + e.toString() };
  }
}

// --- ฟังก์ชันอื่นๆ คงเดิม (ย่อไว้) ---
function getUserList() { return getDb().getSheetByName('Users').getDataRange().getValues().slice(1); }

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

// --- ส่วนจัดการไฟล์และ Request ---
// (Copy โค้ดส่วน uploadFileToDrive, submitRequest, getRequests, updateRequestStatus, generateDoc, getDashboardStats จากไฟล์เดิมมาวางตรงนี้ได้เลยครับ เพื่อประหยัดพื้นที่)
// ถ้าไม่มีการแก้ไขส่วนนี้ ให้ใช้โค้ดเดิมในส่วนล่างได้เลยครับ แต่ถ้าจะให้สมบูรณ์ ผมแปะส่วนที่จำเป็นต้องใช้ในการ Login/Load ให้ครับ

function getRequests(userInfo) {
  const ws = getDb().getSheetByName('Requests');
  const data = ws.getDataRange().getValues().slice(1);
  if (['Admin', 'Checker', 'Approver'].includes(userInfo.role)) {
    return data;
  } else {
    return data.filter(row => row[1] === userInfo.username);
  }
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

// --- (สำคัญ) เพิ่ม uploadFileToDrive และ submitRequest จากไฟล์เดิมมาด้วยนะครับ ---
// หากคุณใช้ไฟล์เดิมอยู่แล้ว ให้เปลี่ยนแค่ฟังก์ชัน loginUser, registerUser, approveUserAction ด้านบนก็พอครับ
