// 简化的图表库 - 使用原生Canvas API
class SimpleChart {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = config.type || 'line';
        this.data = config.data || {};
        this.options = config.options || {};
        this.width = canvas.width = canvas.offsetWidth * 2;
        this.height = canvas.height = canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);
        this.canvas.style.width = canvas.offsetWidth + 'px';
        this.canvas.style.height = canvas.offsetHeight + 'px';
        
        // 初始化时就绘制图表
        this.render();
    }
    
    render() {
        if (this.type === 'line') {
            this.drawLineChart();
        }
    }

    // 折线图
    drawLineChart() {
        const { labels, datasets } = this.data;
        if (!labels || !datasets || !datasets[0]) return;

        const dataset = datasets[0];
        const data = dataset.data;
        const padding = 60;
        const chartWidth = this.canvas.offsetWidth - padding * 2;
        const chartHeight = this.canvas.offsetHeight - padding * 2;

        this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);

        // 绘制网格
        this.drawGrid(padding, chartWidth, chartHeight);

        // 绘制坐标轴
        this.drawAxes(padding, chartWidth, chartHeight, labels, data);

        // 绘制折线
        this.drawLine(padding, chartWidth, chartHeight, data, dataset.borderColor || '#3498db');

        // 绘制填充区域
        if (dataset.fill) {
            this.drawFill(padding, chartWidth, chartHeight, data, dataset.backgroundColor || 'rgba(52, 152, 219, 0.1)');
        }

        // 绘制数据点
        this.drawPoints(padding, chartWidth, chartHeight, data, dataset.borderColor || '#3498db');
    }

    drawGrid(padding, width, height) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // 垂直网格线
        for (let i = 0; i <= 10; i++) {
            const x = padding + (width / 10) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, padding + height);
            this.ctx.stroke();
        }

        // 水平网格线
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(padding + width, y);
            this.ctx.stroke();
        }
    }

    drawAxes(padding, width, height, labels, data) {
        this.ctx.strokeStyle = '#bdc3c7';
        this.ctx.lineWidth = 2;

        // X轴
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding + height);
        this.ctx.lineTo(padding + width, padding + height);
        this.ctx.stroke();

        // Y轴
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, padding + height);
        this.ctx.stroke();

        // X轴标签
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.font = '12px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const x = padding + (width / (labels.length - 1)) * index;
            this.ctx.fillText(label, x, padding + height + 20);
        });

        // Y轴标签
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue;
        this.ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (range / 5) * (5 - i);
            const y = padding + (height / 5) * i;
            this.ctx.fillText(this.formatValue(value), padding - 10, y + 4);
        }
    }

    drawLine(padding, width, height, data, color) {
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - minValue) / range) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
    }

    drawFill(padding, width, height, data, color) {
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;

        this.ctx.fillStyle = color;
        this.ctx.beginPath();

        // 起始点
        const startX = padding;
        const startY = padding + height;
        this.ctx.moveTo(startX, startY);

        // 绘制数据线
        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - minValue) / range) * height;
            this.ctx.lineTo(x, y);
        });

        // 回到底部
        const endX = padding + width;
        const endY = padding + height;
        this.ctx.lineTo(endX, endY);
        this.ctx.lineTo(startX, startY);
        
        this.ctx.fill();
    }

    drawPoints(padding, width, height, data, color) {
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;

        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - minValue) / range) * height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    formatValue(value) {
        if (value >= 10000) {
            return (value / 10000).toFixed(2) + '万';
        }
        return value.toFixed(2);
    }

    update() {
        this.drawLineChart();
    }
}

// Chart.js兼容类
class Chart {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        this.type = config.type;
        this.data = config.data;
        this.options = config.options || {};
        
