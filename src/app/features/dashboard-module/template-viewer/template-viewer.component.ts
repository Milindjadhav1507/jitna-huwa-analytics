import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import * as echarts from 'echarts';
import type { EChartsType } from 'echarts';
import { FormsModule } from '@angular/forms';

interface DashboardTemplate {
  id: string;
  name: string;
  layout: any;
  createdAt: Date;
}

interface ExtendedEChart extends EChartsType {
  resizeHandler?: () => void;
}

@Component({
  selector: 'app-template-viewer',
  templateUrl: './template-viewer.component.html',
  styleUrls: ['./template-viewer.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TemplateViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  template: DashboardTemplate | null = null;
  chartInstances: Map<string, ExtendedEChart> = new Map();
  isEditing: boolean = false;
  isEditChartModalVisible: boolean = false;
  editingChart: any = null;
  editChartTitle: string = '';
  editChartType: string = '';
  editXAxis: string = '';
  editYAxes: string[] = [];
  editCustomColors: { [key: string]: string } = {};
  private editChartInstance: any = null;
  @ViewChild('editChartPreview') editChartPreviewRef!: ElementRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const templateId = params['id'];
      if (templateId) {
        this.loadTemplate(templateId);
      }
    });
  }

  ngAfterViewInit() {
    // Render charts after view is initialized with a longer delay
    setTimeout(() => {
      if (this.template) {
        this.renderCharts();
      }
    }, 500); // Increased delay to ensure DOM is ready
  }

  loadTemplate(templateId: string) {
    try {
      const savedTemplates = localStorage.getItem('dashboardTemplates');
      if (savedTemplates) {
        const templates: DashboardTemplate[] = JSON.parse(savedTemplates);
        this.template = templates.find(t => t.id === templateId) || null;

        // Initialize charts after template is loaded
        if (this.template) {
          setTimeout(() => {
            this.renderCharts();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  }

  renderCharts() {
    try {
      // Clear existing chart instances
      this.chartInstances.forEach(chart => {
        if (chart && !chart.isDisposed()) {
          chart.dispose();
        }
      });
      this.chartInstances.clear();

      // Render new charts based on template layout
      if (this.template?.layout?.charts) {
        this.template.layout.charts.forEach((chartConfig: any) => {
          try {
            const chartInstance = this.renderChart(chartConfig);
            if (chartInstance) {
              this.chartInstances.set(chartConfig.id, chartInstance);
            }
          } catch (error) {
            console.error('Error rendering chart:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error in renderCharts:', error);
    }
  }

  renderChart(config: any): ExtendedEChart | null {
    try {
      const chartDom = document.getElementById(config.id);
      if (!chartDom) {
        console.error('Chart DOM element not found:', config.id);
        return null;
      }

      // Initialize chart with specific dimensions
      const chart = echarts.init(chartDom, null, {
        width: 'auto',
        height: 300,
        renderer: 'canvas'
      }) as ExtendedEChart;

      // If this chart object has a chartConfig property (from dashboard save), use it
      const savedConfig = config.chartConfig || config;
      // --- Fallback for candlestick chart with missing/empty or invalid data ---
      if (
        savedConfig &&
        savedConfig.type?.toLowerCase() === 'candlestick' &&
        (!savedConfig.data || savedConfig.data.length === 0 || !['open','high','low','close','volume'].every(k => Object.keys(savedConfig.data[0] || {}).includes(k)))
      ) {
        // Generate 5 rows of fake OHLCV data
        savedConfig.data = Array.from({length: 5}).map((_, idx) => ({
          date: `2023-01-0${idx+1}`,
          open: 100 + idx * 5,
          high: 105 + idx * 5,
          low: 95 + idx * 5,
          close: 102 + idx * 5,
          volume: 1000 + idx * 100
        }));
        savedConfig.xAxis = 'date';
        savedConfig.yAxes = [
          { name: 'open' },
          { name: 'high' },
          { name: 'low' },
          { name: 'close' },
          { name: 'volume' }
        ];
      }
      // --- End fallback ---
      if (savedConfig && savedConfig.data && savedConfig.xAxis && savedConfig.yAxes && savedConfig.data.length > 0) {
        const option = this.getOptionFromChartConfig(savedConfig);
        chart.setOption(option);
        return chart;
      }

      // If the chart has saved options, use them
      if (config.option) {
        chart.setOption(config.option);
        return chart;
      }

      // If chart config has data, generate option from config
      if (config.data && config.xAxis && config.yAxes && config.data.length > 0) {
        const option = this.getOptionFromChartConfig(config);
        chart.setOption(option);
        return chart;
      }

      // Fallback: If chart type is 'area', show a sample area chart
      if ((config.type && config.type.toLowerCase() === 'area') || (savedConfig.type && savedConfig.type.toLowerCase() === 'area')) {
        chart.setOption({
          title: { text: 'Sample Area Chart', left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E', 'F'] },
          yAxis: { type: 'value' },
          series: [{
            data: [120, 200, 150, 80, 70, 110],
            type: 'line',
            areaStyle: { opacity: 0.3 },
            smooth: true,
            itemStyle: { color: '#3d3185' }
          }]
        });
        return chart;
      }

      // Otherwise use default options based on chart type
      let option: any = this.getChartOptions(config.type);
      if (option) {
        chart.setOption(option);
        // Add resize handler
        const resizeHandler = () => {
          chart.resize();
        };
        window.addEventListener('resize', resizeHandler);
        chart.resizeHandler = resizeHandler;
      }
      return chart;
    } catch (error) {
      console.error('Error in renderChart:', error);
      return null;
    }
  }

  private getChartOptions(chartType: string): any {
    const textStyle = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#2c3e50'
    };

    switch (chartType) {
      case "Pie Chart":
        return {
          title: {
            text: 'Revenue Distribution',
            left: 'center',
            top: 0,
            textStyle: {
              ...textStyle,
              fontSize: 16,
              fontWeight: 500
            }
          },
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'horizontal',
            bottom: 0,
            textStyle: textStyle
          },
          series: [{
            name: 'Revenue',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            data: [
              { value: 1048, name: 'Product A' },
              { value: 735, name: 'Product B' },
              { value: 580, name: 'Product C' },
              { value: 484, name: 'Product D' }
            ]
          }]
        };

      case "Line Chart":
        return {
          title: {
            text: 'Monthly Performance',
            left: 'center',
            top: 0,
            textStyle: {
              ...textStyle,
              fontSize: 16,
              fontWeight: 500
            }
          },
          tooltip: {
            trigger: 'axis'
          },
          legend: {
            data: ['Sales', 'Revenue'],
            bottom: 0,
            textStyle: textStyle
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            axisLabel: textStyle
          },
          yAxis: {
            type: 'value',
            axisLabel: textStyle
          },
          series: [
            {
              name: 'Sales',
              type: 'line',
              smooth: true,
              data: [140, 232, 101, 264, 90, 340],
              areaStyle: {
                opacity: 0.3
              },
              itemStyle: {
                color: '#3498db'
              }
            },
            {
              name: 'Revenue',
              type: 'line',
              smooth: true,
              data: [120, 282, 111, 234, 220, 340],
              areaStyle: {
                opacity: 0.3
              },
              itemStyle: {
                color: '#2ecc71'
              }
            }
          ]
        };

      case "Bar Chart":
        return {
          title: {
            text: 'Weekly Analytics',
            left: 'center',
            top: 0,
            textStyle: {
              ...textStyle,
              fontSize: 16,
              fontWeight: 500
            }
          },
          tooltip: {
            trigger: 'axis'
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            axisLabel: textStyle
          },
          yAxis: {
            type: 'value',
            axisLabel: textStyle
          },
          series: [{
            data: [120, 200, 150, 80, 70, 110, 130],
            type: 'bar',
            showBackground: true,
            backgroundStyle: {
              color: 'rgba(180, 180, 180, 0.2)'
            },
            itemStyle: {
              color: '#3498db',
              borderRadius: [4, 4, 0, 0]
            }
          }]
        };

      default:
        // Always show a sample line chart as fallback
        return {
          title: {
            text: 'Sample Chart',
            left: 'center',
            top: 0,
            textStyle: {
              ...textStyle,
              fontSize: 16,
              fontWeight: 500
            }
          },
          tooltip: { trigger: 'axis' },
          legend: { data: ['Demo'], bottom: 0, textStyle },
          grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            axisLabel: textStyle
          },
          yAxis: { type: 'value', axisLabel: textStyle },
          series: [
            {
              name: 'Demo',
              type: 'line',
              smooth: true,
              data: [120, 200, 150, 80, 70, 110],
              areaStyle: { opacity: 0.3 },
              itemStyle: { color: '#3d3185' }
            }
          ]
        };
    }
  }

  private getOptionFromChartConfig(chartConfig: any): any {
    const data = chartConfig.data || [];
    const xAxisKey = chartConfig.xAxis;
    const yAxes = chartConfig.yAxes || [];
    const customColors = chartConfig.customColors || {};

    // --- CANDLESTICK SUPPORT ---
    if (chartConfig.type?.toLowerCase() === 'candlestick') {
      // Debug logging for candlestick
      console.log('Candlestick TemplateViewer Config:', chartConfig);
      console.log('Candlestick Data:', data);
      // Prepare OHLC data: expects data to have open, high, low, close, volume, and xAxis (date/time)
      const ohlcData = (data || []).map((row: any) => [
        row[xAxisKey] || row.date, // Date or X value
        Number(row.open),
        Number(row.high),
        Number(row.low),
        Number(row.close),
        Number(row.volume)
      ]);
      // Convert date to timestamp for ECharts 'time' axis
      const ohlcDataWithTimestamps = ohlcData.map((item: any) => [
        new Date(item[0]).getTime(), ...item.slice(1)
      ]);
      const option = {
        backgroundColor: '#fff',
        title: {
          text: chartConfig.title || 'Candlestick Chart',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#3d3185'
          }
        },
        legend: { show: false },
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
            type: 'time',
            boundaryGap: [0, 0],
            axisLine: { lineStyle: { color: '#8392A5' } },
            axisLabel: {
              rotate: 0,
              hideOverlap: true,
              color: '#666',
              fontSize: 12,
              formatter: (value: number) => {
                const d = new Date(value);
                return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
              },
            },
            minInterval: 24 * 3600 * 1000, // 1 day
            splitNumber: 10,
            axisPointer: { label: { show: true } },
          },
          {
            type: 'time',
            boundaryGap: [0, 0],
            gridIndex: 1,
            axisLine: { lineStyle: { color: '#8392A5' } },
            axisLabel: { show: false }
          }
        ],
        yAxis: [
          {
            scale: true,
            axisLine: { lineStyle: { color: '#8392A5' } },
            splitLine: { show: false }
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
            start: 0,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0, 1],
            type: 'slider',
            bottom: 10,
            start: 0,
            end: 100,
            textStyle: {
              color: '#8392A5'
            },
            handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
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
          }
        ],
        series: [
          {
            name: 'Candlestick',
            type: 'candlestick',
            data: ohlcDataWithTimestamps.map((item: any) => [item[0], item[1], item[2], item[3], item[4]]), // [timestamp, open, close, low, high]
            itemStyle: {
              color: '#FD1050',      // Red for up
              color0: '#0CF49B',     // Green for down
              borderColor: '#FD1050',
              borderColor0: '#0CF49B'
            }
          },
          {
            name: 'Volume',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: ohlcDataWithTimestamps.map((item: any) => item[5]),
            itemStyle: {
              color: '#7fbe9e'
            }
          }
        ]
      };
      console.log('Candlestick ECharts Option:', option);
      return option;
    }
    // --- END CANDLESTICK SUPPORT ---

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

  editTemplate() {
    if (this.template) {
      localStorage.setItem('currentDashboardLayout', JSON.stringify(this.template.layout));
      localStorage.setItem('editingTemplateId', this.template.id);
      this.router.navigate(['/dashboard'], {
        queryParams: {
          editTemplate: true,
          templateId: this.template.id
        }
      });
    }
  }

  useTemplate() {
    if (this.template) {
      localStorage.setItem('currentDashboardLayout', JSON.stringify(this.template.layout));
      this.router.navigate(['/dashboard']);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/saved-templates']);
  }

  getTableHeaders(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high':
        return 'bi-exclamation-circle-fill';
      case 'medium':
        return 'bi-info-circle-fill';
      case 'low':
        return 'bi-check-circle-fill';
      default:
        return 'bi-dot';
    }
  }

  ngOnDestroy() {
    // Cleanup chart instances and event listeners
    this.chartInstances.forEach(chart => {
      if (chart) {
        // Remove resize listener if it exists
        if (chart.resizeHandler) {
          window.removeEventListener('resize', chart.resizeHandler);
        }
        // Dispose of chart
        if (!chart.isDisposed()) {
          chart.dispose();
        }
      }
    });
    this.chartInstances.clear();
  }

  openEditChartModal(chart: any) {
    this.editingChart = { ...chart, headers: Object.keys(chart.data?.[0] || {}) };
    this.editChartTitle = chart.title || chart.type || '';
    this.editChartType = chart.type || '';
    this.editXAxis = chart.xAxis || this.editingChart.headers[0] || '';
    if (chart.type === 'candlestick') {
      // Always use all OHLCV fields if present
      this.editYAxes = ['open', 'high', 'low', 'close', 'volume'].filter(f => this.editingChart.headers.includes(f));
      this.editingChart.headers = [this.editXAxis, ...this.editYAxes];
    } else {
      this.editYAxes = chart.yAxes ? chart.yAxes.map((y: any) => y.name) : [];
    }
    this.editCustomColors = { ...chart.customColors };
    this.isEditChartModalVisible = true;
    setTimeout(() => this.updateEditChartPreview(), 100);
  }

  closeEditChartModal() {
    this.isEditChartModalVisible = false;
    this.editingChart = null;
    this.editChartTitle = '';
    this.editChartType = '';
    this.editXAxis = '';
    this.editYAxes = [];
    this.editCustomColors = {};
    if (this.editChartInstance) {
      this.editChartInstance.dispose();
      this.editChartInstance = null;
    }
  }

  toggleEditYAxis(y: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.editYAxes.includes(y)) {
        this.editYAxes = [...this.editYAxes, y];
      }
    } else {
      this.editYAxes = this.editYAxes.filter(h => h !== y);
    }
  }

  updateEditSeriesColor(y: string, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.editCustomColors[y] = color;
  }

  updateEditChartPreview() {
    if (!this.editChartPreviewRef) return;
    const chartDom = this.editChartPreviewRef.nativeElement;
    if (!chartDom) return;
    if (this.editChartInstance) {
      this.editChartInstance.dispose();
      this.editChartInstance = null;
    }
    const data = this.editingChart?.data || [];
    const xAxis = this.editXAxis;
    const yAxes = this.editYAxes.map(name => ({ name, color: this.editCustomColors[name] || '#3d3185' }));
    const config = {
      ...this.editingChart,
      title: this.editChartTitle,
      type: this.editChartType,
      xAxis,
      yAxes,
      customColors: { ...this.editCustomColors },
      data
    };
    this.editChartInstance = echarts.init(chartDom, null, { renderer: 'canvas', useDirtyRect: true });
    const option = this.getOptionFromChartConfig(config);
    if (option) {
      this.editChartInstance.setOption(option, true);
      setTimeout(() => this.editChartInstance.resize(), 100);
    }
  }

  saveEditedChart() {
    if (!this.editChartTitle || !this.editChartType || !this.editXAxis || this.editYAxes.length === 0) {
      return;
    }
    // Update chart config in template
    if (this.template && this.editingChart) {
      const charts = this.template.layout?.charts || [];
      const idx = charts.findIndex((c: any) => c.id === this.editingChart.id);
      if (idx !== -1) {
        charts[idx] = {
          ...charts[idx],
          title: this.editChartTitle,
          type: this.editChartType,
          xAxis: this.editXAxis,
          yAxes: this.editYAxes.map(name => ({ name, color: this.editCustomColors[name] || '#3d3185' })),
          customColors: { ...this.editCustomColors },
          data: this.editingChart.data
        };
        // Save back to localStorage
        const savedTemplates = localStorage.getItem('dashboardTemplates');
        if (savedTemplates) {
          const templates: DashboardTemplate[] = JSON.parse(savedTemplates);
          const tIdx = templates.findIndex(t => t.id === this.template!.id);
          if (tIdx !== -1) {
            templates[tIdx].layout.charts = charts;
            localStorage.setItem('dashboardTemplates', JSON.stringify(templates));
          }
        }
        // Re-render charts
        setTimeout(() => this.renderCharts(), 200);
      }
    }
    this.closeEditChartModal();
  }

  getChartIcon(chartType: string): string {
    switch ((chartType || '').toLowerCase()) {
      case 'bar': return 'fas fa-chart-bar';
      case 'line': return 'fas fa-chart-line';
      case 'pie': return 'fas fa-chart-pie';
      case 'doughnut': return 'fas fa-circle-notch';
      case 'area': return 'fas fa-chart-area';
      case 'scatter': return 'fas fa-braille';
      case 'candlestick': return 'fas fa-chart-line';
      default: return 'fas fa-chart-bar';
    }
  }
}
