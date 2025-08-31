import express from "express";
import multer from "multer";
import path, { parse } from "path";
import fs from "fs";
import XLSX from "xlsx";
import { pool } from "../db.js";
import { OptimizedUploadService } from "../services/optimizedUploadService.js";
import cacheService from "../services/cacheService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

// Sanitize input for logging to prevent log injection
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

const router = express.Router();
const optimizedService = new OptimizedUploadService();

// Secure multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.resolve(process.cwd(), "uploads");
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large', error: 'Maximum file size is 10MB' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  if (err) {
    return res.status(400).json({ message: 'File validation error', error: err.message });
  }
  next();
};

// Upload Excel and insert into DB
router.post("/upload-excel", requireAuth, upload.single("excelFile"), handleMulterError, async (req, res) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({ 
        message: "No file uploaded",
        error: "Please select an Excel file to upload"
      });
    }

    // Validate file exists and is readable
    if (!fs.existsSync(req.file.path)) {
      return res.status(400).json({ 
        message: "File upload failed",
        error: "Uploaded file not found"
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Clear existing table if needed or insert rows
    for (let row of data) {
      // Create concatenated name from individual components
      const nameParts = [
        row["First Name"]?.toString().trim(),
        row["Middle Name"]?.toString().trim(),
        row["Last Name"]?.toString().trim(),
        row["Ext. Name"]?.toString().trim()
      ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
      
      const concatenatedName = nameParts.join(' ');
      
      // Use existing "Name" field from Excel, or use concatenated name if "Name" is empty
      const finalName = (row["Name"]?.toString().trim() &&
                        row["Name"].toString().trim() !== 'null' &&
                        row["Name"].toString().trim() !== 'undefined')
                       ? row["Name"].toString().trim()
                       : concatenatedName;

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
          finalName, // Use concatenated or existing name
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

    // Clear cache after successful upload since database has changed
    await cacheService.clearAll();
    console.log('🧹 Cache cleared after data upload');

    res.json({ message: "Excel data imported successfully", rowsInserted: data.length });
  } catch (err) {
    console.error("Upload error:", sanitizeForLog(err.message));
    res.status(500).json({ message: "File upload failed", error: "Internal server error" });
  }
});

// Compare Excel with database (for client duplicate detection based on Names column)
router.post("/compare-excel", requireAuth, upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Read uploaded Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // For small files (< 5000 rows), use original method
    if (excelData.length < 5000) {
      // Fetch existing data from database with ALL fields for complete comparison
      const dbResult = await pool.query(`
        SELECT * FROM uploaded_beneficiaries
        WHERE name IS NOT NULL AND name != ''
        ORDER BY name
      `);
      const dbData = dbResult.rows;

      // Create a map of database records by name for quick lookup
      // Clean up empty strings from database records
      const dbRecordMap = new Map();
      dbData.forEach(record => {
        if (record.name) {
          // Clean up the database record by removing empty strings
          const cleanedRecord = {};
          Object.keys(record).forEach(key => {
            const value = record[key];
            // Keep null, keep actual values, remove empty strings
            if (value === null || value === undefined || value === '') {
              cleanedRecord[key] = null; // Convert empty strings to null for consistency
            } else if (typeof value === 'string' && value.trim() === '') {
              cleanedRecord[key] = null; // Convert whitespace-only strings to null
            } else {
              cleanedRecord[key] = value; // Keep actual values
            }
          });
          dbRecordMap.set(record.name, cleanedRecord);
        }
      });

      // Identify duplicates and originals
      const duplicates = [];
      const originals = [];

      excelData.forEach((row, index) => {
        // Create concatenated name from Excel data components
        const excelNameParts = [
          row["First Name"]?.toString().trim(),
          row["Middle Name"]?.toString().trim(),
          row["Last Name"]?.toString().trim(),
          row["Ext. Name"]?.toString().trim()
        ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
        
        const concatenatedName = excelNameParts.join(' ');
        
        // Use existing "Name" field from Excel, or use concatenated name if "Name" is empty
        const nameToCompare = (row["Name"]?.toString().trim() &&
                             row["Name"].toString().trim() !== 'null' &&
                             row["Name"].toString().trim() !== 'undefined')
                            ? row["Name"].toString().trim()
                            : concatenatedName;
        
        if (nameToCompare) {
          if (dbRecordMap.has(nameToCompare)) {
            duplicates.push({
              excel_row: {
                row_number: index + 2, // +2 because of header row and 0-based index
                data: row
              },
              database_record: dbRecordMap.get(nameToCompare)
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
    } else {
      // For large files, redirect to optimized processing
      res.json({
        message: "Large file detected. Please use the optimized comparison endpoint.",
        shouldUseOptimized: true,
        fileSize: excelData.length
      });
    }
  } catch (err) {
    console.error("Compare error:", err);
    res.status(500).json({ message: "File comparison failed", error: err.message });
  }
});

// Optimized compare Excel endpoint for large files
router.post("/compare-excel-optimized", requireAuth, upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    console.log('🚀 Starting optimized comparison for large file...');
    
    // Use optimized service for chunked processing
    const result = await optimizedService.processExcelInChunks(
      req.file.path,
      (progress) => {
        // Progress callback - could be sent via WebSocket in the future
        console.log(`Progress: ${progress.percentage}% - ${progress.processed}/${progress.total} rows processed`);
      }
    );

    res.json(result);
  } catch (err) {
    console.error("Optimized compare error:", err);
    res.status(500).json({ message: "Optimized comparison failed", error: err.message });
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

router.delete("/uploaded-beneficiaries", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM uploaded_beneficiaries"); // Deletes all rows
    await cacheService.clearAll(); // Clear cache after database clear
    res.json({ message: "All uploaded data cleared successfully." });
  } catch (err) {
    console.error("Failed to clear data:", err);
    res.status(500).json({ message: "Failed to clear data", error: err.message });
  }
});

router.delete("/uploaded-clear", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM uploaded_beneficiaries");
    await cacheService.clearAll(); // Clear cache after database clear
    res.json({ message: "Database cleared successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to clear database" });
  }
});

// Cache management endpoint
router.get("/cache-stats", async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json(stats);
  } catch (err) {
    console.error("Cache stats error:", err);
    res.status(500).json({ message: "Failed to get cache stats", error: err.message });
  }
});

router.delete("/clear-cache", requireAuth, async (req, res) => {
  try {
    await cacheService.clearAll();
    res.json({ message: "Cache cleared successfully" });
  } catch (err) {
    console.error("Cache clear error:", err);
    res.status(500).json({ message: "Failed to clear cache", error: err.message });
  }
});

// Fetch beneficiaries grouped by project series
router.get("/beneficiaries-by-project-series", async (req, res) => {
  try {
    // Get project series breakdown
    const projectSeriesResult = await pool.query(`
      SELECT
        project_series,
        COUNT(*) as beneficiary_count,
        COUNT(DISTINCT city_municipality) as municipality_count,
        COUNT(DISTINCT province) as province_count,
        COUNT(DISTINCT barangay) as total_unique_barangay
      FROM uploaded_beneficiaries
      WHERE project_series IS NOT NULL
      GROUP BY project_series
      ORDER BY project_series
    `);
    
    // Get unique counts across all project series
    const uniqueCountsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT city_municipality) as total_unique_municipalities,
        COUNT(DISTINCT barangay) as total_unique_barangay
      FROM uploaded_beneficiaries
      WHERE project_series IS NOT NULL
    `);
    
    res.json({
      projectSeries: projectSeriesResult.rows,
      uniqueCounts: uniqueCountsResult.rows[0]
    });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch project series data", error: err.message });
  }
});

// Upload Excel with duplicate scanning (Admin feature)
router.post("/upload-excel-with-scan", requireAuth, upload.single("excelFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // Fetch existing data from database with names
    const dbResult = await pool.query("SELECT * FROM uploaded_beneficiaries WHERE name IS NOT NULL AND name != ''");
    const dbData = dbResult.rows;

    // Create a map of database records by name for quick lookup
    // Clean up empty strings from database records
    const dbRecordMap = new Map();
    dbData.forEach(record => {
      if (record.name) {
        // Clean up the database record by removing empty strings
        const cleanedRecord = {};
        Object.keys(record).forEach(key => {
          const value = record[key];
          // Keep null, keep actual values, remove empty strings
          if (value === null || value === undefined || value === '') {
            cleanedRecord[key] = null; // Convert empty strings to null for consistency
          } else if (typeof value === 'string' && value.trim() === '') {
            cleanedRecord[key] = null; // Convert whitespace-only strings to null
          } else {
            cleanedRecord[key] = value; // Keep actual values
          }
        });
        dbRecordMap.set(record.name, cleanedRecord);
      }
    });

    // Process Excel data and identify duplicates and new records
    const duplicates = [];
    const newRecords = [];

    excelData.forEach((row, index) => {
      // Create concatenated name from individual components
      const nameParts = [
        row["First Name"]?.toString().trim(),
        row["Middle Name"]?.toString().trim(),
        row["Last Name"]?.toString().trim(),
        row["Ext. Name"]?.toString().trim()
      ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
      
      const concatenatedName = nameParts.join(' ');
      
      // Use existing "Name" field from Excel, or use concatenated name if "Name" is empty
      const finalName = (row["Name"]?.toString().trim() &&
                        row["Name"].toString().trim() !== 'null' &&
                        row["Name"].toString().trim() !== 'undefined')
                       ? row["Name"].toString().trim()
                       : concatenatedName;

      const processedRow = { ...row, finalName, row_number: index + 2 };

      if (finalName && dbRecordMap.has(finalName)) {
        duplicates.push({
          excel_row: processedRow,
          database_record: dbRecordMap.get(finalName)
        });
      } else if (finalName) {
        newRecords.push(processedRow);
      }
    });

    // Return scan results without uploading
    res.json({
      scanResults: {
        totalRows: excelData.length,
        duplicatesFound: duplicates.length,
        newRecordsFound: newRecords.length,
        duplicates: duplicates,
        newRecords: newRecords
      }
    });

  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ message: "File scan failed", error: err.message });
  }
});

// Upload only new records after scan confirmation
router.post("/upload-new-records", requireAuth, async (req, res) => {
  try {
    const { newRecords } = req.body;
    
    if (!newRecords || !Array.isArray(newRecords)) {
      return res.status(400).json({ message: "No new records provided" });
    }

    let insertedCount = 0;
    for (let row of newRecords) {
      // Create concatenated name from individual components
      const nameParts = [
        row["First Name"]?.toString().trim(),
        row["Middle Name"]?.toString().trim(),
        row["Last Name"]?.toString().trim(),
        row["Ext. Name"]?.toString().trim()
      ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
      
      const concatenatedName = nameParts.join(' ');
      
      // Use existing "Name" field from Excel, or use concatenated name if "Name" is empty
      const finalName = (row["Name"]?.toString().trim() &&
                        row["Name"].toString().trim() !== 'null' &&
                        row["Name"].toString().trim() !== 'undefined')
                       ? row["Name"].toString().trim()
                       : concatenatedName;

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
          finalName,
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
      insertedCount++;
    }

    res.json({
      message: "New records uploaded successfully",
      recordsInserted: insertedCount
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// Get database statistics for admin dashboard
router.get("/admin-statistics", async (req, res) => {
  try {
    // Total beneficiaries
    const totalResult = await pool.query("SELECT COUNT(*) as total FROM uploaded_beneficiaries");
    const totalBeneficiaries = parseInt(totalResult.rows[0].total);

    // Records by project series (top 10 for display)
    const projectSeriesResult = await pool.query(`
      SELECT
        project_series,
        COUNT(*) as count
      FROM uploaded_beneficiaries
      WHERE project_series IS NOT NULL AND project_series != ''
      GROUP BY project_series
      ORDER BY count DESC
      LIMIT 10
    `);

    // Total unique project series count
    const totalProjectSeriesResult = await pool.query(`
      SELECT COUNT(DISTINCT project_series) as total_unique_project_series
      FROM uploaded_beneficiaries
      WHERE project_series IS NOT NULL AND project_series != ''
    `);


    // Records by barangay
    const totalBarangayResult = await pool.query(`
     SELECT COUNT(DISTINCT barangay) as total_unique_barangays
     FROM uploaded_beneficiaries
     WHERE barangay IS NOT NULL AND barangay != ''
    `);

    // Records by province
    const provinceResult = await pool.query(`
      SELECT
        province,
        COUNT(*) as count
      FROM uploaded_beneficiaries
      WHERE province IS NOT NULL AND province != ''
      GROUP BY province
      ORDER BY count DESC
      LIMIT 10
    `);

    // Records by city/municipality
    const cityResult = await pool.query(`
      SELECT
        city_municipality,
        COUNT(*) as count
      FROM uploaded_beneficiaries
      WHERE city_municipality IS NOT NULL AND city_municipality != ''
      GROUP BY city_municipality
      ORDER BY count DESC
      LIMIT 10
    `);

    // Gender distribution
    const genderResult = await pool.query(`
      SELECT
        sex,
        COUNT(*) as count
      FROM uploaded_beneficiaries
      WHERE sex IS NOT NULL AND sex != ''
      GROUP BY sex
      ORDER BY count DESC
    `);

    // Age statistics
    const ageStatsResult = await pool.query(`
      SELECT
        AVG(age) as avg_age,
        MIN(age) as min_age,
        MAX(age) as max_age,
        COUNT(CASE WHEN age IS NOT NULL AND age > 0 THEN 1 END) as age_records
      FROM uploaded_beneficiaries
    `);

    // Users count
    const usersResult = await pool.query("SELECT COUNT(*) as total FROM users");
    const totalUsers = parseInt(usersResult.rows[0].total);

    // Beneficiary types
    const beneficiaryTypeResult = await pool.query(`
      SELECT
        type_of_beneficiary,
        COUNT(*) as count
      FROM uploaded_beneficiaries
      WHERE type_of_beneficiary IS NOT NULL AND type_of_beneficiary != ''
      GROUP BY type_of_beneficiary
      ORDER BY count DESC
    `);

    res.json({
      totalBeneficiaries,
      totalUsers,
      totalProjectSeries: parseInt(totalProjectSeriesResult.rows[0].total_unique_project_series),
      projectSeries: projectSeriesResult.rows,
      provinces: provinceResult.rows,
      cities: cityResult.rows,
      genderDistribution: genderResult.rows,
      ageStats: ageStatsResult.rows[0],
      beneficiaryTypes: beneficiaryTypeResult.rows,
      totalBarangays: parseInt(totalBarangayResult.rows[0].total_unique_barangays),
    });

  } catch (err) {
    console.error("Statistics error:", err);
    res.status(500).json({ message: "Failed to fetch statistics", error: err.message });
  }
});

export default router;
