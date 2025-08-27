import XLSX from "xlsx";
import { pool } from "../db.js";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import cacheService from "./cacheService.js";

// Configuration for chunked processing
const CHUNK_SIZE = 1000; // Process 1000 rows at a time
const MAX_MEMORY_ROWS = 5000; // Maximum rows to keep in memory

export class OptimizedUploadService {
  constructor() {
    this.processingStats = {
      totalRows: 0,
      processedRows: 0,
      duplicatesFound: 0,
      errorsFound: 0
    };
  }

  /**
   * Process Excel file in chunks for better memory management
   */
  async processExcelInChunks(filePath, progressCallback = null) {
    try {
      console.log('📊 Starting optimized Excel processing...');
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const range = XLSX.utils.decode_range(sheet['!ref']);
      
      this.processingStats.totalRows = range.e.r;
      const results = { duplicates: [], originals: [], errors: [] };

      // Pre-load existing names for faster lookup
      const existingNamesMap = await this.createNameLookupMap();
      
      // Process in chunks
      for (let startRow = 1; startRow <= range.e.r; startRow += CHUNK_SIZE) {
        const endRow = Math.min(startRow + CHUNK_SIZE - 1, range.e.r);
        
        const chunkData = XLSX.utils.sheet_to_json(sheet, {
          range: { s: { r: startRow, c: 0 }, e: { r: endRow, c: range.e.c } },
          defval: null
        });

        await this.processChunk(chunkData, startRow, existingNamesMap, results);
        
        this.processingStats.processedRows = endRow;
        
        // Report progress
        if (progressCallback) {
          const progress = {
            processed: this.processingStats.processedRows,
            total: this.processingStats.totalRows,
            percentage: Math.round((this.processingStats.processedRows / this.processingStats.totalRows) * 100),
            duplicatesFound: this.processingStats.duplicatesFound
          };
          progressCallback(progress);
        }

        // Small delay to prevent blocking the event loop
        await new Promise(resolve => setImmediate(resolve));
      }

      console.log(`✅ Processing completed: ${this.processingStats.processedRows} rows, ${this.processingStats.duplicatesFound} duplicates found`);
      return {
        ...results,
        totalExcelRows: this.processingStats.totalRows,
        totalDuplicates: results.duplicates.length,
        totalOriginals: results.originals.length,
        processingStats: this.processingStats
      };

    } catch (error) {
      console.error('❌ Error processing Excel file:', error);
      throw error;
    }
  }

  /**
   * Create optimized lookup map for existing names with caching
   */
  async createNameLookupMap() {
    try {
      // Try to get from cache first
      console.log('🔍 Checking cache for name lookup map...');
      const cachedMap = await cacheService.getCachedNameLookup();
      
      if (cachedMap && cachedMap.size > 0) {
        console.log(`📋 Using cached lookup map with ${cachedMap.size} records`);
        return cachedMap;
      }

      // If not in cache, query database
      console.log('📊 Querying database for name lookup map...');
      const result = await pool.query(`
        SELECT name, id, project_series, id_number
        FROM uploaded_beneficiaries
        WHERE name IS NOT NULL AND name != ''
        ORDER BY name
      `);

      const nameMap = new Map();
      result.rows.forEach(row => {
        if (row.name) {
          nameMap.set(row.name.toLowerCase().trim(), row);
        }
      });

      // Cache the result for future use
      await cacheService.cacheNameLookup(nameMap);
      
      console.log(`📋 Created and cached lookup map with ${nameMap.size} existing records`);
      return nameMap;
    } catch (error) {
      console.error('❌ Error creating name lookup map:', error);
      return new Map();
    }
  }

  /**
   * Process a chunk of Excel data
   */
  async processChunk(chunkData, startRowNumber, existingNamesMap, results) {
    const chunkDuplicates = [];
    const chunkOriginals = [];

    chunkData.forEach((row, index) => {
      try {
        const actualRowNumber = startRowNumber + index + 1; // +1 for header row
        const processedName = this.extractName(row);

        if (!processedName) {
          results.errors.push({
            row_number: actualRowNumber,
            error: 'Missing or invalid name',
            data: row
          });
          return;
        }

        const normalizedName = processedName.toLowerCase().trim();
        
        if (existingNamesMap.has(normalizedName)) {
          chunkDuplicates.push({
            excel_row: {
              row_number: actualRowNumber,
              data: row
            },
            database_record: existingNamesMap.get(normalizedName)
          });
          this.processingStats.duplicatesFound++;
        } else {
          chunkOriginals.push({
            row_number: actualRowNumber,
            data: row
          });
        }
      } catch (error) {
        results.errors.push({
          row_number: startRowNumber + index + 1,
          error: error.message,
          data: row
        });
        this.processingStats.errorsFound++;
      }
    });

    // Add chunk results to main results
    results.duplicates.push(...chunkDuplicates);
    results.originals.push(...chunkOriginals);
  }

  /**
   * Extract and normalize name from Excel row
   */
  extractName(row) {
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

    return finalName;
  }

