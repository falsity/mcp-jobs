import { ElementHandle } from 'playwright';

export interface CrawlerRule {
  selector: string;      // CSS 选择器
  attribute?: string;    // 要获取的属性（如 href, src 等）
  type: 'text' | 'attribute' | 'html';  // 获取类型
  handler?: (currentData: Record<string, any>, extractedValue: any, element: ElementHandle<Element>) => Promise<any>;  // 数据处理器
}

export interface BrowserConfig {
  headless?: boolean;    // 是否无头模式运行
  timeout?: number;      // 页面超时时间
  viewport?: {           // 视窗大小
    width: number;
    height: number;
  };
  userAgent?: string;    // 用户代理
}

export interface SiteConfig {
  url: string;           // 网站URL
  name: string;          // 网站名称
  urlPattern?: string;   // URL 匹配模式（支持正则表达式）
  urlBuilder: (url: string, params: Record<string, any>, paramsConfig: Record<string, any>) => string; // URL 构建器
  rules: {              // 数据提取规则
    [key: string]: CrawlerRule;
  };
  config?: {
    [key: string]: {
      name: string;
      description: string;
      type: string;
      default: string;
      rule?: Record<string, string>;
    };
  };
  maxRequestsPerCrawl?: number;
  maxConcurrency?: number;
  timeout?: number;
  browserConfig?: BrowserConfig;  // 浏览器配置
}

