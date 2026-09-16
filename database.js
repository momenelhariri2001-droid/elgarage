const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./garage.db');

db.serialize(() => {
  // إنشاء جدول السيارات
  db.run(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT,
      model TEXT,
      year INTEGER,
      price_egp REAL,
      price_usd REAL,
      horsepower INTEGER,
      acceleration TEXT,
      engine TEXT,
      model_3d_url TEXT
    )
  `);

  // إضافة بيانات تجريبية لسيارة BMW M5
  db.get("SELECT COUNT(*) as count FROM cars", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO cars (brand, model, year, price_egp, price_usd, horsepower, acceleration, engine, model_3d_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        "BMW",
        "M5 Competition",
        2024,
        5390000,
        110000,
        617,
        "3.2s",
        "4.4L V8 Twin-Turbo",
        "/models/bmw_m5.glb"
      );
      stmt.finalize();
    }
  });
});

module.exports = db;