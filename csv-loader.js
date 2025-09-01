// CSV数据加载器
class CSVLoader {
    constructor() {
        this.data = null;
    }

    // 加载CSV文件
    async loadCSV(filePath) {
        try {
            // 添加缓存破坏参数，确保获取最新数据
            const cacheBuster = new Date().getTime();
            const url = `${filePath}?v=${cacheBuster}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            if (!csvText || csvText.trim() === '') {
                throw new Error('CSV文件为空');
            }
            
            this.data = this.parseCSV(csvText);
            console.log('CSV数据加载成功，解析到', Object.keys(this.data).length, '个月份的数据');
            return this.data;
        } catch (error) {
            console.error('加载CSV文件失败:', error);
            // 提供更详细的错误信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查网络连接或文件路径');
            }
            throw error;
        }
    }

    // 解析CSV文本
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const result = {};
        let headers = [];
        let dataStarted = false;

        for (let line of lines) {
            // 跳过注释行和空行
            if (line.startsWith('#') || line.trim() === '') {
                continue;
            }

            const values = line.split(',');
            
            // 如果还没有开始数据部分，这一行就是表头
            if (!dataStarted) {
                headers = values.map(h => h.trim());
                dataStarted = true;
                continue;
            }

            // 解析数据行
            if (values.length >= headers.length && values[0].trim() !== '') {
                let monthKey = values[0].trim();
                
                // 转换月份格式："2024年1月" -> "2024-01"
                if (monthKey.includes('年') && monthKey.includes('月')) {
                    const yearMatch = monthKey.match(/(\d{4})年/);
                    const monthMatch = monthKey.match(/(\d{1,2})月/);
                    if (yearMatch && monthMatch) {
                        monthKey = `${yearMatch[1]}-${monthMatch[1].padStart(2, '0')}`;
                    }
                }
                
                // 如果该月份还没有数据，初始化
                if (!result[monthKey]) {
                    result[monthKey] = {
                        totalCost: 0,
                        totalChange: 0,
                        totalCount: 0,
                        countChange: 0,
                        avgCost: 0,
                        avgChange: 0,
                        pertimeCost: 0,
                        annualCost: 0,
                        score: {},
                        scoreChange: {},
                        pertimeData: {
                            companies: { labels: [], data: [] },
                            services: { labels: ['家客', '集客', '线路', '无线'], data: [0, 0, 0, 0] }
                        },
                        annualData: {
                            companies: { labels: [], data: [] },
                            services: { labels: ['家客', '集客', '线路', '无线'], data: [0, 0, 0, 0] }
                        },
                        details: [],
                        companyNames: []
                    };
                }
                
                // 解析并累加数据
                this.parseAndAccumulateData(values, headers, result[monthKey]);
            }
        }

        // 计算最终的按次和包年占比
        for (const monthKey in result) {
            const monthData = result[monthKey];
            if (monthData.pertimeServiceAmounts && monthData.annualServiceAmounts) {
                // 设置服务类型实际金额（转换为万元，四舍五入保留两位小数）
                for (let i = 0; i < 4; i++) {
                    monthData.pertimeData.services.data[i] = Math.round((monthData.pertimeServiceAmounts[i] / 10000) * 100) / 100;
                    monthData.annualData.services.data[i] = Math.round((monthData.annualServiceAmounts[i] / 10000) * 100) / 100;
                }
                
                // 设置公司实际金额（转换为万元，四舍五入保留两位小数）
                monthData.pertimeData.companies.labels.forEach((company, index) => {
                    const amount = monthData.pertimeCompanyAmounts[company] || 0;
                    monthData.pertimeData.companies.data[index] = Math.round((amount / 10000) * 100) / 100;
                });
                
                monthData.annualData.companies.labels.forEach((company, index) => {
                    const amount = monthData.annualCompanyAmounts[company] || 0;
                    monthData.annualData.companies.data[index] = Math.round((amount / 10000) * 100) / 100;
                });
            }
        }

        return result;
    }

    // 解析并累加数据到月度汇总
    parseAndAccumulateData(values, headers, monthData) {
        // 新的CSV格式：年/月,地市,代维公司,服务专业,包年折扣前金额小计（元）,按次折扣前金额小计（元）,折扣率,包年折扣后金额小计（元）,按次折扣后金额小计（元）,折扣后金额合计（元）,月度考核得分,月度考核系数,月度应付费用（元）,其他扣款（元）,月度实付费用（元）,月度质保金（元）,月度合计费用（元）,综合得分
        
        const rowData = {
            month: values[0]?.trim() || '',
            city: values[1]?.trim() || '',
            company: values[2]?.trim() || '',
            service: values[3]?.trim() || '',
            annualBeforeDiscount: parseFloat(values[4]) || 0,
            pertimeBeforeDiscount: parseFloat(values[5]) || 0,
            discountRate: parseFloat(values[6]) || 0,
            annualAfterDiscount: parseFloat(values[7]) || 0,
            pertimeAfterDiscount: parseFloat(values[8]) || 0,
            totalAfterDiscount: parseFloat(values[9]) || 0,
            monthlyScore: parseFloat(values[10]) || 0,
            monthlyCoefficient: values[11]?.replace('%', '') || '0',
            monthlyPayable: parseFloat(values[12]) || 0,
            otherDeductions: parseFloat(values[13]) || 0,
            monthlyActualPay: parseFloat(values[14]) || 0,
            monthlyQualityDeposit: parseFloat(values[15]) || 0,
            monthlyTotalCost: parseFloat(values[16]) || 0,
            comprehensiveScore: parseFloat(values[17]) || 0
        };
        
        // 保存详细数据
        monthData.details.push(rowData);
        
        // 如果是合计行，累加汇总数据
        if (rowData.service === '合计金额（元）') {
            // 按照用户要求：累加所有代维公司的"服务专业"列为"合计金额（元）"行的"月度合计费用（元）"列数据
            // 累加费用，最后统一除以10000并四舍五入保留整数值
            if (!monthData.totalCostSum) {
                monthData.totalCostSum = 0;
                monthData.totalCountSum = 0;
                monthData.pertimeCostSum = 0;
                monthData.annualCostSum = 0;
            }
            // 只累加正数值，避免负数影响总计
            if (rowData.monthlyTotalCost > 0) {
                monthData.totalCostSum += rowData.monthlyTotalCost;
            }
            if (rowData.monthlyPayable > 0) {
                monthData.totalCountSum += rowData.monthlyPayable;
            }
            if (rowData.pertimeAfterDiscount > 0) {
                monthData.pertimeCostSum += rowData.pertimeAfterDiscount;
            }
            if (rowData.annualAfterDiscount > 0) {
                monthData.annualCostSum += rowData.annualAfterDiscount;
            }
            
            // 计算最终的总结算费用（万元，四舍五入保留两位小数）
            monthData.totalCost = Math.round((monthData.totalCostSum / 10000) * 100) / 100;
            monthData.totalCount = Math.round((monthData.totalCountSum / 1000) * 100) / 100; // 估算次数（千次）
            monthData.avgCost = monthData.totalCount > 0 ? Math.round((monthData.totalCost * 10000 / monthData.totalCount) * 100) / 100 : 0;
            // 计算按次费用（万元，四舍五入保留两位小数）
            monthData.pertimeCost = Math.round((monthData.pertimeCostSum / 10000) * 100) / 100;
            // 计算包年费用（万元，四舍五入保留两位小数）
            monthData.annualCost = Math.round((monthData.annualCostSum / 10000) * 100) / 100;
            
            // 合计行不处理评分，评分在非合计行处理
        }
        
        // 收集公司名称和评分（使用每个公司第一行的综合得分）
        if (rowData.company && !monthData.companyNames.includes(rowData.company)) {
            monthData.companyNames.push(rowData.company);
        }
        
        // 如果是非合计行且有综合得分，且该公司还没有评分记录，则记录评分
        if (rowData.service !== '合计金额（元）' && rowData.company && rowData.comprehensiveScore > 0 && !monthData.score[rowData.company]) {
            monthData.score[rowData.company] = rowData.comprehensiveScore;
        }
        // 确保公司在labels和data数组中
        if (rowData.company && rowData.company !== '') {
            if (!monthData.pertimeData.companies.labels.includes(rowData.company)) {
                monthData.pertimeData.companies.labels.push(rowData.company);
                monthData.pertimeData.companies.data.push(0);
                monthData.annualData.companies.labels.push(rowData.company);
                monthData.annualData.companies.data.push(0);
            }
        }
        
        // 累加服务类型的按次和包年金额
        if (rowData.service !== '合计金额（元）') {
            // 初始化累加器
            if (!monthData.pertimeServiceAmounts) {
                monthData.pertimeServiceAmounts = [0, 0, 0, 0]; // 家客、集客、线路、无线
                monthData.annualServiceAmounts = [0, 0, 0, 0];
                monthData.pertimeCompanyAmounts = {};
                monthData.annualCompanyAmounts = {};
            }
            
            // 根据服务类型累加金额
            if (rowData.service === '家庭宽带') {
                monthData.pertimeServiceAmounts[0] += rowData.pertimeAfterDiscount;
                monthData.annualServiceAmounts[0] += rowData.annualAfterDiscount;
            } else if (rowData.service === '集团专线') {
                monthData.pertimeServiceAmounts[1] += rowData.pertimeAfterDiscount;
                monthData.annualServiceAmounts[1] += rowData.annualAfterDiscount;
            } else if (rowData.service === '传输线路') {
                monthData.pertimeServiceAmounts[2] += rowData.pertimeAfterDiscount;
                monthData.annualServiceAmounts[2] += rowData.annualAfterDiscount;
            } else if (rowData.service === '基站（含铁塔）' || rowData.service === '直放站室分') {
                monthData.pertimeServiceAmounts[3] += rowData.pertimeAfterDiscount;
                monthData.annualServiceAmounts[3] += rowData.annualAfterDiscount;
            }
            
            // 累加公司金额
            if (rowData.company) {
                if (!monthData.pertimeCompanyAmounts[rowData.company]) {
                    monthData.pertimeCompanyAmounts[rowData.company] = 0;
                    monthData.annualCompanyAmounts[rowData.company] = 0;
                }
                monthData.pertimeCompanyAmounts[rowData.company] += rowData.pertimeAfterDiscount;
                monthData.annualCompanyAmounts[rowData.company] += rowData.annualAfterDiscount;
            }
        }
    }

    // 获取所有可用的年月选项
    getAvailableMonths() {
        if (!this.data) {
            return [];
        }
        // 按时间顺序从前往后排序
        return Object.keys(this.data).sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            
            if (yearA !== yearB) {
                return yearA - yearB;
            }
            return monthA - monthB;
        });
    }
    
    // 获取最新月份
    getLatestMonth() {
        const months = this.getAvailableMonths();
        return months.length > 0 ? months[months.length - 1] : null;
    }

    // 获取指定月份的数据
    getMonthData(monthKey) {
        if (!this.data || !this.data[monthKey]) {
            console.warn(`未找到月份数据: ${monthKey}`);
            return null;
        }
        return this.data[monthKey];
    }

    // 计算同比变化百分比
    calculateYearOverYearChange(currentMonthKey) {
        if (!this.data || !this.data[currentMonthKey]) {
            return {
                totalChange: 0,
                countChange: 0,
                avgChange: 0,
                scoreChange: {}
            };
        }

        // 解析当前月份
        const [currentYear, currentMonth] = currentMonthKey.split('-');
        const lastYear = (parseInt(currentYear) - 1).toString();
        const lastYearMonthKey = `${lastYear}-${currentMonth}`;

        // 获取去年同期数据
        const lastYearData = this.data[lastYearMonthKey];
        const currentData = this.data[currentMonthKey];

        if (!lastYearData) {
            // 如果没有去年同期数据，返回0%变化
            return {
                totalChange: 0,
                countChange: 0,
                avgChange: 0,
                pertimeChange: 0,
                annualChange: 0,
                scoreChange: {}
            };
        }

        // 计算同比变化百分比：(今年 - 去年) / 去年 * 100，保留两位小数
        const totalChange = lastYearData.totalCost > 0 ? 
            Math.round(((currentData.totalCost - lastYearData.totalCost) / lastYearData.totalCost) * 10000) / 100 : 0;
        
        const countChange = lastYearData.totalCount > 0 ? 
            Math.round(((currentData.totalCount - lastYearData.totalCount) / lastYearData.totalCount) * 10000) / 100 : 0;
        
        const avgChange = lastYearData.avgCost > 0 ? 
            Math.round(((currentData.avgCost - lastYearData.avgCost) / lastYearData.avgCost) * 10000) / 100 : 0;
        
        const pertimeChange = lastYearData.pertimeCost > 0 ? 
            Math.round(((currentData.pertimeCost - lastYearData.pertimeCost) / lastYearData.pertimeCost) * 10000) / 100 : 0;
        
        const annualChange = lastYearData.annualCost > 0 ? 
            Math.round(((currentData.annualCost - lastYearData.annualCost) / lastYearData.annualCost) * 10000) / 100 : 0;

        // 计算评分同比变化，保留两位小数 - 动态处理所有公司
        const scoreChange = {};
        
        // 获取所有公司名称（当前年和去年的并集）
        const allCompanies = new Set([
            ...Object.keys(currentData.score || {}),
            ...Object.keys(lastYearData.score || {})
        ]);
        
        for (const company of allCompanies) {
            const currentScore = currentData.score[company] || 0;
            const lastYearScore = lastYearData.score[company] || 0;
            
            scoreChange[company] = lastYearScore > 0 ? 
                Math.round(((currentScore - lastYearScore) / lastYearScore) * 10000) / 100 : 0;
        }

        return {
            totalChange,
            countChange,
            avgChange,
            pertimeChange,
            annualChange,
            scoreChange
        };
    }

    // 生成年月选择器选项HTML
    generateMonthOptions(defaultMonth = null) {
        const months = this.getAvailableMonths();
        let optionsHTML = '';
        
        months.forEach(month => {
            const [year, monthNum] = month.split('-');
            const monthName = `${year}年${parseInt(monthNum)}月`;
            const selected = month === defaultMonth ? 'selected' : '';
            optionsHTML += `<option value="${month}" ${selected}>${monthName}</option>\n`;
        });
        
        return optionsHTML;
    }

    // 更新年月选择器
    updateMonthSelector(selectorId, defaultMonth = null) {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.innerHTML = this.generateMonthOptions(defaultMonth);
        }
    }
    
    // 获取月度详细数据
    getMonthDetails(monthKey) {
        if (!this.data || !this.data[monthKey]) {
            return [];
        }
        return this.data[monthKey].details || [];
    }
    
    // 获取公司汇总数据
    getCompanySummary(monthKey) {
        const details = this.getMonthDetails(monthKey);
        const summary = {};
        
        details.forEach(row => {
            if (row.service === '合计金额（元）') {
                summary[row.company] = {
                    totalCost: row.monthlyTotalCost,
                    score: row.comprehensiveScore,
                    payable: row.monthlyPayable,
                    actualPay: row.monthlyActualPay
                };
            }
        });
        
        return summary;
    }
    
    // 获取代维公司名称和第一行综合评分
    getCompanyScores(monthKey) {
        const details = this.getMonthDetails(monthKey);
        const companies = {};
        const companyFirstScores = {};
        
        details.forEach(row => {
            // 收集所有代维公司名称
            if (!companies[row.company]) {
                companies[row.company] = true;
            }
            
            // 获取每个公司第一行的综合评分（非合计行且有评分的第一行）
            if (row.service !== '合计金额（元）' && row.comprehensiveScore > 0 && !companyFirstScores[row.company]) {
                companyFirstScores[row.company] = row.comprehensiveScore;
            }
        });
        
        return {
            companyNames: Object.keys(companies),
            firstLineScores: companyFirstScores
        };
    }
    
    // 根据专业类型筛选月度数据
    getFilteredMonthData(monthKey, profession = 'all') {
        if (!this.data || !this.data[monthKey]) {
            console.warn(`未找到月份数据: ${monthKey}`);
            return null;
        }
        
        const originalData = this.data[monthKey];
        
        // 如果选择全部专业，返回原始数据
        if (profession === 'all') {
            return originalData;
        }
        
        // 专业映射
        const professionMap = {
            'jiake': ['家庭宽带'],
            'jike': ['集团专线'],
            'xianlu': ['传输线路'],
            'wuxian': ['基站（含铁塔）', '直放站室分']
        };
        
        const targetServices = professionMap[profession] || [];
        
        // 筛选详细数据
        const filteredDetails = originalData.details.filter(row => {
            return targetServices.includes(row.service) || row.service === '合计金额（元）';
        });
        
        // 重新计算汇总数据 - 按用户要求的计算逻辑
        let totalCostSum = 0;
        let totalCountSum = 0;
        let pertimeCostSum = 0;
        const scores = {};
        
        // 按专业类型计算费用
        if (profession === 'jiake') {
            // 家客结算费用：查找"服务专业"列的"家庭宽带"所在行的"月度合计费用（元）"
            const jiakeRows = originalData.details.filter(row => row.service === '家庭宽带');
            totalCostSum = jiakeRows.reduce((sum, row) => sum + row.monthlyTotalCost, 0);
            totalCountSum = jiakeRows.reduce((sum, row) => sum + row.monthlyPayable, 0);
            pertimeCostSum = jiakeRows.reduce((sum, row) => sum + row.pertimeAfterDiscount, 0);
        } else if (profession === 'jike') {
            // 集客结算费用：查找"服务专业"列的"集团专线"所在行的"月度合计费用（元）"
            const jikeRows = originalData.details.filter(row => row.service === '集团专线');
            totalCostSum = jikeRows.reduce((sum, row) => sum + row.monthlyTotalCost, 0);
            totalCountSum = jikeRows.reduce((sum, row) => sum + row.monthlyPayable, 0);
            pertimeCostSum = jikeRows.reduce((sum, row) => sum + row.pertimeAfterDiscount, 0);
        } else if (profession === 'xianlu') {
            // 线路结算费用：查找"服务专业"列的"传输线路"所在行的"月度合计费用（元）"
            const xianluRows = originalData.details.filter(row => row.service === '传输线路');
            totalCostSum = xianluRows.reduce((sum, row) => sum + row.monthlyTotalCost, 0);
            totalCountSum = xianluRows.reduce((sum, row) => sum + row.monthlyPayable, 0);
            pertimeCostSum = xianluRows.reduce((sum, row) => sum + row.pertimeAfterDiscount, 0);
        } else if (profession === 'wuxian') {
            // 无线结算费用：查找"基站（含铁塔）"和"直放站室分"两行的"月度合计费用（元）"相加
            const wuxianRows = originalData.details.filter(row => 
                row.service === '基站（含铁塔）' || row.service === '直放站室分'
            );
            totalCostSum = wuxianRows.reduce((sum, row) => sum + row.monthlyTotalCost, 0);
            totalCountSum = wuxianRows.reduce((sum, row) => sum + row.monthlyPayable, 0);
            pertimeCostSum = wuxianRows.reduce((sum, row) => sum + row.pertimeAfterDiscount, 0);
        }
        
        // 获取评分（从合计行获取）- 动态处理所有公司
         const summaryRows = originalData.details.filter(row => row.service === '合计金额（元）');
         summaryRows.forEach(row => {
             if (row.company && row.comprehensiveScore) {
                 scores[row.company] = row.comprehensiveScore;
             }
         });
         
         // 创建筛选后的数据对象
        const filteredData = {
            ...originalData,
            details: filteredDetails,
            totalCost: Math.round((totalCostSum / 10000) * 100) / 100,
            totalCount: Math.round((totalCountSum / 1000) * 100) / 100,
            avgCost: totalCountSum > 0 ? Math.round((totalCostSum / (totalCountSum / 1000)) * 100) / 100 : 0,
            pertimeCost: Math.round((pertimeCostSum / 10000) * 100) / 100,
            score: scores
        };
        
        return filteredData;
    }
}

// 全局CSV加载器实例
window.csvLoader = new CSVLoader();