export const crawlerConfigs: SiteConfig[] = [
  {
    url: 'https://www.liepin.com/zhaopin/',
    name: 'liepin',
    urlPattern: '^https://www\.liepin\.com/zhaopin/.*$',
    urlBuilder: (url, params, paramsConfig) => {
      const { keyword, salary, workYear, page } = params;
      const { salaryCode, workYearCode } = paramsConfig;
      return url + `?city=000&dq=000&key=${encodeURIComponent(keyword)}&currentPage=${page}&salaryCode=${salaryCode.rule[salary] || ''}&workYearCode=${workYearCode.rule[workYear] || ''}`;
    },
    // 示例：为猎聘网站配置特定的浏览器设置
    browserConfig: {
      // 可以在这里覆盖全局设置
      // headless: false,  // 如果需要调试此特定网站，可以设置为 false
      // timeout: 45000,   // 如果此网站需要更长的加载时间
    },
    config: {
      salaryCode: {
        name: 'salaryCode',
        description: '薪资编码',
        type: 'string',
        default: '',
        rule: {
          '10万以下': '1',
          '10-15万': '2',
          '16-20万': '3',
          '21-30万': '4',
          '31-50万': '5',
          '51-100万': '6',
          '100万以上': '7'
        }
      },
      workYearCode: {
        name: 'workYearCode',
        description: '工作经验',
        type: 'string',
        default: '',
        rule: {
          '应届生': '1',
          '实习生': '2',
          '1年以下': '0$1',
          '1-3年': '1$3',
          '3-5年': '3$5',
          '5-10年': '5$10',
          '10年以上': '10$999'
        }
      }
    },
    rules: {
      // Liepin may use .job-card-pc-container (new) or li.sojob-item (legacy). Inner selectors try both.
      jobInfo: {
        selector: '.job-card-pc-container, li.sojob-item',
        type: 'html',
        handler: (() => {
          let _logOnce = false;
          /** Try selectors in order, return first non-empty text. */
          const evalText = async (el: ElementHandle<Element>, ...sels: string[]): Promise<string> => {
            for (const s of sels) {
              try {
                const t = await el.$eval(s, (e: Element) => (e as HTMLElement).textContent?.trim() || '');
                if (t) return t;
              } catch { /* selector not found */ }
            }
            return '';
          };
          const evalHref = async (el: ElementHandle<Element>, ...sels: string[]): Promise<string> => {
            for (const s of sels) {
              try {
                const h = await el.$eval(s, (e: Element) => (e as HTMLAnchorElement).getAttribute('href') || '');
                if (h) return h.startsWith('http') ? h : `https://www.liepin.com${h}`;
              } catch { /* selector not found */ }
            }
            return '';
          };
          return async (_currentData: Record<string, any>, _value: any, element: ElementHandle<Element>) => {
            try {
              const title = await evalText(
                element,
                '.job-title-box > .ellipsis-1',
                '.job-title-box',
                '.job-info h3 a',
                'h3 a',
                'a[href*="/job/"]'
              );
              const salary = await evalText(element, '.job-salary', 'span.text-warning', '[class*="salary"]');
              const company = await evalText(element, '.company-name', '.job-info .company-name', '.comp-info a', 'p.company-name a');
              const address = await evalText(element, '.job-dq-box', 'span.area', '.job-attributes .area', '[class*="dq"]');
              let tags: string[] = [];
              try {
                const a = await element.$$eval('.job-labels-box span', (els: Element[]) => els.map((e) => (e as HTMLElement).textContent?.trim() || '').filter(Boolean));
                const b = await element.$$eval('.company-tags-box span', (els: Element[]) => els.map((e) => (e as HTMLElement).textContent?.trim() || '').filter(Boolean));
                tags = [...a, ...b];
              } catch {
                try {
                  tags = await element.$$eval('.job-attributes span', (els: Element[]) => els.map((e) => (e as HTMLElement).textContent?.trim() || '').filter(Boolean));
                } catch { /* ignore */ }
              }
              const jobDetail = await evalHref(element, 'a[href*="/job/"]', '.job-info h3 a', 'h3 a', 'a');
              if (!title && !company && !salary) return null;
              return { title, salary, company, address, tags, jobDetail };
            } catch (error) {
              if (!_logOnce) {
                _logOnce = true;
                console.error('[liepin jobInfo] Selectors may be outdated, skipping failed cards. Error:', (error as Error)?.message || error);
              }
              return null;
            }
          };
        })(),
      },
      // hotJobs: {
      //   selector: '.hot-job-list',
      //   type: 'html',
      //   handler: async (currentData, value, element) => {
      //     try {
      //       // 使用 $eval 获取标题
      //       const title = await element.$eval('.section-title', el => el.textContent?.trim() || '');
            
      //       // 使用 $$eval 获取所有工作项
      //       const jobs = await element.$$eval('.job-item', items =>
      //         items.map(item => ({
      //           name: item.querySelector('.job-name')?.textContent?.trim() || '',
      //           company: item.querySelector('.company-name')?.textContent?.trim() || '',
      //           salary: item.querySelector('.salary')?.textContent?.trim() || ''
      //         }))
      //       );

      //       console.log('Extracted hot jobs:', { title, jobCount: jobs.length });

      //       return {
      //         title,
      //         jobs
      //       };
      //     } catch (error) {
      //       console.error('Error extracting hot jobs:', error);
      //       return null;
      //     }
      //   }
      // },
      // recommendCompanies: {
      //   selector: '.recommend-company-list',
      //   type: 'html',
      //   handler: async (currentData, value, element) => {
      //     try {
      //       // 使用 $$eval 获取所有公司信息
      //       const companies = await element.$$eval('.company-item', items =>
      //         items.map(item => ({
      //           name: item.querySelector('.company-name')?.textContent?.trim() || '',
      //           industry: item.querySelector('.industry')?.textContent?.trim() || '',
      //           scale: item.querySelector('.scale')?.textContent?.trim() || '',
      //           jobs: Array.from(item.querySelectorAll('.job-item')).map(job => ({
      //             title: job.querySelector('.job-title')?.textContent?.trim() || '',
      //             salary: job.querySelector('.salary')?.textContent?.trim() || ''
      //           }))
      //         }))
      //       );

      //       console.log('Extracted companies:', { companyCount: companies.length });

      //       return companies;
      //     } catch (error) {
      //       console.error('Error extracting companies:', error);
      //       return [];
      //     }
      //   }
      // }
    },
    maxRequestsPerCrawl: 1,
    maxConcurrency: 1,
    timeout: 30000
  },
  // Lagou (拉勾) https://www.lagou.com/jobs/list_关键词?city=城市&page=
  {
    url: 'https://www.lagou.com/jobs',
    name: 'lagou',
    urlPattern: '^https://www\\.lagou\\.com/jobs/.*',
    urlBuilder: (_, params) =>
      `https://www.lagou.com/jobs/list_${encodeURIComponent((params.keyword as string) || '')}?city=${encodeURIComponent((params.city as string) || '全国')}&page=${params.page || 1}`,
    rules: {
      jobInfo: {
        selector: 'li.con_list_item, ul.item_con_list > li, [class*="con_list_item"], .job-card, .position-list li, .job_list .con_list_item',
        type: 'html',
        handler: (() => {
          const evalT = async (el: ElementHandle<Element>, ...s: string[]): Promise<string> => {
            for (const x of s) {
              try {
                const t = await el.$eval(x, (e: Element) => (e as HTMLElement).textContent?.trim() || '');
                if (t) return t;
              } catch { }
            }
            return '';
          };
          const evalH = async (el: ElementHandle<Element>, ...s: string[]): Promise<string> => {
            for (const x of s) {
              try {
                const h = await el.$eval(x, (e: Element) => (e as HTMLAnchorElement).getAttribute('href') || '');
                if (h) return h.startsWith('http') ? h : 'https://www.lagou.com' + (h.startsWith('/') ? h : '/' + h);
              } catch { }
            }
            return '';
          };
          return async (_: any, __: any, el: ElementHandle<Element>) => {
            try {
              const title = await evalT(el, '.list_item_job_title a', '.list_item_job_title', 'a[href*="/jobs/"]');
              const salary = await evalT(el, '.list_item_salary', '[class*="salary"]');
              const company = await evalT(el, '.company_name a', '.company_name', '[class*="company"]');
              const address = await evalT(el, '.item_condition', '.list_item_bottom', '[class*="condition"]');
              const jobDetail = await evalH(el, 'a[href*="/jobs/"]', '.list_item_job_title a', 'a');
              if (!title && !company && !salary) return null;
              return { title, salary, company, address, tags: address ? [address] : [], jobDetail };
            } catch { return null; }
          };
        })(),
      },
    },
    timeout: 30000,
  },
  // Zhaopin (智联) https://sou.zhaopin.com/?jl=cityId&kw=keyword&kt=3&p=page
  {
    url: 'https://sou.zhaopin.com',
    name: 'zhaopin',
    urlPattern: '^https://sou\\.zhaopin\\.com.*',
    urlBuilder: (_, params) => {
      const jl: Record<string, string> = { '北京': '530', '上海': '538', '深圳': '765', '广州': '801', '杭州': '653', '南京': '635', '成都': '639', '武汉': '736', '西安': '854' };
      const jlVal = (params.city && jl[params.city as string]) || '0';
      return `https://sou.zhaopin.com/?jl=${jlVal}&kw=${encodeURIComponent((params.keyword as string) || '')}&kt=3&p=${params.page || 1}`;
    },
    rules: {
      jobInfo: {
        selector: 'div.joblist-box__item, div[class*="joblist-box__item"], .positionlist .job-item, [class*="positionlist"] div[class*="item"]',
        type: 'html',
        handler: (() => {
          const evalT = async (el: ElementHandle<Element>, ...s: string[]): Promise<string> => {
            for (const x of s) {
              try {
                const t = await el.$eval(x, (e: Element) => (e as HTMLElement).textContent?.trim() || '');
                if (t) return t;
              } catch { }
            }
            return '';
          };
          const evalH = async (el: ElementHandle<Element>, ...s: string[]): Promise<string> => {
            for (const x of s) {
              try {
                const h = await el.$eval(x, (e: Element) => (e as HTMLAnchorElement).getAttribute('href') || '');
                if (h) return h.startsWith('http') ? h : 'https://www.zhaopin.com' + (h.startsWith('/') ? h : '/' + h);
              } catch { }
            }
            return '';
          };
          return async (_: any, __: any, el: ElementHandle<Element>) => {
            try {
              const title = await evalT(el, '.jobinfo__name', 'a.jobinfo__name', '[class*="jobinfo__name"]');
              const salary = await evalT(el, '.jobinfo__salary', '[class*="jobinfo__salary"]', '[class*="salary"]');
              const company = await evalT(el, '.company__name', '[class*="company__name"]', '.jobinfo__company a', '[class*="company"]');
              const address = await evalT(el, '.jobinfo__other-info-item', '[class*="address"]', '[class*="work-address"]');
              let tags: string[] = [];
              try {
                tags = await el.$$eval('.jobinfo__other-info-item', (nodes: Element[]) => nodes.map((e) => (e as HTMLElement).textContent?.trim() || '').filter(Boolean));
              } catch { }
              const jobDetail = await evalH(el, 'a.jobinfo__name', '.jobinfo__name', 'a[href*="zhaopin.com"]', 'a');
              if (!title && !company && !salary) return null;
              return { title, salary, company, address, tags, jobDetail };
            } catch { return null; }
          };
        })(),
      },
    },
    timeout: 30000,
  },
  // 51job (前程无忧) https://search.51job.com/list/cityCode,000000,0000,00,9,99,keyword,2,page.html
  {
    url: 'https://search.51job.com',
    name: '51job',
    urlPattern: '^https://search\\.51job\\.com/list/.*',
    urlBuilder: (_, params) => {
      const codes: Record<string, string> = { '北京': '010000', '上海': '020000', '深圳': '040000', '广州': '030200', '杭州': '080200', '南京': '070200', '成都': '090200', '武汉': '180200', '西安': '200200' };
      const code = (params.city && codes[params.city as string]) || '000000';
      return `https://search.51job.com/list/${code},000000,0000,00,9,99,${encodeURIComponent((params.keyword as string) || '')},2,${params.page || 1}.html`;
    },
    rules: {
      jobInfo: {
        selector: 'div#resultList div.el, div.j_joblist div.e, div.dw_table div.el, div.el',
        type: 'html',
        handler: (() => {
          const evalT = async (el: ElementHandle<Element>, ...s: string[]): Promise<string> => {
            for (const x of s) {
              try {
                const t = await el.$eval(x, (e: Element) => (e as HTMLElement).textContent?.trim() || '');
                if (t) return t;
              } catch { }
            }
            return '';
          };
          const evalH = async (el: ElementHandle<Element>, ...s: string[]): Promise<string> => {
            for (const x of s) {
              try {
                const h = await el.$eval(x, (e: Element) => (e as HTMLAnchorElement).getAttribute('href') || '');
                if (h) return h.startsWith('http') ? h : 'https://www.51job.com' + (h.startsWith('/') ? h : '/' + h);
              } catch { }
            }
            return '';
          };
          return async (_: any, __: any, el: ElementHandle<Element>) => {
            try {
              const title = await evalT(el, '.jname', '.t1 .jname', 'a.jname', '[class*="jname"]');
              const salary = await evalT(el, '.sal', 'span.sal', '[class*="sal"]');
              const company = await evalT(el, '.cname', '.t2 .cname', '[class*="cname"]');
              const address = await evalT(el, 'span.d', '.t3', '.area', '[class*="workarea"]');
              const jobDetail = await evalH(el, '.jname', 'a.jname', '.t1 a', 'a[href*="51job.com"]', 'a');
              if (!title && !company && !salary) return null;
              return { title, salary, company, address, tags: [], jobDetail };
            } catch { return null; }
          };
        })(),
      },
    },
    timeout: 30000,
  },
  {
    url: 'https://m.zhipin.com/c100010000',
    name: 'zhipin',
    urlPattern: '^https://m\.zhipin\.com/c100010000/[^\.]+$',
    urlBuilder: (url, params, paramsConfig) => {
      const { salary, workYear, keyword, page } = params;
      const { salaryCode, workYearCode } = paramsConfig;
      return url + `/${workYearCode.rule[workYear] || ''}?ka=${salaryCode.rule[salary] || ''}&page=${page}&query=${encodeURIComponent(keyword)}`;
    },
    config: {
      salaryCode: {
        name: 'ka',
        description: '薪资编码',
        type: 'string',
        default: '',
        rule: {
          '10万以下': 'sel-salary-1',
          '10-15万': 'sel-salary-2',
          '16-20万': 'sel-salary-3',
          '21-30万': 'sel-salary-4',
          '31-50万': 'sel-salary-5',
          '51-100万': 'sel-salary-6',
          '100万以上': 'sel-salary-7'
        }
      },
      workYearCode: {
        name: 'exp',
        description: '工作经验',
        type: 'string',
        default: '',
        rule: {
          '应届生': 'e_102',
          '实习生': 'e_108',
          '1年以下': 'e_103',
          '1-3年': 'e_104',
          '3-5年': 'e_105',
          '5-10年': 'e_106',
          '10年以上': 'e_107'
        }
      }
    },
    rules: {
      jobInfo: {
        selector: 'li.item',
        type: 'html',
        handler: async (currentData, value, element) => {
          // console.log('element，begin：');
          const title = await element.$eval('.title-text', el => el.textContent?.trim() || '');
          const salary = await element.$eval('.salary', el => el.textContent?.trim() || '');
          const company = await element.$eval('.company', el => el.textContent?.trim() || '');
          const address = await element.$eval('.workplace', el => el.textContent?.trim() || '');
          
          const jobDetail = await element.$eval('a', el => {
            const href = el.getAttribute('href') || '';
            return href.startsWith('https://') ? href : `https://m.zhipin.com${href}`;
          });
          
          const tags = await element.$$eval('.labels span', elements => 
            elements.map(el => el.textContent?.trim() || '')
          );
          // console.log('element，当前元素内容：', { title, salary, company, address, jobDetail, tags });
          return { title, salary, company, address, jobDetail, tags };
        }
      }
    }
  },
  {
    url: '',
    name: 'zhipin-detail',
    urlPattern: '^https://m\.zhipin\.com/job_detail/.*$',
    urlBuilder: (url, params, paramsConfig) => {
      return url;
    },
    rules: {
      job: {
        selector: '.job-detail',
        type: 'html',
        handler: async (currentData, value, element) => {
          const jobDescription = await element.$eval('.job-sec > .text', el => el.textContent?.trim() || '');
          const companyDescription = await element.$eval('.job-sec > .detail-text', el => el.textContent?.trim() || '');
          return { jobDescription, companyDescription };         
        }
      }
    }
  },
  {
    url: '',
    name: 'liepin-detail',
    urlPattern: '^https://www.liepin.com/job/.*$',
    urlBuilder: (url, params, paramsConfig) => {
      return url;
    },
    rules: {
      job: {
        selector: 'body',
        type: 'html',
        handler: async (currentData, value, element) => {
          const jobDescription = await element.$eval('.job-intro-container dd', el => el.textContent?.trim() || '');
          const companyDescription = await element.$eval('.company-intro-container .ellipsis-3', el => el.textContent?.trim() || '');
          return { jobDescription, companyDescription };         
        }
      }
    }
  },
  // {
  //   url: 'https://www.zhipin.com/web/geek/job?query=%E5%89%8D%E7%AB%AF%E5%BC%80%E5%8F%91%20%E5%8D%97%E4%BA%AC',
  //   name: 'zhipin',
  //   urlPattern: '^https://www\.zhipin\.com/.+$',
  //   rules: {
  //     jobInfo: {
  //       selector: '.job-card-wrapper',
  //       type: 'html',
  //       handler: async (currentData, value, element) => {
  //         console.log('element，begin：');
  //         const title = await element.$eval('.job-name', el => el.textContent?.trim() || '');
  //         const salary = await element.$eval('.salary', el => el.textContent?.trim() || '');
  //         const company = await element.$eval('.job-card-right .company-name', el => el.textContent?.trim() || '');
  //         const tags = await element.$$eval('.tag-list li', elements => 
  //           elements.map(el => el.textContent?.trim() || '')
  //         );
  //         const address = await element.$eval('.job-area', el => el.textContent?.trim() || '');
  //         const jobDetail = await element.$eval('.job-card-left', el => el.getAttribute('href') || '');
  //         const jobExperience = await element.$eval('.info-desc', el => el.textContent?.trim() || '');
  //         console.log('element，当前元素内容：', { title, salary, company, tags, address, jobDetail, jobExperience });
  //         return { title, salary, company, tags, address, jobDetail, jobExperience };
  //       }
  //     }
  //   }
  // }
  // {
  //   url: 'https://www.pulsemcp.com/servers',
  //   name: 'mcp',
  //   urlPattern: '^https://www\.pulsemcp\.com\/servers/.*$',
  //   rules: {
  //     mcp: {
  //       selector: 'div[data-test-id].h-full > a',
  //       type: 'html',
  //       handler: async (currentData, value, element) => {
  //         const title = await element.$eval('.text-pulse-purple', el => el.textContent?.trim() || '');
  //         const imageUrl = await element.$eval('img.w-5', el => el.getAttribute('src') || '');
  //         const detailUrl = await element.getAttribute('href') || '';
  //         const author = await element.$eval('.mt-1', el => el.textContent?.trim() || '');
  //         const description = await element.$eval('.mt-2', el => el.textContent?.trim() || '');
  //         // const tags = await element.$$eval('.rounded-full', elements => 
  //         //   elements.map(el => el.textContent?.trim() || '')
  //         // );
  //         const originUrl = await element.$eval('.items-center', el => el.getAttribute('href') || '');
  //         return { title, imageUrl, detailUrl, author, description, originUrl };
  //       }
  //     }
  //   }
  // }
];

