const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();

app.use(cors());
app.use(express.json());


// ======================================
// ملفات الموقع
// ======================================

app.use(express.static(__dirname));


// ======================================
// الصفحة الرئيسية
// ======================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// ======================================
// API - كل السيارات
// ======================================

app.get('/api/cars', (req, res) => {

    db.all('SELECT * FROM cars', [], (err, rows) => {

        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            cars: rows
        });

    });

});


// ======================================
// API - سيارة واحدة
// ======================================

app.get('/api/cars/:id', (req, res) => {

    db.get(
        'SELECT * FROM cars WHERE id = ?',
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            if (!row) {
                return res.status(404).json({
                    message: 'السيارة غير موجودة'
                });
            }

            res.json({
                car: row
            });

        }
    );

});


// ======================================
// تشغيل السيرفر
// ======================================

const PORT = 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});