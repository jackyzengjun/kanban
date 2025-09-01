// 全局变量
let charts = {
    totalTrend: null,
    pertimeCompany: null,
    pertimeService: null,
    annualCompany: null,
    annualService: null
};
let currentTab = 'total';
let isDataLoaded = false;
let csvData = null; // 存储从CSV加载的数据


// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 显示加载状态
    showLoadingStatus('正在加载数据...');
    
    try {
        // 尝试加载CSV数据
        await loadCSVData();
        showLoadingStatus('数据加载成功', 'success');
    } catch (error) {
        console.warn('CSV数据加载失败，使用默认数据:', error);
        showLoadingStatus('数据加载失败，使用默认数据', 'warning');
        // 使用默认数据
        csvData = generateDefaultData();
        isDataLoaded = false;
    }
    
    initializeDashboard();
    
    // 添加时间选择器事件监听
    const periodStart = document.getElementById('periodStart');
    const periodEnd = document.getElementById('periodEnd');
    if (periodStart) periodStart.addEventListener('change', updateChartData);
    if (periodEnd) periodEnd.addEventListener('change', updateChartData);
    
    // 添加月份选择器事件监听
    const monthSelector = document.getElementById('month-selector');
    if (monthSelector) {
        monthSelector.addEventListener('change', function() {
            updateMonthlyData();
            updateChartData(); // 同时更新趋势图表
        });
    }
    
    // 添加专业选择器事件监听
    const professionSelector = document.getElementById('profession-selector');
    if (professionSelector) {
        professionSelector.addEventListener('change', function() {
            updateMonthlyData();
            updateChartData(); // 同时更新趋势图表
        });
    }
    
    // 隐藏加载状态
    setTimeout(() => hideLoadingStatus(), 2000);
});

// 加载CSV数据
async function loadCSVData() {
    try {
        console.log('开始加载CSV数据...');
        csvData = await csvLoader.loadCSV('./monthly_data_template.csv');
        
        if (csvData && Object.keys(csvData).length > 0) {
            isDataLoaded = true;
            
            // 更新月份选择器选项，默认选择最新月份
            const latestMonth = csvLoader.getLatestMonth();
            csvLoader.updateMonthSelector('month-selector', latestMonth);
            
            console.log('CSV数据加载成功，共加载', Object.keys(csvData).length, '个月份的数据');
        } else {
            throw new Error('CSV数据为空');
        }
    } catch (error) {
        console.error('CSV数据加载失败:', error);
        isDataLoaded = false;
        throw error;
    }
}

// 刷新数据函数
function refreshData() {
    loadCSVData().then(() => {
        updateMonthlyData();
        console.log('数据刷新完成');
    }).catch(error => {
        console.error('数据刷新失败:', error);
        alert('数据刷新失败，请检查CSV文件是否存在');
    });
}

// 初始化仪表板
function initializeDashboard() {
    console.log('开始初始化仪表板...');
    console.log('CSV数据:', csvData);
    
    updateDateTime();
    updateChartData(); // 初始化时更新图表数据和标题
    initializeCharts(); // 先初始化图表
    updateMonthlyData(); // 然后更新月度数据
    
    // 每秒更新时间
    setInterval(updateDateTime, 1000);
    
    console.log('仪表板初始化完成');
}