  /**
   * Batch insert new records with optimized performance
   */
  async batchInsertRecords(records, progressCallback = null) {
    if (!records || records.length === 0) {
      return { success: true, insertedCount: 0 };
    }

    console.log(`📝 Starting batch insert of ${records.length} records...`);
    const BATCH_SIZE = 500; // Insert 500 records at a time
    let insertedCount = 0;

    try {
      // Prepare batch insert query
      const insertQuery = `
        INSERT INTO uploaded_beneficiaries (
          project_series, id_number, name, first_name, middle_name, last_name, ext_name,
          birthdate, barangay, city_municipality, province, district, type_of_id, id_no,
          contact_no, type_of_beneficiary, occupation, sex, civil_status, age, dependent
        ) VALUES 
      `;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        
        // Build values array for batch
        const values = [];
        const placeholders = [];
        let paramIndex = 1;

        batch.forEach((record) => {
          const row = record.data || record;
          const finalName = this.extractName(row);
          
          const rowValues = [
            row["Project Series"] || null,
            row["ID Number"] || null,
            finalName,
            row["First Name"] || null,
            row["Middle Name"] || null,
            row["Last Name"] || null,
            row["Ext. Name"] || null,
            row["Birthdate"] ? new Date(row["Birthdate"]) : null,
            row["Barangay"] || null,
            row["City Municipality"] || null,
            row["Province"] || null,
            row["District"] || null,
            row["Type of ID"] || null,
            row["ID No."] || null,
            row["Contact No."] || null,
            row["Type of Beneficiary"] || null,
            row["Occupation"] || null,
            row["Sex"] || null,
            row["Civil Status"] || null,
            row["Age"] ? parseInt(row["Age"]) : null,
            row["Dependent"] || null
          ];

          values.push(...rowValues);
          const rowPlaceholders = Array.from({ length: 21 }, (_, idx) => `$${paramIndex + idx}`);
          placeholders.push(`(${rowPlaceholders.join(',')})`);
          paramIndex += 21;
        });

        const batchQuery = insertQuery + placeholders.join(',');
        
        await pool.query(batchQuery, values);
        insertedCount += batch.length;

        if (progressCallback) {
          progressCallback({
            inserted: insertedCount,
            total: records.length,
            percentage: Math.round((insertedCount / records.length) * 100)
          });
        }

        // Small delay to prevent blocking
        await new Promise(resolve => setImmediate(resolve));
      }

      console.log(`✅ Batch insert completed: ${insertedCount} records inserted`);
      return { success: true, insertedCount };

    } catch (error) {
      console.error('❌ Batch insert error:', error);
      throw error;
    }
  }

  /**
   * Stream processing for very large files
   */
  async streamProcessFile(filePath, progressCallback = null) {
    const results = { duplicates: [], originals: [], errors: [] };
    let rowCount = 0;

    try {
      // Create a transform stream for processing rows
      const processRowTransform = new Transform({
        objectMode: true,
        transform: async (chunk, encoding, callback) => {
          try {
            const processedName = this.extractName(chunk);
            if (processedName) {
              // Check if duplicate
              const isDuplicate = await this.checkIfDuplicate(processedName);
              if (isDuplicate) {
                results.duplicates.push({
                  excel_row: { row_number: rowCount + 2, data: chunk },
                  database_record: isDuplicate
                });
              } else {
                results.originals.push({
                  row_number: rowCount + 2,
                  data: chunk
                });
              }
            }
            rowCount++;
            
            if (progressCallback && rowCount % 100 === 0) {
              progressCallback({
                processed: rowCount,
                duplicates: results.duplicates.length
              });
            }
            
            callback();
          } catch (error) {
            callback(error);
          }
        }
      });

      // Process the file using streaming
      await pipeline(
        this.createExcelReadStream(filePath),
        processRowTransform
      );

      return {
        ...results,
        totalExcelRows: rowCount,
        totalDuplicates: results.duplicates.length,
        totalOriginals: results.originals.length
      };

    } catch (error) {
      console.error('❌ Stream processing error:', error);
      throw error;
    }
  }

  /**
   * Check if a name is duplicate in database with caching
   */
  async checkIfDuplicate(name) {
    try {
      const normalizedName = name.toLowerCase().trim();
      
      // Check cache first
      const cached = await cacheService.isDuplicate(normalizedName);
      if (cached !== null) {
        return cached.isDuplicate ? cached.record : null;
      }

      // If not in cache, query database
      const result = await pool.query(
        'SELECT * FROM uploaded_beneficiaries WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
        [name]
      );
      
      const isDuplicate = result.rows.length > 0;
      const record = isDuplicate ? result.rows[0] : null;
      
      // Cache the result
      await cacheService.cacheDuplicate(normalizedName, isDuplicate, record);
      
      return record;
    } catch (error) {
      console.error('❌ Duplicate check error:', error);
      return null;
    }
  }

  /**
   * Create a readable stream from Excel file
   */
  createExcelReadStream(filePath) {
    // This would be implemented with a proper Excel streaming library
    // For now, we'll use the chunked approach
    throw new Error('Stream processing not yet implemented - use processExcelInChunks instead');
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   */
  resetStats() {
    this.processingStats = {
      totalRows: 0,
      processedRows: 0,
      duplicatesFound: 0,
      errorsFound: 0
    };
  }
}

export default OptimizedUploadService;