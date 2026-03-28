import { CrawlerService } from './mcp/crawlerService';
import { StorageService } from './services/storageService';
import { crawlerConfigs } from './config/crawlerConfig';
import { jobSearchUrls } from './config/urlConfig';
import { CrawlerData } from './crawler/webCrawler';

// Log with ISO timestamp (for all console output in search/crawl flow)
function logWithTime(msg: string, ...args: unknown[]): void {
  const ts = new Date().toISOString();
  console.error(`[${ts}] ${msg}`, ...args);
}

// 定义搜索参数接口
export interface SearchParams {
  keyword?: string;
  city?: string;
  page?: number;
  salary?: string;
  workYear?: string;
}

async function crawlByUrl(url: string, params: SearchParams): Promise<CrawlerData[] | null> {
  const crawlerService = new CrawlerService();
  const storageService = new StorageService();

  // 根据 URL 匹配对应的配置
  const matchedConfig = crawlerConfigs.find(config => {
    if (config.url === url) return true;
    if (config.urlPattern && new RegExp(config.urlPattern).test(url)) return true;
    return false;
  });

  if (!matchedConfig) {
    logWithTime('No matching configuration found for URL:', url);
    return null;
  }

  try {
    // console.log(`Starting crawl for URL: ${url}`);
    const { keyword, city, page, salary, workYear } = params;
    // 创建一个新的配置，使用匹配到的规则但替换URL
    const customConfig = {
      ...matchedConfig,
      url: matchedConfig.urlBuilder(url, params, matchedConfig?.config || {})
    };
    const result = await crawlerService.startCrawling(customConfig);

    // 获取爬取的数据
    const dataset = result || [];
    
    // 保存爬取结果
    await storageService.saveData(customConfig.name, {
      config: customConfig,
      items: dataset,
      timestamp: Date.now()
    });

    // console.log(`Crawling completed for URL: ${url}`);
    return dataset;
  } catch (error) {
    // console.error(`Error crawling URL ${url}:`, error);
    return null;
  }
}

export interface SearchJobResult {
  jobs: any[];
  bySite: { name: string; count: number }[];
}

export async function searchJobList(params: SearchParams = {}): Promise<SearchJobResult> {
  const { keyword, city, page = 1, salary, workYear } = params;
  const result: any[] = [];
  const bySite: { name: string; count: number }[] = [];

  logWithTime(`开始搜索职位 - 关键词: ${keyword}, 城市: ${city || '全国'}`);

  for (const config of jobSearchUrls) {
    try {
      const dataset = await crawlByUrl(config.url, {
        keyword: keyword + ' ' + city,
        city,
        page,
        salary,
        workYear
      });
      if (dataset) {
        const jobItems = dataset.filter(item => item.data?.jobInfo);
        let added = 0;
        jobItems.forEach(item => {
          const arr = (item.data.jobInfo || []).filter((j: unknown) => j != null);
          added += arr.length;
          result.push(...arr);
        });
        bySite.push({ name: config.name, count: added });
        logWithTime(`[${config.name}] ${config.url} -> ${added} 个职位`);
      } else {
        bySite.push({ name: config.name, count: 0 });
        logWithTime(`[${config.name}] ${config.url} -> 0 个职位（无匹配配置或抓取异常）`);
      }
    } catch (error) {
      bySite.push({ name: config.name, count: 0 });
      logWithTime(`[${config.name}] ${config.url} 获取失败:`, error instanceof Error ? error.message : String(error));
    }
  }

  logWithTime(`搜索完成，共 ${result.length} 个职位，各站点: ${bySite.map(s => s.name + '=' + s.count).join(', ')}`);
  return { jobs: result, bySite };
}

async function main() {
  const { jobs, bySite } = await searchJobList({ keyword: '前端开发', city: '北京', page: 1, salary: '10-15万', workYear: '1-3年' });
  logWithTime('bySite', bySite);
  logWithTime('jobs count', jobs.length);
}

export async function crawlJobDetail(url: string) {
  const result = await crawlByUrl(url, {});
  // console.log(result);
  if (!result || result.length === 0) {
    return null;
  }
  return result[0]?.data?.job || null;
}

// 导出函数供外部使用
export {
  crawlByUrl,
  jobSearchUrls
 };

// 如果直接运行此文件，则执行 main 函数
if (require.main === module) {
  main();
}