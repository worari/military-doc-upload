const morgan = require('morgan');
app.use(morgan('combined'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
const fs = require('fs');
const path = require('path');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' } // append mode
);

app.use(morgan('combined', { stream: accessLogStream }));

app.delete('/api/delete-file', auth, async (req, res) => {
    const { idcard, filename } = req.body;
    try {
      const client = await pool.connect();
      await client.query(
        'DELETE FROM uploaded_files WHERE idcard = $1 AND filename = $2',
        [idcard, filename]
      );
      client.release();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Database error: ' + err.message });
    }
  });