        if (this.type === 'line') {
            this.chart = new SimpleChart(canvas, config);
        } else if (this.type === 'pie') {
            this.chart = new SimplePieChart(canvas, config);
        } else if (this.type === 'bar') {
            this.chart = new SimpleBarChart(canvas, config);
        }
    }
    
    update() {
        if (this.chart && this.chart.update) {
            this.chart.update();
        }
    }
    
    destroy() {
        // 清理资源
        if (this.chart && this.chart.ctx) {
            this.chart.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// 饼图类
class SimplePieChart {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.data = config.data || [];
        this.options = config.options || {};
        this.width = canvas.width = canvas.offsetWidth * 2;
        this.height = canvas.height = canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);
        this.canvas.style.width = canvas.offsetWidth + 'px';
        this.canvas.style.height = canvas.offsetHeight + 'px';
        this.colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#34495e'];
        
        // 如果有数据就立即绘制
        if (this.data && this.data.length > 0) {
            this.draw();
        }
    }

    draw() {
        const centerX = this.canvas.offsetWidth / 2;
        const centerY = this.canvas.offsetHeight / 2;
        const radius = Math.max(Math.min(centerX, centerY) - 40, 50);
        const innerRadius = Math.max(radius * 0.6, 30);

        this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);

        const total = this.data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;

        // 绘制饼图扇形
        this.data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const color = this.colors[index % this.colors.length];

            // 绘制扇形
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = color;
            this.ctx.fill();

            // 计算标签位置（扇形中心角度）
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelRadius = (radius + innerRadius) / 2;
            const labelX = centerX + Math.cos(labelAngle) * labelRadius;
            const labelY = centerY + Math.sin(labelAngle) * labelRadius;

            // 计算百分比
            const percentage = ((item.value / total) * 100).toFixed(1);
            
            // 绘制百分比和数值标签
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Microsoft YaHei';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // 只在扇形足够大时显示标签（避免重叠）
            if (sliceAngle > 0.2) {
                this.ctx.fillText(`${percentage}%`, labelX, labelY - 8);
                this.ctx.font = '10px Microsoft YaHei';
                this.ctx.fillText(`${item.value.toFixed(1)}万元`, labelX, labelY + 6);
            }

            currentAngle += sliceAngle;
        });

        // 绘制内圆（环形图效果）
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fill();

        // 绘制图例
        this.drawLegend();
    }

    drawLegend() {
        const legendX = 20;
        let legendY = 30;
        const legendItemHeight = 25;

        this.ctx.font = '14px Microsoft YaHei';
        this.ctx.textAlign = 'left';

        this.data.forEach((item, index) => {
            const color = this.colors[index % this.colors.length];
            
            // 绘制颜色块
            this.ctx.fillStyle = color;
            this.ctx.fillRect(legendX, legendY - 8, 12, 12);
            
            // 绘制文本
            this.ctx.fillStyle = '#bdc3c7';
            this.ctx.fillText(`${item.name}: ${item.value}%`, legendX + 20, legendY + 2);
            
            legendY += legendItemHeight;
        });
    }

    setOption(options) {
        if (options.series && options.series[0] && options.series[0].data) {
            this.data = options.series[0].data;
            this.draw();
        }
    }
}

// 柱状图类
class SimpleBarChart {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.data = config.data || {};
        this.options = config.options || {};
        this.width = canvas.width = canvas.offsetWidth * 2;
        this.height = canvas.height = canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);
        this.canvas.style.width = canvas.offsetWidth + 'px';
        this.canvas.style.height = canvas.offsetHeight + 'px';
        this.colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
        
        // 如果有数据就立即绘制
        if (this.data && Object.keys(this.data).length > 0) {
            this.draw();
        }
    }

    setOption(options) {
        this.options = options;
        this.draw();
    }

    draw() {
        // 支持Chart.js格式的数据
        let data, categories;
        if (this.data && this.data.datasets && this.data.datasets[0]) {
            data = this.data.datasets[0].data;
            categories = this.data.labels;
        } else if (this.options && this.options.series && this.options.series[0] && this.options.yAxis) {
            data = this.options.series[0].data;
            categories = this.options.yAxis.data;
        } else {
            return;
        }
        
        if (!data || !categories) return;
        const padding = 60;
        const chartWidth = this.canvas.offsetWidth - padding * 2;
        const chartHeight = this.canvas.offsetHeight - padding * 2;
        const barHeight = chartHeight / categories.length * 0.6;
        const barSpacing = chartHeight / categories.length;

        this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);

        const maxValue = Math.max(...data.map(item => typeof item === 'object' ? item.value : item));

        // 绘制网格
        this.drawGrid(padding, chartWidth, chartHeight, maxValue);

        // 绘制柱状图
        data.forEach((item, index) => {
            const value = typeof item === 'object' ? item.value : item;
            const barWidth = (value / maxValue) * chartWidth;
            const y = padding + barSpacing * index + (barSpacing - barHeight) / 2;
            const color = this.colors[index % this.colors.length];

            // 绘制渐变柱子
            const gradient = this.ctx.createLinearGradient(padding, 0, padding + barWidth, 0);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.adjustBrightness(color, -20));

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(padding, y, barWidth, barHeight);

            // 绘制数值标签
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Microsoft YaHei';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(value.toLocaleString(), padding + barWidth + 5, y + barHeight / 2 + 4);
        });

        // 绘制Y轴标签
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.textAlign = 'right';
        categories.forEach((category, index) => {
            const y = padding + barSpacing * index + barSpacing / 2;
            this.ctx.fillText(category, padding - 10, y + 4);
        });
    }

    drawGrid(padding, width, height, maxValue) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // 垂直网格线
        for (let i = 0; i <= 5; i++) {
            const x = padding + (width / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, padding + height);
            this.ctx.stroke();
        }

        // X轴标签
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.font = '12px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const value = (maxValue / 5) * i;
            const x = padding + (width / 5) * i;
            this.ctx.fillText(Math.round(value).toLocaleString(), x, padding + height + 20);
        }
    }

    adjustBrightness(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;
        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;
        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }
}

// 模拟Chart.js的Chart类
window.Chart = SimpleChart;

// 模拟echarts对象
window.echarts = {
    init: function(dom) {
        if (dom.id === 'userDistributionChart') {
            return new SimplePieChart(dom);
        } else if (dom.id === 'productRankingChart') {
            return new SimpleBarChart(dom);
        }
        return new SimplePieChart(dom);
    }
};