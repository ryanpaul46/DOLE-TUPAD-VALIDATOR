// Performance test script for the optimized DOLE TUPAD Validator
import { OptimizedUploadService } from '../services/optimizedUploadService.js';
import { pool } from '../db.js';
import cacheService from '../services/cacheService.js';
import fs from 'fs';
import path from 'path';

// Generate test data for performance testing
const generateTestData = (rowCount = 10000) => {
  console.log(`🔨 Generating ${rowCount} test records...`);
  
  const firstNames = ['Juan', 'Maria', 'Jose', 'Ana', 'Carlos', 'Rosa', 'Pedro', 'Luz', 'Ricardo', 'Elena'];
  const lastNames = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Gonzales', 'Rodriguez', 'Hernandez', 'Lopez', 'Martinez'];
  const provinces = ['Metro Manila', 'Cebu', 'Davao', 'Iloilo', 'Cagayan de Oro', 'Zamboanga', 'Bacolod', 'Tacloban'];
  const cities = ['Quezon City', 'Manila', 'Cebu City', 'Davao City', 'Caloocan', 'Taguig', 'Pasig', 'Makati'];
  
  const testData = [];
  
  for (let i = 1; i <= rowCount; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    testData.push({
      'Project Series': `PS-2024-${String(i).padStart(6, '0')}`,
      'ID Number': `ID${String(i).padStart(8, '0')}`,
      'First Name': firstName,
      'Middle Name': Math.random() > 0.3 ? 'M.' : '',
      'Last Name': lastName,
      'Ext. Name': Math.random() > 0.8 ? 'Jr.' : '',
      'Name': `${firstName} ${lastName}`,
      'Birthdate': new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      'Barangay': `Barangay ${i % 50 + 1}`,
      'City Municipality': city,
      'Province': province,
      'District': `District ${Math.floor(i / 1000) + 1}`,
      'Type of ID': Math.random() > 0.5 ? 'National ID' : 'PhilHealth ID',
      'ID No.': `${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
      'Contact No.': `09${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
      'Type of Beneficiary': Math.random() > 0.5 ? 'Individual' : 'Family Head',
      'Occupation': Math.random() > 0.5 ? 'Laborer' : 'Farmer',
      'Sex': Math.random() > 0.5 ? 'Male' : 'Female',
      'Civil Status': Math.random() > 0.5 ? 'Married' : 'Single',
      'Age': 18 + Math.floor(Math.random() * 50),
      'Dependent': Math.floor(Math.random() * 5)
    });
  }
  
  return testData;
};

// Performance benchmarks
const performanceBenchmarks = {
  smallDataset: {
    name: 'Small Dataset (1,000 records)',
    size: 1000,
    expectedTime: 5000 // 5 seconds
  },
  mediumDataset: {
    name: 'Medium Dataset (10,000 records)',
    size: 10000,
    expectedTime: 30000 // 30 seconds
  },
  largeDataset: {
    name: 'Large Dataset (50,000 records)',
    size: 50000,
    expectedTime: 120000 // 2 minutes
  }
};

const runPerformanceTest = async (benchmark) => {
  const { name, size, expectedTime } = benchmark;
  console.log(`\n📊 Running ${name} test...`);
  
  const optimizedService = new OptimizedUploadService();
  const startTime = Date.now();
  
  try {
    // Generate test data
    const testData = generateTestData(size);
    
    // Create a temporary "Excel file" simulation
    const mockFilePath = 'mock-excel-data.json';
    
    // Simulate Excel processing by using the service directly
    console.log('🔄 Starting duplicate detection...');
    
    // Pre-load some existing data to create duplicates
    const existingData = testData.slice(0, Math.floor(size * 0.1)); // 10% duplicates
    await Promise.all(existingData.map(async (record) => {
      const finalName = record['First Name'] && record['Last Name'] 
        ? `${record['First Name']} ${record['Last Name']}` 
        : record['Name'];
        
      await pool.query(
        `INSERT INTO uploaded_beneficiaries (name, first_name, last_name, project_series) 
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [finalName, record['First Name'], record['Last Name'], record['Project Series']]
      );
    }));
    
    // Simulate the optimized processing
    const existingNamesMap = await optimizedService.createNameLookupMap();
    
    let duplicatesFound = 0;
    let processedRows = 0;
    
    // Process in chunks
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < testData.length; i += CHUNK_SIZE) {
      const chunk = testData.slice(i, i + CHUNK_SIZE);
      
      for (const record of chunk) {
        const finalName = record['First Name'] && record['Last Name'] 
          ? `${record['First Name']} ${record['Last Name']}` 
          : record['Name'];
        
        if (existingNamesMap.has(finalName.toLowerCase().trim())) {
          duplicatesFound++;
        }
        processedRows++;
      }
      
      // Small delay to simulate real processing
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const processingTime = Date.now() - startTime;
    const recordsPerSecond = Math.round(processedRows / (processingTime / 1000));
    
    console.log(`✅ ${name} completed:`);
    console.log(`   📝 Processed: ${processedRows.toLocaleString()} records`);
    console.log(`   ⚠️  Duplicates: ${duplicatesFound.toLocaleString()} found`);
    console.log(`   ⏱️  Time: ${(processingTime / 1000).toFixed(2)} seconds`);
    console.log(`   🚀 Speed: ${recordsPerSecond.toLocaleString()} records/second`);
    console.log(`   🎯 Performance: ${processingTime < expectedTime ? '✅ PASSED' : '❌ NEEDS OPTIMIZATION'}`);
    
    return {
      name,
      size,
      processingTime,
      recordsPerSecond,
      duplicatesFound,
      passed: processingTime < expectedTime
    };
    
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return {
      name,
      size,
      processingTime: Date.now() - startTime,
      recordsPerSecond: 0,
      duplicatesFound: 0,
      passed: false,
      error: error.message
    };
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🎯 DOLE TUPAD Validator Performance Testing');
  console.log('==========================================');
  
  const results = [];
  
  // Test cache connection
  console.log('\n🔍 Testing cache connection...');
  const cacheStats = await cacheService.getStats();
  console.log('Cache status:', cacheStats.connected ? '✅ Connected' : '⚠️ Offline (using fallback)');
  
  // Test database connection
  console.log('\n🔍 Testing database connection...');
  try {
    const dbResult = await pool.query('SELECT NOW()');
    console.log('Database status: ✅ Connected');
  } catch (error) {
    console.log('Database status: ❌ Failed -', error.message);
    return;
  }
  
  // Run benchmarks
  for (const [key, benchmark] of Object.entries(performanceBenchmarks)) {
    const result = await runPerformanceTest(benchmark);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 PERFORMANCE SUMMARY');
  console.log('=====================');
  
  const totalProcessed = results.reduce((sum, result) => sum + result.size, 0);
  const averageSpeed = results.reduce((sum, result) => sum + result.recordsPerSecond, 0) / results.length;
  const allPassed = results.every(result => result.passed);
  
  console.log(`📝 Total records processed: ${totalProcessed.toLocaleString()}`);
  console.log(`🚀 Average processing speed: ${Math.round(averageSpeed).toLocaleString()} records/second`);
  console.log(`🎯 Overall performance: ${allPassed ? '✅ EXCELLENT' : '⚠️ NEEDS OPTIMIZATION'}`);
  
  results.forEach(result => {
    console.log(`   ${result.passed ? '✅' : '❌'} ${result.name}: ${result.recordsPerSecond.toLocaleString()} rec/sec`);
  });
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await pool.query('DELETE FROM uploaded_beneficiaries WHERE project_series LIKE \'PS-2024-%\'');
  await cacheService.clearAll();
  
  console.log('\n🎉 Performance testing completed!');
};

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, generateTestData, performanceBenchmarks };