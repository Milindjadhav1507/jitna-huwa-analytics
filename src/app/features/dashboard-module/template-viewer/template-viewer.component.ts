import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import * as echarts from 'echarts';
import type { EChartsType } from 'echarts';

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
  imports: [CommonModule]
})
export class TemplateViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  template: DashboardTemplate | null = null;
  chartInstances: Map<string, ExtendedEChart> = new Map();
  isEditing: boolean = false;

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
}
