import express from "express";
import multer from "multer";
import path from "path";
import XLSX from "xlsx";
import { pool } from "../db.js";

const router = express.Router();

// Multer storage with absolute path
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "./uploads")); // Correct uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Upload Excel and insert into DB
router.post("/upload-excel", upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Clear existing table if needed or insert rows
    for (let row of data) {
      await pool.query(
        `INSERT INTO uploaded_beneficiaries (
          project_series, id_number, name, first_name, middle_name, last_name, ext_name,
          birthdate, barangay, city_municipality, province, district, type_of_id, id_no,
          contact_no, type_of_beneficiary, occupation, sex, civil_status, age, dependent
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21
        )`,
        [
          row["Project Series"],
          row["ID Number"],
          row["Name"],
          row["First Name"],
          row["Middle Name"],
          row["Last Name"],
          row["Ext. Name"],
          row["Birthdate"] ? new Date(row["Birthdate"]) : null,
          row["Barangay"],
          row["City Municipality"],
          row["Province"],
          row["District"],
          row["Type of ID"],
          row["ID No."],
          row["Contact No."],
          row["Type of Beneficiary"],
          row["Occupation"],
          row["Sex"],
          row["Civil Status"],
          row["Age"] ? parseInt(row["Age"]) : null,
          row["Dependent"],
        ]
      );
    }

    res.json({ message: "Excel data imported successfully", rowsInserted: data.length });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "File upload failed", error: err.message });
  }
});

// Compare Excel with database (for client duplicate detection based on Names column)
router.post("/compare-excel", upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Read uploaded Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Fetch existing data from database with names
    const dbResult = await pool.query("SELECT * FROM uploaded_beneficiaries WHERE name IS NOT NULL");
    const dbData = dbResult.rows;

    // Create a map of database records by name for quick lookup
    const dbRecordMap = new Map();
    dbData.forEach(record => {
      if (record.name) {
        dbRecordMap.set(record.name, record);
      }
    });

    // Identify duplicates and originals
    const duplicates = [];
    const originals = [];

    excelData.forEach((row, index) => {
      const name = row["Name"]; // Column 3 is the Names Header
      if (name) {
        if (dbRecordMap.has(name)) {
          duplicates.push({
            excel_row: {
              row_number: index + 2, // +2 because of header row and 0-based index
              data: row
            },
            database_record: dbRecordMap.get(name)
          });
        } else {
          originals.push({
            row_number: index + 2, // +2 because of header row and 0-based index
            data: row
          });
        }
      }
    });

    res.json({
      duplicates,
      originals,
      totalExcelRows: excelData.length,
      totalDuplicates: duplicates.length,
      totalOriginals: originals.length
    });
  } catch (err) {
    console.error("Compare error:", err);
    res.status(500).json({ message: "File comparison failed", error: err.message });
  }
});

// Fetch all uploaded rows
router.get("/uploaded-beneficiaries", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM uploaded_beneficiaries ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch data", error: err.message });
  }
});

// Fetch column information
router.get("/uploaded-columns", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'uploaded_beneficiaries'
      ORDER BY ordinal_position
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch columns error:", err);
    res.status(500).json({ message: "Failed to fetch column info", error: err.message });
  }
});

router.delete("/uploaded-beneficiaries", async (req, res) => {
  try {
    await pool.query("DELETE FROM uploaded_beneficiaries"); // Deletes all rows
    res.json({ message: "All uploaded data cleared successfully." });
  } catch (err) {
    console.error("Failed to clear data:", err);
    res.status(500).json({ message: "Failed to clear data", error: err.message });
  }
});

router.delete("/uploaded-clear", async (req, res) => {
  try {
    await pool.query("DELETE FROM uploaded_beneficiaries");
    res.json({ message: "Database cleared successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to clear database" });
  }
});

export default router;
