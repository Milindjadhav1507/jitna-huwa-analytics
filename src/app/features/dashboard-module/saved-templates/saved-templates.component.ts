import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';

type DataItem = (number | string)[];

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DashboardTemplate {
  id: string;
  name: string;
  layout: any;
  createdAt: Date;
}

@Component({
  selector: 'app-saved-templates',
  templateUrl: './saved-templates.component.html',
  styleUrls: ['./saved-templates.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SavedTemplatesComponent implements OnInit, AfterViewInit {
  templates: DashboardTemplate[] = [];
  showShareModal = false;
  currentShareUrl = '';
  copied = false;
  private chartInstances: Map<string, echarts.ECharts> = new Map();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  ngAfterViewInit() {
    setTimeout(() => this.renderAllPreviews(), 300);
  }

  private getOptionFromChartConfig(chartConfig: any): any {
    const data = chartConfig.data || [];
    const xAxisKey = chartConfig.xAxis;
    const yAxes = chartConfig.yAxes || [];
    const customColors = chartConfig.customColors || {};

    // If it's a candlestick chart
    if (chartConfig.type?.toLowerCase() === 'candlestick') {
      const upColor = '#ec0000';
      const upBorderColor = '#8A0000';
      const downColor = '#00da3c';
      const downBorderColor = '#008F28';

      return {
        dataset: {
          source: data.map((item: any) => [
            item.date,
            item.open,
            item.high,
            item.low,
            item.close,
            item.volume,
            item.close > item.open ? 1 : -1
          ])
        },
        title: {
          text: chartConfig.title || 'Candlestick Chart',
          left: 'center',
          top: 0,
          textStyle: { fontSize: 20, fontWeight: 'bold', color: '#3d3185' }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'line'
          }
        },
        toolbox: {
          feature: {
            dataZoom: {
              yAxisIndex: false
            }
          }
        },
        grid: [
          {
            left: '10%',
            right: '10%',
            bottom: 200
          },
          {
            left: '10%',
            right: '10%',
            height: 80,
            bottom: 80
          }
        ],
        xAxis: [
          {
            type: 'category',
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            min: 'dataMin',
            max: 'dataMax'
          },
          {
            type: 'category',
            gridIndex: 1,
            boundaryGap: false,
            axisLine: { onZero: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            min: 'dataMin',
            max: 'dataMax'
          }
        ],
        yAxis: [
          {
            scale: true,
            splitArea: {
              show: true
            }
          },
          {
            scale: true,
            gridIndex: 1,
            splitNumber: 2,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false }
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0, 1],
            start: 10,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0, 1],
            type: 'slider',
            bottom: 10,
            start: 10,
            end: 100
          }
        ],
        visualMap: {
          show: false,
          seriesIndex: 1,
          dimension: 6,
          pieces: [
            {
              value: 1,
              color: upColor
            },
            {
              value: -1,
              color: downColor
            }
          ]
        },
        series: [
          {
            type: 'candlestick',
            itemStyle: {
              color: upColor,
              color0: downColor,
              borderColor: upBorderColor,
              borderColor0: downBorderColor
            },
            encode: {
              x: 0,
              y: [1, 4, 3, 2]
            }
          },
          {
            name: 'Volume',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            itemStyle: {
              color: '#7fbe9e'
            },
            large: true,
            encode: {
              x: 0,
              y: 5
            }
          }
        ]
      };
    }

    let option: any = {
      title: {
        text: chartConfig.title || 'Custom Chart',
        left: 'center',
        top: 0,
        textStyle: { fontSize: 20, fontWeight: 'bold', color: '#3d3185' }
      },
      tooltip: {},
      legend: { data: yAxes.map((y: any) => y.name), bottom: 0 },
      series: []
    };

    if (chartConfig.type?.toLowerCase().includes('pie') || chartConfig.type?.toLowerCase().includes('doughnut')) {
      option.tooltip = { trigger: 'item', formatter: '{b}: {c} ({d}%)' };
      option.series = [{
        type: 'pie',
        radius: chartConfig.type?.toLowerCase() === 'doughnut' ? ['50%', '70%'] : '50%',
        center: ['50%', '50%'],
        data: yAxes.map((y: any) => ({
          value: data.reduce((sum: number, row: any) => sum + Number(row[y.name] || 0), 0),
          name: y.name,
          itemStyle: { color: customColors[y.name] || y.color }
        })),
        label: { show: true, formatter: '{b}\n{d}%' }
      }];
      option.legend.orient = 'vertical';
      option.legend.left = 'left';
    }
    if (chartConfig.type?.toLowerCase() === 'line') {
      option.xAxis = {
        type: 'category',
        data: data.map((row: any) => row[xAxisKey]),
        boundaryGap: false,
        axisLabel: { color: '#2c3e50', fontWeight: 500 },
        axisLine: { lineStyle: { color: '#e0e6ed', width: 2 } },
        splitLine: { show: false }
      };
      option.yAxis = {
        type: 'value',
        axisLabel: { color: '#2c3e50', fontWeight: 500 },
        axisLine: { lineStyle: { color: '#e0e6ed', width: 2 } },
        splitLine: { lineStyle: { color: '#f0f1f5', type: 'dashed' } }
      };
      option.grid = { left: '6%', right: '6%', top: 60, bottom: 50, containLabel: true };
      option.series = yAxes.map((y: any) => ({
        name: y.name,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: 8,
        data: data.map((row: any) => row[y.name]),
        lineStyle: {
          width: 3,
          shadowColor: 'rgba(0,0,0,0.1)',
          shadowBlur: 10,
          shadowOffsetY: 8,
          cap: 'round',
          join: 'round'
        },
        areaStyle: {
          opacity: 0.1,
          color: (window as any).echarts ? new (window as any).echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: customColors[y.name] || y.color },
            { offset: 1, color: 'rgba(255,255,255,0.1)' }
          ]) : undefined
        },
        itemStyle: {
          color: customColors[y.name] || y.color,
          borderWidth: 2,
          borderColor: '#fff'
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0,0,0,0.2)'
          }
        }
      }));
      option.tooltip = {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#3d3185' }
        }
      };
    } else if (chartConfig.type?.toLowerCase() !== 'pie' && chartConfig.type?.toLowerCase() !== 'doughnut') {
      option.xAxis = { type: 'category', data: data.map((row: any) => row[xAxisKey]) };
      option.yAxis = { type: 'value' };
      option.series = yAxes.map((y: any) => ({
        name: y.name,
        type: chartConfig.type?.toLowerCase() || 'bar',
        data: data.map((row: any) => row[y.name]),
        itemStyle: { color: customColors[y.name] || y.color }
      }));
    }
    return option;
  }

  private getCandlestickOption(data: any[]): any {
    // Process the raw data
    const dates = data.map(item => item[0]);
    const values = data.map(item => [+item[1], +item[2], +item[5], +item[6]]);

    return {
      legend: {
        data: ['日K', 'MA5', 'MA10', 'MA20', 'MA30'],
        inactiveColor: '#777'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          animation: false,
          type: 'cross',
          lineStyle: {
            color: '#376df4',
            width: 2,
            opacity: 1
          }
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#8392A5' } }
      },
      yAxis: {
        scale: true,
        axisLine: { lineStyle: { color: '#8392A5' } },
        splitLine: { show: false }
      },
      grid: {
        bottom: 80
      },
      dataZoom: [
        {
          textStyle: {
            color: '#8392A5'
          },
          handleIcon:
            'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
          dataBackground: {
            areaStyle: {
              color: '#8392A5'
            },
            lineStyle: {
              opacity: 0.8,
              color: '#8392A5'
            }
          },
          brushSelect: true
        },
        {
          type: 'inside'
        }
      ],
      series: [
        {
          type: 'candlestick',
          name: 'Day',
          data: values,
          itemStyle: {
            color: '#FD1050',
            color0: '#0CF49B',
            borderColor: '#FD1050',
            borderColor0: '#0CF49B'
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: this.calculateMA(5, values),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: this.calculateMA(10, values),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1
          }
        },
        {
          name: 'MA20',
          type: 'line',
          data: this.calculateMA(20, values),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1
          }
        },
        {
          name: 'MA30',
          type: 'line',
          data: this.calculateMA(30, values),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1
          }
        }
      ]
    };
  }

  private calculateMA(dayCount: number, data: any[]): any[] {
    const result = [];
    for (let i = 0, len = data.length; i < len; i++) {
      if (i < dayCount) {
        result.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < dayCount; j++) {
        sum += +data[i - j][1];
      }
      result.push(sum / dayCount);
    }
    return result;
  }

  processExcelData(excelData: any[]): any[] {
    return excelData.map(row => [
      row[0], // date
      +row[1], // open
      +row[2], // high
      +row[3], // low
      +row[4], // close
      +row[5], // volume
      +row[6]  // other value
    ]);
  }

  renderAllPreviews() {
    this.templates.forEach(template => {
      if (template.layout?.charts) {
        template.layout.charts.forEach((chart: any) => {
          const chartDom = document.getElementById(chart.id);
          if (chartDom) {
            // Dispose old chart instance if exists
            if (this.chartInstances.has(chart.id)) {
              this.chartInstances.get(chart.id)?.dispose();
              this.chartInstances.delete(chart.id);
            }

            // Initialize new chart instance
            const chartInstance = echarts.init(chartDom, null, {
              height: 140,
              renderer: 'canvas',
              useDirtyRect: true
            });

            // Get the complete chart configuration
            const chartConfig = chart.chartConfig || chart;

            // --- Fallback for candlestick chart with missing/empty or invalid data ---
            if (
              chartConfig &&
              chartConfig.type?.toLowerCase() === 'candlestick' &&
              (!chartConfig.data || chartConfig.data.length === 0 || !['open','high','low','close','volume'].every(k => Object.keys(chartConfig.data[0] || {}).includes(k)))
            ) {
              // Generate 5 rows of fake OHLCV data
              chartConfig.data = Array.from({length: 5}).map((_, idx) => ({
                date: `2023-01-0${idx+1}`,
                open: 100 + idx * 5,
                high: 105 + idx * 5,
                low: 95 + idx * 5,
                close: 102 + idx * 5,
                volume: 1000 + idx * 100
              }));
              chartConfig.xAxis = 'date';
              chartConfig.yAxes = [
                { name: 'open' },
                { name: 'high' },
                { name: 'low' },
                { name: 'close' },
                { name: 'volume' }
              ];
            }
            // --- End fallback ---

            let option: any;

            // Handle different chart types
            if (chartConfig.type?.toLowerCase() === 'candlestick' || chartConfig.type?.toLowerCase() === 'candlestick-ma') {
              // Process Excel data for candlestick chart
              const processedData = this.processExcelData(chartConfig.data || []);
              option = this.getCandlestickOption(processedData);
            } else {
              // Handle other chart types
              option = this.getOptionFromChartConfig(chartConfig);
            }

            // Set the option and store the instance
            chartInstance.setOption(option);
            this.chartInstances.set(chart.id, chartInstance);

            // Force a resize after initialization
            setTimeout(() => {
              chartInstance.resize();
            }, 100);
          }
        });
      }
    });
  }

  loadTemplates() {
    const savedTemplates = localStorage.getItem('dashboardTemplates');
    if (savedTemplates) {
      this.templates = JSON.parse(savedTemplates);
    }
  }

  viewTemplate(templateId: string) {
    this.router.navigate(['/dashboard/template', templateId]);
  }

  useTemplate(template: DashboardTemplate) {
    localStorage.setItem('currentDashboardLayout', JSON.stringify({
      ...template.layout,
      isTemplateApplied: true,
      templateId: template.id
    }));
    this.router.navigate(['/dashboard']);
  }

  deleteTemplate(templateId: string) {
    this.templates = this.templates.filter(t => t.id !== templateId);
    localStorage.setItem('dashboardTemplates', JSON.stringify(this.templates));
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  shareTemplate(template: DashboardTemplate) {
    this.currentShareUrl = `${window.location.origin}/dashboard?editTemplate=true&templateId=${template.id}`;
    this.showShareModal = true;
    this.copied = false;
  }

  copyShareLink() {
    navigator.clipboard.writeText(this.currentShareUrl);
    this.copied = true;
  }

  closeShareModal() {
    this.showShareModal = false;
  }

  trackByTemplate(index: number, template: DashboardTemplate): string {
    return template.id;
  }
}
