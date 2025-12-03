// Database Backup and Restore Utility
import fs from 'fs';
import path from 'path';

export class BackupManager {
  private backupDir: string;

  constructor(backupDir: string = './backups') {
    this.backupDir = backupDir;
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup(dbPath: string = './db.json'): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Database file not found' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, filename);

      // Read and copy database file
      const data = fs.readFileSync(dbPath, 'utf-8');
      fs.writeFileSync(backupPath, data, 'utf-8');

      console.log(`💾 Backup created: ${filename}`);
      
      return { success: true, filename };
    } catch (error: any) {
      console.error('Error creating backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<Array<{ filename: string; size: number; created: Date }>> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            created: stats.birthtime
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());

      return backups;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Restore database from a backup
   */
  async restoreBackup(filename: string, dbPath: string = './db.json'): Promise<{ success: boolean; error?: string }> {
    try {
      const backupPath = path.join(this.backupDir, filename);

      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // Create a safety backup of current database before restoring
      if (fs.existsSync(dbPath)) {
        const safetyBackup = `${dbPath}.before-restore`;
        fs.copyFileSync(dbPath, safetyBackup);
        console.log(`🔒 Safety backup created: ${safetyBackup}`);
      }

      // Restore the backup
      const data = fs.readFileSync(backupPath, 'utf-8');
      
      // Validate JSON
      JSON.parse(data);
      
      fs.writeFileSync(dbPath, data, 'utf-8');

      console.log(`♻️ Database restored from: ${filename}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a backup file
   */
  async deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    try {
      const backupPath = path.join(this.backupDir, filename);

      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      fs.unlinkSync(backupPath);
      console.log(`🗑️ Backup deleted: ${filename}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-backup: Create automatic backups on schedule
   */
  scheduleAutoBackup(intervalHours: number = 24, dbPath: string = './db.json') {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`⏰ Auto-backup scheduled every ${intervalHours} hours`);
    
    // Create initial backup
    this.createBackup(dbPath);
    
    // Schedule recurring backups
    setInterval(() => {
      this.createBackup(dbPath);
      this.cleanOldBackups(30); // Keep last 30 backups
    }, intervalMs);
  }

  /**
   * Clean old backups, keeping only the most recent N backups
   */
  async cleanOldBackups(keepCount: number = 30): Promise<number> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= keepCount) {
        return 0;
      }

      const toDelete = backups.slice(keepCount);
      let deletedCount = 0;

      for (const backup of toDelete) {
        const result = await this.deleteBackup(backup.filename);
        if (result.success) {
          deletedCount++;
        }
      }

      console.log(`🧹 Cleaned ${deletedCount} old backups`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning old backups:', error);
      return 0;
    }
  }

  /**
   * Export database to downloadable format
   */
  async exportDatabase(dbPath: string = './db.json'): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Database file not found' };
      }

      const data = fs.readFileSync(dbPath, 'utf-8');
      
      // Validate JSON
      JSON.parse(data);
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error exporting database:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const backupManager = new BackupManager();

// Auto-start daily backups (only in production)
if (process.env.NODE_ENV === 'production') {
  backupManager.scheduleAutoBackup(24); // Daily backups
}
