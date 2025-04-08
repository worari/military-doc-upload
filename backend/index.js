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