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
// ملاحظة: Vercel بيدي رقم البورت بنفسه عن طريق
// process.env.PORT — الرقم 5000 الثابت كان بيتجاهله
// Vercel أصلاً في البيئة السيرفرلس، فمش هو سبب الأعطال،
// بس تركه ثابت غلط لو هتشغل السيرفر ده في مكان تاني
// (Render, Railway, VPS...) غير Vercel.
//
// ملاحظة تانية أهم: main.js بياخد بيانات العربيات من
// window.carData في cars.js مباشرة، مش من /api/cars هنا.
// يعني الـEndpoints دول وقاعدة البيانات مش بيتستخدموا
// فعلياً في الموقع دلوقتي — مش هما سبب مشكلة الموبايل.

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});