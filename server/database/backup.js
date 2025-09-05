import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDir();
    this.scheduleBackups();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Backup directory created');
    }
  }

  async createBackup(type = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tupad_backup_${type}_${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const pgDumpCmd = `pg_dump -h ${process.env.PGHOST} -p ${process.env.PGPORT} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -f "${filepath}" --no-password`;

    try {
      console.log(`🔄 Creating ${type} backup...`);
      
      // Set PGPASSWORD environment variable for pg_dump
      const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD };
      
      await execAsync(pgDumpCmd, { env });
      
      const stats = fs.statSync(filepath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Backup created: ${filename} (${sizeInMB} MB)`);
      
      // Clean old backups (keep last 7 days for daily, 5 for manual)
      await this.cleanOldBackups(type);
      
      return {
        success: true,
        filename,
        size: sizeInMB,
        path: filepath
      };
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanOldBackups(type) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes(`_${type}_`) && file.endsWith('.sql'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const keepCount = type === 'daily' ? 7 : 5;
      const filesToDelete = files.slice(keepCount);

      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old backup: ${file.name}`);
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  scheduleBackups() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🕐 Running scheduled daily backup...');
      await this.createBackup('daily');
    });

    // Weekly backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      console.log('🕐 Running scheduled weekly backup...');
      await this.createBackup('weekly');
    });

    console.log('⏰ Backup scheduler initialized');
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);
          return {
            name: file,
            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
            created: stats.mtime,
            path: filepath
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async restoreBackup(filename) {
    const filepath = path.join(this.backupDir, filename);
    
    if (!fs.existsSync(filepath)) {
      throw new Error('Backup file not found');
    }

    const restoreCmd = `psql -h ${process.env.PGHOST} -p ${process.env.PGPORT} -U ${process.env.PGUSER} -d ${process.env.PGDATABASE} -f "${filepath}"`;

    try {
      console.log(`🔄 Restoring backup: ${filename}`);
      
      const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD };
      await execAsync(restoreCmd, { env });
      
      console.log(`✅ Backup restored: ${filename}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  getBackupStats() {
    try {
      const files = fs.readdirSync(this.backupDir).filter(file => file.endsWith('.sql'));
      const totalSize = files.reduce((sum, file) => {
        const stats = fs.statSync(path.join(this.backupDir, file));
        return sum + stats.size;
      }, 0);

      return {
        count: files.length,
        totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
        lastBackup: files.length > 0 ? Math.max(...files.map(file => 
          fs.statSync(path.join(this.backupDir, file)).mtime
        )) : null
      };
    } catch (error) {
      return { count: 0, totalSize: '0 MB', lastBackup: null };
    }
  }
}

export default new BackupService();