// 标签切换功能
function switchTab(tabName) {
    // 更新当前标签
    currentTab = tabName;
    
    // 移除所有活动状态
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 添加当前标签的活动状态
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-content`).classList.add('active');
    
    // 重新初始化当前标签的图表
    initializeCurrentTabCharts();
}

// 更新日期时间
function updateDateTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    document.getElementById('datetime').textContent = now.toLocaleString('zh-CN', options);
}

// 格式化货币
function formatCurrency(amount) {
    return '¥' + (amount / 10000).toFixed(1) + '万';
}

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

// 更新图表数据和标题
function updateChartData() {
    if (!csvData) {
        console.warn('CSV数据未加载');
        return;
    }
    
    const startPeriod = document.getElementById('periodStart').value;
    const endPeriod = document.getElementById('periodEnd').value;
    const selectedProfession = document.getElementById('profession-selector').value;
    
    // 计算月份数量
    const startDate = new Date(startPeriod + '-01');
    const endDate = new Date(endPeriod + '-01');
    const monthCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
    
    // 生成月份标签和数据
    const labels = [];
    const data = [];
    
    for (let i = 0; i < monthCount; i++) {
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        
        labels.push(month + '月');
        
        // 使用筛选方法获取数据
        const filteredData = window.csvLoader.getFilteredMonthData(monthKey, selectedProfession);
        if (filteredData) {
            data.push(filteredData.totalCost); // 已经是万元单位，直接使用
        } else {
            data.push(0); // 如果没有数据，使用0
        }
    }
    
    // 更新图表标题
    const titleElement = document.getElementById('trendChartTitle');
    if (titleElement) {
        const professionNames = {
            'all': '全部专业',
            'jiake': '家客专业',
            'jike': '集客专业', 
            'xianlu': '线路专业',
            'wuxian': '无线专业'
        };
        const professionName = professionNames[selectedProfession] || '全部专业';
        titleElement.textContent = `月度结算费用趋势 - ${professionName}`;
    }
    
    // 如果图表已经初始化，重新渲染
    if (charts.totalTrend && currentTab === 'total') {
        initTotalTrendChart();
    }
}

// 更新月度数据
function updateMonthlyData() {
    if (!csvData) {
        console.warn('CSV数据未加载');
        return;
    }
    
    const selectedMonth = document.getElementById('month-selector').value;
    const selectedProfession = document.getElementById('profession-selector').value;
    
    // 使用筛选方法获取数据
    const monthData = window.csvLoader.getFilteredMonthData(selectedMonth, selectedProfession);
    
    if (!monthData) {
        console.warn('未找到月份数据:', selectedMonth);
        return;
    }
    
    // 计算同比变化数据（基于筛选后的数据）
    const yearOverYearChanges = window.csvLoader.calculateYearOverYearChange(selectedMonth);
    
    // 将同比变化数据合并到月度数据中
    const enhancedMonthData = {
        ...monthData,
        totalChange: yearOverYearChanges.totalChange,
        countChange: yearOverYearChanges.countChange,
        avgChange: yearOverYearChanges.avgChange,
        pertimeChange: yearOverYearChanges.pertimeChange,
        annualChange: yearOverYearChanges.annualChange,
        scoreChange: yearOverYearChanges.scoreChange
    };
    
    // 更新顶部卡片数据
    updateTopCards(enhancedMonthData);
    
    // 更新评分卡片
    updateScoreCards(enhancedMonthData);
    
    // 更新图表数据（除了月度结算费用趋势）
    updateChartsData(enhancedMonthData);
}

// 更新顶部卡片
function updateTopCards(monthData) {
    // 更新总结算费用 - 保留两位小数
    document.querySelector('#totalSettlement').textContent = monthData.totalCost.toFixed(2) + '万';
    
    // 更新总结算费用百分比变化
    const totalCostChangeElement = document.querySelector('#totalCostChange');
    const totalChangeIcon = monthData.totalChange > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
    totalCostChangeElement.innerHTML = `<i class="${totalChangeIcon}"></i> ${monthData.totalChange > 0 ? '+' : ''}${monthData.totalChange.toFixed(2)}%`;
    totalCostChangeElement.className = 'metric-change ' + (monthData.totalChange > 0 ? 'positive' : 'negative');
    
    // 获取各代维公司的费用明细
    const selectedMonth = document.getElementById('month-selector').value;
    const companySummary = window.csvLoader.getCompanySummary(selectedMonth);
    
    // 更新代维公司费用明细显示
    const companyCostDetails = document.getElementById('companyCostDetails');
    companyCostDetails.innerHTML = '';
    Object.keys(companySummary).forEach(company => {
        const costInWan = Math.round((companySummary[company].totalCost / 10000) * 100) / 100;
        const companyItem = document.createElement('div');
        companyItem.className = 'company-cost-item';
        companyItem.textContent = `${company}: ${costInWan.toFixed(2)}万`;
        companyCostDetails.appendChild(companyItem);
    });
    
    // 更新总次数 - 显示为次数，保留两位小数
    document.querySelector('.metric-card:nth-child(2) .metric-value').textContent = monthData.totalCount.toFixed(2) + '次';
    const countChangeElement = document.querySelector('.metric-card:nth-child(2) .metric-change');
    const countChangeIcon = monthData.countChange > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
    countChangeElement.innerHTML = `<i class="${countChangeIcon}"></i> ${monthData.countChange > 0 ? '+' : ''}${monthData.countChange.toFixed(2)}%`;
    countChangeElement.className = 'metric-change ' + (monthData.countChange > 0 ? 'positive' : 'negative');
    
    // 更新按次费用 - 显示为万元，保留两位小数
    const pertimeCostElement = document.querySelector('#pertimeCost');
    if (pertimeCostElement && monthData.pertimeCost !== undefined) {
        pertimeCostElement.textContent = monthData.pertimeCost.toFixed(2) + '万';
    }
    const pertimeChangeElement = document.querySelector('.metric-card:nth-child(3) .metric-change');
    if (pertimeChangeElement && monthData.pertimeChange !== undefined) {
        const pertimeChangeIcon = monthData.pertimeChange > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
        pertimeChangeElement.innerHTML = `<i class="${pertimeChangeIcon}"></i> ${monthData.pertimeChange > 0 ? '+' : ''}${monthData.pertimeChange.toFixed(2)}%`;
        pertimeChangeElement.className = 'metric-change ' + (monthData.pertimeChange > 0 ? 'positive' : 'negative');
    }
    
    // 更新包年费用 - 显示为万元，保留两位小数
    const annualCostElement = document.querySelector('#annualCost');
    if (annualCostElement && monthData.annualCost !== undefined) {
        annualCostElement.textContent = monthData.annualCost.toFixed(2) + '万';
    }
    const annualChangeElement = document.querySelector('.metric-card:nth-child(4) .metric-change');
    if (annualChangeElement && monthData.annualChange !== undefined) {
        const annualChangeIcon = monthData.annualChange > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
        annualChangeElement.innerHTML = `<i class="${annualChangeIcon}"></i> ${monthData.annualChange > 0 ? '+' : ''}${monthData.annualChange.toFixed(2)}%`;
        annualChangeElement.className = 'metric-change ' + (monthData.annualChange > 0 ? 'positive' : 'negative');
    }

}

// 更新评分卡片
function updateScoreCards(monthData) {
    const selectedMonth = document.getElementById('month-selector').value;
    const companyScores = window.csvLoader.getCompanyScores(selectedMonth);
    
    // 获取评分卡片容器
    const scoreCardContainer = document.querySelector('.metric-card:nth-child(4) .metric-value-dual');
    
    // 清空现有内容
    scoreCardContainer.innerHTML = '';
    
    // 动态创建公司评分组
    companyScores.companyNames.forEach((companyName, index) => {
        const companyGroup = document.createElement('div');
        companyGroup.className = `company-score-group ${index > 0 ? companyName.toLowerCase() : ''}`;
        
        // 获取第一行评分
        const firstLineScore = companyScores.firstLineScores[companyName] || 0;
        
        // 获取同比变化（动态处理所有公司）
        const scoreChange = monthData.scoreChange[companyName] || 0;
        
        const changeIcon = scoreChange > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
        const changeClass = scoreChange > 0 ? 'positive' : 'negative';
        
        companyGroup.innerHTML = `
            <div class="company-score">
                <span class="company-name">${companyName}：</span>
                <span class="score-value">${firstLineScore}分</span>
            </div>
            <div class="company-change ${changeClass}">
                <i class="${changeIcon}"></i> ${scoreChange > 0 ? '+' : ''}${scoreChange.toFixed(2)}%
            </div>
        `;
        
        scoreCardContainer.appendChild(companyGroup);
    });
}

// 更新图表数据
function updateChartsData(monthData) {
    // 重新初始化饼图以确保使用筛选后的数据
    if (currentTab === 'pertime') {
        initPertimeCompanyChart();
        initPertimeServiceChart();
    } else if (currentTab === 'annual') {
        initAnnualCompanyChart();
        initAnnualServiceChart();
    }
}

// 初始化所有图表
function initializeCharts() {
    initializeCurrentTabCharts();
}

// 初始化当前标签的图表
function initializeCurrentTabCharts() {
    switch(currentTab) {
        case 'total':
            initTotalTrendChart();
            break;
        case 'pertime':
            initPertimeCharts();
            break;
        case 'annual':
            initAnnualCharts();
            break;
    }
}

// 初始化总费用趋势图
function initTotalTrendChart() {
    const canvas = document.getElementById('totalTrendChart');
    if (!canvas) return;
    
    if (!csvData) {
        console.warn('CSV数据未加载，无法初始化趋势图');
        return;
    }
    
    // 销毁已存在的图表
    if (charts.totalTrend) {
        charts.totalTrend.destroy();
    }
    
    // 从CSV数据生成图表数据
    const startPeriod = document.getElementById('periodStart').value;
    const endPeriod = document.getElementById('periodEnd').value;
    
    const startDate = new Date(startPeriod + '-01');
    const endDate = new Date(endPeriod + '-01');
    const monthCount = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
    
    const labels = [];
    const data = [];
    
    // 获取当前选择的专业
    const selectedProfession = document.getElementById('profession-selector').value;
    
    for (let i = 0; i < monthCount; i++) {
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        
        labels.push(month + '月');
        
        // 根据专业筛选获取数据
        const filteredData = window.csvLoader.getFilteredMonthData(monthKey, selectedProfession);
        if (filteredData) {
            // totalCost已经是万元单位，直接使用
            data.push(filteredData.totalCost);
        } else {
            data.push(0);
        }
    }
    
    charts.totalTrend = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedProfession === 'all' ? '月度结算费用' : 
                       selectedProfession === 'jiake' ? '家客月度结算费用' :
                       selectedProfession === 'jike' ? '集客月度结算费用' :
                       selectedProfession === 'xianlu' ? '线路月度结算费用' :
                       selectedProfession === 'wuxian' ? '无线月度结算费用' : '月度结算费用',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#bdc3c7'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#bdc3c7',
                        callback: function(value) {
                            return '¥' + value.toFixed(2) + '万';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// 初始化按次分析图表
function initPertimeCharts() {
    initPertimeCompanyChart();
    initPertimeServiceChart();
}

// 初始化按次分析-代维公司饼图
function initPertimeCompanyChart() {
    const canvas = document.getElementById('pertimeCompanyChart');
    if (!canvas) return;
    
    // 销毁已存在的图表
    if (charts.pertimeCompany) {
        charts.pertimeCompany.destroy();
    }
    
    // 获取当前选择的月份和专业数据
    const selectedMonth = document.getElementById('month-selector').value;
    const selectedProfession = document.getElementById('profession-selector').value;
    const currentData = window.csvLoader.getFilteredMonthData(selectedMonth, selectedProfession);
    
    charts.pertimeCompany = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: currentData.pertimeData.companies.labels,
            datasets: [{
                label: '代维公司费用分布',
                data: currentData.pertimeData.companies.data,
                backgroundColor: [
                    '#3498db',
                    '#e74c3c'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(2)}万 (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: 20
            },
            elements: {
                arc: {
                    borderWidth: 2
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const dataset = chart.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index]; // 这是实际金额
                        const percentage = ((value / total) * 100).toFixed(1);
                        
                        // 只在扇形足够大时显示标签
                        if (percentage > 5) {
                            const centerPoint = element.getCenterPoint();
                            const model = element.getProps(['startAngle', 'endAngle', 'outerRadius']);
                            const midAngle = (model.startAngle + model.endAngle) / 2;
                            const radius = model.outerRadius * 0.7;
                            
                            const x = centerPoint.x + Math.cos(midAngle) * radius;
                            const y = centerPoint.y + Math.sin(midAngle) * radius;
                            
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // 绘制百分比
                            ctx.fillText(`${percentage}%`, x, y - 8);
                            // 绘制实际费用金额
                            ctx.fillText(`${value.toFixed(1)}万`, x, y + 8);
                        }
                    });
                });
            }
        }]
    });
}

// 初始化按次分析-服务专业饼图
function initPertimeServiceChart() {
    const canvas = document.getElementById('pertimeServiceChart');
    if (!canvas) return;
    
    // 销毁已存在的图表
    if (charts.pertimeService) {
        charts.pertimeService.destroy();
    }
    
    // 获取当前选择的月份和专业数据
    const selectedMonth = document.getElementById('month-selector').value;
    const selectedProfession = document.getElementById('profession-selector').value;
    const currentData = window.csvLoader.getFilteredMonthData(selectedMonth, selectedProfession);
    
    charts.pertimeService = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: currentData.pertimeData.services.labels,
            datasets: [{
                label: '服务专业费用分布',
                data: currentData.pertimeData.services.data,
                backgroundColor: [
                    '#3498db',
                    '#e74c3c',
                    '#f39c12',
                    '#2ecc71'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(2)}万 (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: 20
            },
            elements: {
                arc: {
                    borderWidth: 2
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const dataset = chart.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        const percentage = ((value / total) * 100).toFixed(1);
                        
                        // 只在扇形足够大时显示标签
                        if (percentage > 3) {
                            const centerPoint = element.getCenterPoint();
                            const model = element.getProps(['startAngle', 'endAngle', 'outerRadius']);
                            const midAngle = (model.startAngle + model.endAngle) / 2;
                            const radius = model.outerRadius * 0.7;
                            
                            const x = centerPoint.x + Math.cos(midAngle) * radius;
                            const y = centerPoint.y + Math.sin(midAngle) * radius;
                            
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // 绘制百分比
                            ctx.fillText(`${percentage}%`, x, y - 8);
                            // 绘制费用
                            ctx.fillText(`${value.toFixed(1)}万`, x, y + 8);
                        }
                    });
                });
            }
        }]
    });
}

// 显示加载状态
function showLoadingStatus(message, type = 'info') {
    let statusDiv = document.getElementById('loading-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'loading-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(statusDiv);
    }
    
    const colors = {
        info: '#3498db',
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c'
    };
    
    statusDiv.style.backgroundColor = colors[type] || colors.info;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
}

// 隐藏加载状态
function hideLoadingStatus() {
    const statusDiv = document.getElementById('loading-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

// 生成默认数据（当CSV加载失败时使用）
function generateDefaultData() {
    const defaultData = {};
    const currentDate = new Date();
    
    // 生成最近6个月的默认数据
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        defaultData[monthKey] = {
            totalCost: Math.random() * 500 + 200, // 200-700万
            totalChange: (Math.random() - 0.5) * 20, // -10% 到 +10%
            totalCount: Math.floor(Math.random() * 100) + 50, // 50-150个项目
            countChange: (Math.random() - 0.5) * 30, // -15% 到 +15%
            avgCost: Math.random() * 10 + 5, // 5-15万
            avgChange: (Math.random() - 0.5) * 15, // -7.5% 到 +7.5%
            pertimeCost: Math.random() * 200 + 100, // 100-300万
            annualCost: Math.random() * 300 + 100, // 100-400万
            score: {
                '铁通': Math.random() * 20 + 80, // 80-100分
                '长实': Math.random() * 20 + 80,
                '嘉环': Math.random() * 20 + 80
            },
            scoreChange: {
                '铁通': (Math.random() - 0.5) * 10,
                '长实': (Math.random() - 0.5) * 10,
                '嘉环': (Math.random() - 0.5) * 10
            },
            pertimeData: {
                companies: {
                    labels: ['铁通', '长实', '嘉环'],
                    data: [Math.random() * 100 + 50, Math.random() * 80 + 40, Math.random() * 60 + 30]
                },
                services: {
                    labels: ['家客', '集客', '线路', '无线'],
                    data: [Math.random() * 80 + 40, Math.random() * 60 + 30, Math.random() * 70 + 35, Math.random() * 50 + 25]
                }
            },
            annualData: {
                companies: {
                    labels: ['铁通', '长实', '嘉环'],
                    data: [Math.random() * 120 + 60, Math.random() * 100 + 50, Math.random() * 80 + 40]
                },
                services: {
                    labels: ['家客', '集客', '线路', '无线'],
                    data: [Math.random() * 100 + 50, Math.random() * 80 + 40, Math.random() * 90 + 45, Math.random() * 70 + 35]
                }
            },
            details: [],
            companyNames: ['铁通', '长实', '嘉环']
        };
    }
    
    console.log('使用默认数据，生成了', Object.keys(defaultData).length, '个月份的数据');
    return defaultData;
}

// 初始化包年分析图表
function initAnnualCharts() {
    initAnnualCompanyChart();
    initAnnualServiceChart();
}

// 初始化包年分析-代维公司饼图
function initAnnualCompanyChart() {
    const canvas = document.getElementById('annualCompanyChart');
    if (!canvas) return;
    
    // 销毁已存在的图表
    if (charts.annualCompany) {
        charts.annualCompany.destroy();
    }
    
    // 获取当前选择的月份和专业数据
    const selectedMonth = document.getElementById('month-selector').value;
    const selectedProfession = document.getElementById('profession-selector').value;
    const currentData = window.csvLoader.getFilteredMonthData(selectedMonth, selectedProfession);
    
    charts.annualCompany = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: currentData.annualData.companies.labels,
            datasets: [{
                label: '代维公司费用分布',
                data: currentData.annualData.companies.data,
                backgroundColor: [
                    '#3498db',
                    '#e74c3c'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(2)}万 (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: 20
            },
            elements: {
                arc: {
                    borderWidth: 2
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const dataset = chart.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        const percentage = ((value / total) * 100).toFixed(1);
                        
                        // 只在扇形足够大时显示标签
                        if (percentage > 5) {
                            const centerPoint = element.getCenterPoint();
                            const model = element.getProps(['startAngle', 'endAngle', 'outerRadius']);
                            const midAngle = (model.startAngle + model.endAngle) / 2;
                            const radius = model.outerRadius * 0.7;
                            
                            const x = centerPoint.x + Math.cos(midAngle) * radius;
                            const y = centerPoint.y + Math.sin(midAngle) * radius;
                            
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // 绘制百分比
                            ctx.fillText(`${percentage}%`, x, y - 8);
                            // 绘制费用
                            ctx.fillText(`${value.toFixed(1)}万`, x, y + 8);
                        }
                    });
                });
            }
        }]
    });
}

// 初始化包年分析-服务专业饼图
function initAnnualServiceChart() {
    const canvas = document.getElementById('annualServiceChart');
    if (!canvas) return;
    
    // 销毁已存在的图表
    if (charts.annualService) {
        charts.annualService.destroy();
    }
    
    // 获取当前选择的月份和专业数据
    const selectedMonth = document.getElementById('month-selector').value;
    const selectedProfession = document.getElementById('profession-selector').value;
    const currentData = window.csvLoader.getFilteredMonthData(selectedMonth, selectedProfession);
    
    charts.annualService = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: currentData.annualData.services.labels,
            datasets: [{
                label: '服务专业费用分布',
                data: currentData.annualData.services.data,
                backgroundColor: [
                    '#3498db',
                    '#e74c3c',
                    '#f39c12',
                    '#2ecc71'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(2)}万 (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: 20
            },
            elements: {
                arc: {
                    borderWidth: 2
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const dataset = chart.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        const percentage = ((value / total) * 100).toFixed(1);
                        
                        // 只在扇形足够大时显示标签
                        if (percentage > 3) {
                            const centerPoint = element.getCenterPoint();
                            const model = element.getProps(['startAngle', 'endAngle', 'outerRadius']);
                            const midAngle = (model.startAngle + model.endAngle) / 2;
                            const radius = model.outerRadius * 0.7;
                            
                            const x = centerPoint.x + Math.cos(midAngle) * radius;
                            const y = centerPoint.y + Math.sin(midAngle) * radius;
                            
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // 绘制百分比
                            ctx.fillText(`${percentage}%`, x, y - 8);
                            // 绘制费用
                            ctx.fillText(`${value.toFixed(1)}万`, x, y + 8);
                        }
                    });
                });
            }
        }]
    });
}