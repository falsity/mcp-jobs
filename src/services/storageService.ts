import fs from 'fs';
import path from 'path';

// Log with ISO timestamp (for all console output in this service)
function logWithTime(level: 'log' | 'error', msg: string, ...args: unknown[]): void {
  const ts = new Date().toISOString();
  const out = level === 'log' ? console.log : console.error;
  out(`[${ts}] ${msg}`, ...args);
}

export class StorageService {
  private dataDir: string;

  constructor() {
    // Save data under mcp-jobs/data (cwd is mcp-jobs when run via npx from project root)
    this.dataDir = path.join(process.cwd(), 'data');
    this.ensureDataDirectory();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async saveData(siteName: string, data: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${siteName}.json`;
    const filePath = path.join(this.dataDir, fileName);

    try {
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      logWithTime('log', `Data saved to ${filePath}`);
    } catch (error) {
      logWithTime('error', `Error saving data to ${filePath}:`, error);
      throw error;
    }
  }

  async loadLatestData(siteName: string): Promise<any | null> {
    try {
      const files = await fs.promises.readdir(this.dataDir);
      const suffix = `_${siteName}.json`;
      const siteFiles = files.filter(file => file.endsWith(suffix));
      
      if (siteFiles.length === 0) {
        return null;
      }

      // Sort by filename (timestamp first), latest first
      siteFiles.sort().reverse();
      const latestFile = siteFiles[0];
      const filePath = path.join(this.dataDir, latestFile);

      const data = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logWithTime('error', `Error loading data for ${siteName}:`, error);
      return null;
    }
  }
} 