import { useState } from 'react';
import axios from 'axios';

export default function UploadPage() {
  const [files, setFiles] = useState({});
  const [idcard, setIdcard] = useState('');
  const [message, setMessage] = useState('');
  const [modalFile, setModalFile] = useState(null);

  const fileLabels = [
    'สด.3', 'สด.8', 'คำสั่งบรรจุ', 'นนส.', 'คำสั่งบรจุเข้ารับราชการ',
    'คำสั่งให้ออกจากราชการ', 'คำสั่งพ้น', 'คำสั่งรับโอน', 'คำสั่งปรับย้าย',
    'ประวัติรับราชการ (ทบ.100)', 'เอกสารอื่นๆ'
  ];

  const handleChange = (label, file) => {
    setFiles(prev => ({ ...prev, [label]: file }));
  };

  const handleRemove = (label) => {
    const newFiles = { ...files };
    delete newFiles[label];
    setFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (!/^\d{13}$/.test(idcard)) {
      setMessage('กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง');
      return;
    }

    const token = 'your_secret_token';
    const formData = new FormData();
    formData.append('idcard', idcard);
    for (const label of Object.keys(files)) {
      formData.append('files', files[label], `${idcard}_${label}_${files[label].name}`);
    }

    try {
      const res = await axios.post('http://localhost:3000/api/upload-multiple', formData, {
        headers: {
          'Authorization': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('อัปโหลดสำเร็จ');
    } catch (err) {
      setMessage('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">อัปโหลดเอกสารราชการ</h1>

      <div className="mb-4">
        <label className="block mb-1 font-medium">เลขบัตรประชาชน</label>
        <input
          type="text"
          maxLength={13}
          className="border p-2 w-full"
          value={idcard}
          onChange={(e) => setIdcard(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {fileLabels.map(label => (
          <div key={label} className="flex flex-col">
            <label className="font-medium mb-1">{label}</label>
            <input
              type="file"
              accept=".pdf,.jpeg,.jpg"
              onChange={e => handleChange(label, e.target.files[0])}
            />
            {files[label] && (
              <div className="flex flex-col mt-1 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>{files[label].name}</span>
                  <div className="space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setModalFile(files[label])}
                    >ดูตัวอย่าง</button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleRemove(label)}
                    >ลบ</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSubmit}>
        อัปโหลดทั้งหมด
      </button>
      {message && <p className="mt-2 text-green-600">{message}</p>}

      {/* Modal แสดง preview */}
      {modalFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded max-w-3xl w-full relative">
            <button
              className="absolute top-2 right-2 text-red-600"
              onClick={() => setModalFile(null)}
            >ปิด</button>
            <h2 className="text-lg font-bold mb-2">ดูตัวอย่างไฟล์: {modalFile.name}</h2>
            {modalFile.type.includes('image') ? (
              <img src={URL.createObjectURL(modalFile)} alt="preview" className="w-full" />
            ) : (
              <embed src={URL.createObjectURL(modalFile)} type="application/pdf" className="w-full h-[80vh]" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}