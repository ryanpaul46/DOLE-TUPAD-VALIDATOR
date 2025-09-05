import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { pool } from "../db.js";
import { OptimizedUploadService } from "../services/optimizedUploadService.js";
import cacheService from "../services/cacheService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateCSRF } from "../middleware/csrfMiddleware.js";

// Validate file path to prevent directory traversal
const validateFilePath = (filename, baseDir) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fullPath = path.resolve(baseDir, sanitized);
  const normalizedBase = path.resolve(baseDir);
  
  if (!fullPath.startsWith(normalizedBase + path.sep) && fullPath !== normalizedBase) {
    throw new Error('Invalid file path');
  }
  
  return fullPath;
};

const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100);
};

const optimizedService = new OptimizedUploadService();

// Global reference to broadcast function (set by main server)
let broadcastStatistics = null;

export const setBroadcastFunction = (fn) => {
  broadcastStatistics = fn;
};

export default async function uploadRoutes(fastify, options) {
  // Upload Excel and insert into DB
  fastify.post('/upload-excel', { 
    preHandler: requireAuth,
    config: {
      bodyLimit: 50 * 1024 * 1024 // 50MB
    }
  }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400);
        return { message: "No file uploaded", error: "Please select an Excel file to upload" };
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const filename = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = validateFilePath(filename, uploadsDir);
      
      const buffer = await data.toBuffer();
      fs.writeFileSync(filepath, buffer);

      const workbook = XLSX.readFile(filepath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });

      for (let row of excelData) {
        const nameParts = [
          row["First Name"]?.toString().trim(),
          row["Middle Name"]?.toString().trim(),
          row["Last Name"]?.toString().trim(),
          row["Ext. Name"]?.toString().trim()
        ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
        
        const concatenatedName = nameParts.join(' ');
        const finalName = (row["Name"]?.toString().trim() &&
                          row["Name"].toString().trim() !== 'null' &&
                          row["Name"].toString().trim() !== 'undefined')
                         ? row["Name"].toString().trim()
                         : concatenatedName;

        await pool.query(
          `INSERT INTO uploaded_beneficiaries (
            project_series, id_number, name, first_name, middle_name, last_name, ext_name,
            birthdate, barangay, city_municipality, province, district, type_of_id, id_no,
            contact_no, type_of_beneficiary, occupation, sex, civil_status, age, dependent, remarks
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,$13,$14,
            $15,$16,$17,$18,$19,$20,$21,$22
          )`,
          [
            row["Project Series"], row["ID Number"], finalName, row["First Name"],
            row["Middle Name"], row["Last Name"], row["Ext. Name"],
            row["Birthdate"] ? new Date(row["Birthdate"]) : null,
            row["Barangay"], row["City Municipality"], row["Province"], row["District"],
            row["Type of ID"], row["ID No."], row["Contact No."], row["Type of Beneficiary"],
            row["Occupation"], row["Sex"], row["Civil Status"],
            row["Age"] ? parseInt(row["Age"]) : null, row["Dependent"], row["Remarks"] || null
          ]
        );
      }

      await cacheService.clearAll();
      fs.unlinkSync(filepath);
      
      // Broadcast updated statistics to all connected clients
      if (broadcastStatistics) {
        setTimeout(() => broadcastStatistics(), 1000);
      }
      
      return { message: "Excel data imported successfully", rowsInserted: excelData.length };
    } catch (err) {
      console.error("Upload error:", sanitizeForLog(err.message));
      reply.code(500);
      return { message: "File upload failed", error: "Internal server error" };
    }
  });

  // Get Excel data for processing
  fastify.post('/get-excel-data', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400);
        return { message: "No file uploaded" };
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const filename = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = validateFilePath(filename, uploadsDir);
      
      const buffer = await data.toBuffer();
      fs.writeFileSync(filepath, buffer);

      const workbook = XLSX.readFile(filepath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });

      const processedData = excelData.map((row, index) => {
        const excelNameParts = [
          row["First Name"]?.toString().trim(),
          row["Middle Name"]?.toString().trim(),
          row["Last Name"]?.toString().trim(),
          row["Ext. Name"]?.toString().trim()
        ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
        
        const concatenatedName = excelNameParts.join(' ');
        const nameToUse = (row["Name"]?.toString().trim() &&
                          row["Name"].toString().trim() !== 'null' &&
                          row["Name"].toString().trim() !== 'undefined')
                         ? row["Name"].toString().trim()
                         : concatenatedName;
        
        return {
          ...row,
          Name: nameToUse,
          row_number: index + 2
        };
      });

      fs.unlinkSync(filepath);
      
      return {
        excelData: processedData,
        totalRows: processedData.length
      };
    } catch (err) {
      console.error("Excel data extraction error:", err);
      reply.code(500);
      return { message: "Failed to extract Excel data", error: err.message };
    }
  });

  // Compare Excel with database
  fastify.post('/compare-excel', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400);
        return { message: "No file uploaded" };
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const filename = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = validateFilePath(filename, uploadsDir);
      
      const buffer = await data.toBuffer();
      fs.writeFileSync(filepath, buffer);

      const workbook = XLSX.readFile(filepath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });

      if (excelData.length >= 5000) {
        fs.unlinkSync(filepath);
        return {
          message: "Large file detected. Please use the optimized comparison endpoint.",
          shouldUseOptimized: true,
          fileSize: excelData.length
        };
      }

      const dbResult = await pool.query(`
        SELECT * FROM uploaded_beneficiaries
        WHERE name IS NOT NULL AND name != ''
        ORDER BY name
      `);
      const dbData = dbResult.rows;

      const dbRecordMap = new Map();
      dbData.forEach(record => {
        if (record.name) {
          const cleanedRecord = {};
          Object.keys(record).forEach(key => {
            const value = record[key];
            if (value === null || value === undefined || value === '') {
              cleanedRecord[key] = null;
            } else if (typeof value === 'string' && value.trim() === '') {
              cleanedRecord[key] = null;
            } else {
              cleanedRecord[key] = value;
            }
          });
          dbRecordMap.set(record.name, cleanedRecord);
        }
      });

      const duplicates = [];
      const originals = [];

      excelData.forEach((row, index) => {
        const excelNameParts = [
          row["First Name"]?.toString().trim(),
          row["Middle Name"]?.toString().trim(),
          row["Last Name"]?.toString().trim(),
          row["Ext. Name"]?.toString().trim()
        ].filter(part => part && part.length > 0 && part !== 'null' && part !== 'undefined');
        
        const concatenatedName = excelNameParts.join(' ');
        const nameToCompare = (row["Name"]?.toString().trim() &&
                             row["Name"].toString().trim() !== 'null' &&
                             row["Name"].toString().trim() !== 'undefined')
                            ? row["Name"].toString().trim()
                            : concatenatedName;
        
        if (nameToCompare) {
          if (dbRecordMap.has(nameToCompare)) {
            duplicates.push({
              excel_row: {
                row_number: index + 2,
                data: row
              },
              database_record: dbRecordMap.get(nameToCompare)
            });
          } else {
            originals.push({
              row_number: index + 2,
              data: row
            });
          }
        }
      });

      fs.unlinkSync(filepath);

      return {
        duplicates,
        originals,
        totalExcelRows: excelData.length,
        totalDuplicates: duplicates.length,
        totalOriginals: originals.length
      };
    } catch (err) {
      console.error("Compare error:", err);
      reply.code(500);
      return { message: "File comparison failed", error: err.message };
    }
  });

  // Get uploaded beneficiaries
  fastify.get('/uploaded-beneficiaries', async (request, reply) => {
    try {
      const result = await pool.query("SELECT * FROM uploaded_beneficiaries ORDER BY id DESC");
      return result.rows;
    } catch (err) {
      console.error("Fetch error:", err);
      reply.code(500);
      return { message: "Failed to fetch data", error: err.message };
    }
  });

  // Clear uploaded beneficiaries
  fastify.delete('/uploaded-beneficiaries', { preHandler: [requireAuth, validateCSRF] }, async (request, reply) => {
    try {
      await pool.query("DELETE FROM uploaded_beneficiaries");
      await cacheService.clearAll();
      
      // Broadcast updated statistics to all connected clients
      if (broadcastStatistics) {
        setTimeout(() => broadcastStatistics(), 1000);
      }
      
      return { message: "All uploaded data cleared successfully." };
    } catch (err) {
      console.error("Failed to clear data:", err);
      reply.code(500);
      return { message: "Failed to clear data", error: err.message };
    }
  });

  // Admin statistics
  fastify.get('/admin-statistics', async (request, reply) => {
    try {
      const totalResult = await pool.query("SELECT COUNT(*) as total FROM uploaded_beneficiaries");
      const totalBeneficiaries = parseInt(totalResult.rows[0].total);

      const projectSeriesResult = await pool.query(`
        SELECT project_series, COUNT(*) as count
        FROM uploaded_beneficiaries
        WHERE project_series IS NOT NULL AND project_series != ''
        GROUP BY project_series
        ORDER BY count DESC
        LIMIT 10
      `);

      const provincesResult = await pool.query(`
        SELECT province, COUNT(*) as count
        FROM uploaded_beneficiaries
        WHERE province IS NOT NULL AND province != ''
        GROUP BY province
        ORDER BY count DESC
        LIMIT 10
      `);

      const totalProjectSeriesResult = await pool.query(`
        SELECT COUNT(DISTINCT project_series) as total
        FROM uploaded_beneficiaries
        WHERE project_series IS NOT NULL AND project_series != ''
      `);

      const genderResult = await pool.query(`
        SELECT sex, COUNT(*) as count
        FROM uploaded_beneficiaries
        WHERE sex IS NOT NULL AND sex != ''
        GROUP BY sex
        ORDER BY count DESC
      `);

      const ageStatsResult = await pool.query(`
        SELECT 
          AVG(age) as avg_age,
          MIN(age) as min_age,
          MAX(age) as max_age
        FROM uploaded_beneficiaries
        WHERE age IS NOT NULL AND age > 0
      `);

      const usersResult = await pool.query("SELECT COUNT(*) as total FROM users");
      const totalUsers = parseInt(usersResult.rows[0].total);

      return {
        totalBeneficiaries,
        totalUsers,
        totalProjectSeries: parseInt(totalProjectSeriesResult.rows[0].total),
        projectSeries: projectSeriesResult.rows,
        provinces: provincesResult.rows,
        genderDistribution: genderResult.rows,
        ageStats: ageStatsResult.rows[0]
      };
    } catch (err) {
      console.error("Statistics error:", err);
      reply.code(500);
      return { message: "Failed to fetch statistics", error: err.message };
    }
  });

  // Get uploaded columns
  fastify.get('/uploaded-columns', async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'uploaded_beneficiaries'
        ORDER BY ordinal_position
      `);
      return result.rows;
    } catch (err) {
      console.error("Fetch columns error:", err);
      reply.code(500);
      return { message: "Failed to fetch column info", error: err.message };
    }
  });

  // Get beneficiaries by project series
  fastify.get('/beneficiaries-by-project-series', async (request, reply) => {
    try {
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
      
      const uniqueCountsResult = await pool.query(`
        SELECT
          COUNT(DISTINCT city_municipality) as total_unique_municipalities,
          COUNT(DISTINCT barangay) as total_unique_barangay
        FROM uploaded_beneficiaries
        WHERE project_series IS NOT NULL
      `);
      
      return {
        projectSeries: projectSeriesResult.rows,
        uniqueCounts: uniqueCountsResult.rows[0]
      };
    } catch (err) {
      console.error("Fetch error:", err);
      reply.code(500);
      return { message: "Failed to fetch project series data", error: err.message };
    }
  });

  // Compare Excel optimized
  fastify.post('/compare-excel-optimized', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400);
        return { message: "No file uploaded" };
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const filename = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = validateFilePath(filename, uploadsDir);
      
      const buffer = await data.toBuffer();
      fs.writeFileSync(filepath, buffer);

      const result = await optimizedService.processExcelInChunks(
        filepath,
        (progress) => {
          console.log(`Progress: ${progress.percentage}% - ${progress.processed}/${progress.total} rows processed`);
        }
      );

      fs.unlinkSync(filepath);
      return result;
    } catch (err) {
      console.error("Optimized compare error:", err);
      reply.code(500);
      return { message: "Optimized comparison failed", error: err.message };
    }
  });

  // Delete project series
  fastify.delete('/delete-project-series/:projectSeries', { preHandler: [requireAuth, validateCSRF] }, async (request, reply) => {
    try {
      const { projectSeries } = request.params;
      const decodedProjectSeries = decodeURIComponent(projectSeries);
      
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM uploaded_beneficiaries WHERE project_series = $1",
        [decodedProjectSeries]
      );
      const deletedCount = parseInt(countResult.rows[0].count);
      
      if (deletedCount === 0) {
        reply.code(404);
        return { message: "Project series not found" };
      }
      
      await pool.query(
        "DELETE FROM uploaded_beneficiaries WHERE project_series = $1",
        [decodedProjectSeries]
      );
      
      await cacheService.clearAll();
      
      // Broadcast updated statistics to all connected clients
      if (broadcastStatistics) {
        setTimeout(() => broadcastStatistics(), 1000);
      }
      
      return { 
        message: `Successfully deleted ${deletedCount} records for project series: ${decodedProjectSeries}`,
        deletedCount 
      };
    } catch (err) {
      console.error("Failed to delete project series:", err);
      reply.code(500);
      return { message: "Failed to delete project series", error: err.message };
    }
  });

  // Clear cache
  fastify.delete('/clear-cache', { preHandler: [requireAuth, validateCSRF] }, async (request, reply) => {
    try {
      await cacheService.clearAll();
      return { message: "Cache cleared successfully" };
    } catch (err) {
      console.error("Cache clear error:", err);
      reply.code(500);
      return { message: "Failed to clear cache", error: err.message };
    }
  });

  // Cache stats
  fastify.get('/cache-stats', async (request, reply) => {
    try {
      const stats = await cacheService.getStats();
      return stats;
    } catch (err) {
      console.error("Cache stats error:", err);
      reply.code(500);
      return { message: "Failed to get cache stats", error: err.message };
    }
  });

  // Trend analysis endpoint
  fastify.get('/trend-analysis', async (request, reply) => {
    try {
      const { type = 'beneficiaries', start, end, interval = 'day' } = request.query;
      
      let query;
      let groupBy;
      
      switch (interval) {
        case 'day':
          groupBy = "DATE_TRUNC('day', created_at)";
          break;
        case 'week':
          groupBy = "DATE_TRUNC('week', created_at)";
          break;
        case 'month':
          groupBy = "DATE_TRUNC('month', created_at)";
          break;
        default:
          groupBy = "DATE_TRUNC('day', created_at)";
      }
      
      if (type === 'beneficiaries') {
        query = `
          SELECT 
            ${groupBy} as date,
            COUNT(*) as count,
            COUNT(*) as value
          FROM uploaded_beneficiaries 
          WHERE created_at >= $1 AND created_at <= $2
          GROUP BY ${groupBy}
          ORDER BY date
        `;
      } else if (type === 'users') {
        query = `
          SELECT 
            ${groupBy} as date,
            COUNT(*) as count,
            COUNT(*) as value
          FROM users 
          WHERE created_at >= $1 AND created_at <= $2
          GROUP BY ${groupBy}
          ORDER BY date
        `;
      }
      
      const trendResult = await pool.query(query, [start, end]);
      
      // Generate historical data (previous period)
      const startDate = new Date(start);
      const endDate = new Date(end);
      const periodLength = endDate - startDate;
      const historicalStart = new Date(startDate.getTime() - periodLength);
      const historicalEnd = startDate;
      
      const historicalResult = await pool.query(query, [historicalStart.toISOString(), historicalEnd.toISOString()]);
      
      return {
        trend: trendResult.rows.map(row => ({
          ...row,
          date: row.date.toISOString().split('T')[0],
          timestamp: row.date.toISOString()
        })),
        historical: historicalResult.rows.map(row => ({
          ...row,
          date: row.date.toISOString().split('T')[0],
          timestamp: row.date.toISOString()
        }))
      };
    } catch (err) {
      console.error("Trend analysis error:", err);
      reply.code(500);
      return { message: "Failed to fetch trend data", error: err.message };
    }
  });

  // Global search endpoint
  fastify.get('/search-beneficiaries', async (request, reply) => {
    try {
      const { 
        search = '', 
        page = 1, 
        limit = 50, 
        province, 
        sex, 
        minAge, 
        maxAge, 
        projectSeries 
      } = request.query;
      
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      // Search term
      if (search) {
        whereConditions.push(`(
          name ILIKE $${paramIndex} OR 
          id_number ILIKE $${paramIndex} OR 
          province ILIKE $${paramIndex} OR 
          city_municipality ILIKE $${paramIndex} OR 
          project_series ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Filters
      if (province) {
        whereConditions.push(`province ILIKE $${paramIndex}`);
        params.push(`%${province}%`);
        paramIndex++;
      }
      
      if (sex) {
        whereConditions.push(`sex = $${paramIndex}`);
        params.push(sex);
        paramIndex++;
      }
      
      if (minAge) {
        whereConditions.push(`age >= $${paramIndex}`);
        params.push(parseInt(minAge));
        paramIndex++;
      }
      
      if (maxAge) {
        whereConditions.push(`age <= $${paramIndex}`);
        params.push(parseInt(maxAge));
        paramIndex++;
      }
      
      if (projectSeries) {
        whereConditions.push(`project_series ILIKE $${paramIndex}`);
        params.push(`%${projectSeries}%`);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Get results
      const query = `
        SELECT * FROM uploaded_beneficiaries 
        ${whereClause}
        ORDER BY id DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total FROM uploaded_beneficiaries 
        ${whereClause}
      `;
      
      const [results, countResult] = await Promise.all([
        pool.query(query, [...params, limit, offset]),
        pool.query(countQuery, params)
      ]);
      
      return {
        results: results.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      };
    } catch (err) {
      console.error("Search error:", err);
      reply.code(500);
      return { message: "Failed to search beneficiaries", error: err.message };
    }
  });

  // Export beneficiaries endpoint
  fastify.get('/export-beneficiaries', async (request, reply) => {
    try {
      const { 
        search = '', 
        province, 
        sex, 
        minAge, 
        maxAge, 
        projectSeries,
        format = 'json'
      } = request.query;
      
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      // Apply same filters as search
      if (search) {
        whereConditions.push(`(
          name ILIKE $${paramIndex} OR 
          id_number ILIKE $${paramIndex} OR 
          province ILIKE $${paramIndex} OR 
          city_municipality ILIKE $${paramIndex} OR 
          project_series ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      if (province) {
        whereConditions.push(`province ILIKE $${paramIndex}`);
        params.push(`%${province}%`);
        paramIndex++;
      }
      
      if (sex) {
        whereConditions.push(`sex = $${paramIndex}`);
        params.push(sex);
        paramIndex++;
      }
      
      if (minAge) {
        whereConditions.push(`age >= $${paramIndex}`);
        params.push(parseInt(minAge));
        paramIndex++;
      }
      
      if (maxAge) {
        whereConditions.push(`age <= $${paramIndex}`);
        params.push(parseInt(maxAge));
        paramIndex++;
      }
      
      if (projectSeries) {
        whereConditions.push(`project_series ILIKE $${paramIndex}`);
        params.push(`%${projectSeries}%`);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const query = `
        SELECT * FROM uploaded_beneficiaries 
        ${whereClause}
        ORDER BY id DESC
      `;
      
      const result = await pool.query(query, params);
      
      if (format === 'csv') {
        const csvData = convertToCSV(result.rows);
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="beneficiaries_export.csv"');
        return csvData;
      }
      
      return result.rows;
    } catch (err) {
      console.error("Export error:", err);
      reply.code(500);
      return { message: "Failed to export beneficiaries", error: err.message };
    }
  });

  // Helper function to convert to CSV
  function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value || '';
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }
}