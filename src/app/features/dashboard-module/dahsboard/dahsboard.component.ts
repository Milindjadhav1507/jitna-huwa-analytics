import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as echarts from 'echarts';
import type { EChartsType, EChartsOption, XAXisComponentOption } from 'echarts';
import interact from 'interactjs';
import * as AOS from 'aos';
import { Router, ActivatedRoute } from '@angular/router';
import moment from 'moment';
import { ToastrService } from 'ngx-toastr';

interface ExtendedEChart extends EChartsType {
  resizeObserver?: ResizeObserver;
}

interface DashboardTemplate {
  id: string;
  name: string;
  layout: any;
  createdAt: Date;
}

@Component({
  selector: 'app-dahsboard',
  templateUrl: './dahsboard.component.html',
  styleUrls: ['./dahsboard.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class DahsboardComponent implements AfterViewInit, OnDestroy, OnInit {
  charts: any[] = [];
  widgets: any[] = [];
  tables: any[] = [];
  dataLists: any[] = [];
  chartCount = 0;
  widgetCount = 0;
  tableCount = 0;
  dataListCount = 0;
  private resizeTimeout: any;
  private chartInstances: Map<string, ExtendedEChart> = new Map();
  private minDashboardHeight = 820; // Minimum dashboard height
  private extraSpace = 300; // Extra space to add below last element
  private isEditingTemplate = false;
  private editingTemplateId: string | null = null;
  chartTemplates: any[] = [];
  searchChartTerm: string = '';

  // Edit Chart Modal State
  isEditChartModalVisible: boolean = false;
  editingChart: any = null;
  editChartTitle: string = '';
  editChartType: string = '';
  editXAxis: string = '';
  editYAxes: string[] = [];
  editCustomColors: { [key: string]: string } = {};

  @ViewChild('editChartPreview') editChartPreviewRef!: ElementRef;
  private editChartInstance: any = null;

  // Add widget templates with numerical data and unique keys
  widgetTemplates = [
    {
      id: 'widget-1',
      key: 'sales',
      title: 'Daily Sales',
      type: 'widget',
      icon: 'fa-chart-line',
      content: {
        value: '₹85,432',
        trend: '+12.5%',
        trendDirection: 'up',
        icon: 'fa-chart-line',
        title: 'Today\'s Revenue',
        details: [
          { status: 'Online Sales', count: 423 },
          { status: 'Store Sales', count: 156 },
          { status: 'Returns', count: 28 }
        ]
      }
    },
    {
      id: 'widget-2',
      key: 'products',
      title: 'Product Metrics',
      type: 'widget',
      icon: 'fa-boxes',
      content: {
        value: '1,234',
        trend: '+8.3%',
        trendDirection: 'up',
        icon: 'fa-boxes',
        title: 'Total Products',
        details: [
          { category: 'Electronics', count: 456 },
          { category: 'Clothing', count: 378 },
          { category: 'Accessories', count: 400 }
        ]
      }
    },
    {
      id: 'widget-3',
      key: 'orders',
      title: 'Order Analytics',
      type: 'widget',
      icon: 'fa-shopping-cart',
      content: {
        value: '789',
        trend: '+15.7%',
        trendDirection: 'up',
        icon: 'fa-shopping-cart',
        title: 'Total Orders',
        details: [
          { priority: 'Delivered', count: 523 },
          { priority: 'In Transit', count: 156 },
          { priority: 'Processing', count: 110 }
        ]
      }
    },
    {
      id: 'widget-4',
      key: 'customers',
      title: 'Customer Analytics',
      type: 'widget',
      icon: 'fa-users',
      content: {
        value: '2,567',
        trend: '+18.2%',
        trendDirection: 'up',
        icon: 'fa-users',
        title: 'Total Customers',
        details: [
          { category: 'New', count: 423 },
          { category: 'Active', count: 1845 },
          { category: 'Inactive', count: 299 }
        ]
      }
    },
    {
      id: 'widget-5',
      key: 'tasks',
      title: 'Upcoming Tasks',
      type: 'widget',
      icon: 'fa-solid fa-list-check',
      content: {
        value: '5',
        trend: '+2 New',
        trendDirection: 'up',
        icon: 'fa-solid fa-list-check',
        title: 'Upcoming Tasks',
        tasks: [
          { title: 'Prepare Sales Report', due: 'Today', status: 'In Progress', priority: 'High' },
          { title: 'Team Meeting', due: 'Tomorrow', status: 'Scheduled', priority: 'Medium' },
          { title: 'Update Inventory', due: 'In 2 days', status: 'Pending', priority: 'Low' },
          { title: 'Client Follow-up', due: 'In 3 days', status: 'Pending', priority: 'High' },
          { title: 'Review Feedback', due: 'In 5 days', status: 'Scheduled', priority: 'Medium' }
        ]
      }
    }
  ];

  constructor(private router: Router, private route: ActivatedRoute, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadChartTemplates();
    AOS.init();

    // Only load template for editing, otherwise do NOT load dashboard charts
    this.route.queryParams.subscribe(params => {
      if (params['editTemplate'] && params['templateId']) {
        this.isEditingTemplate = true;
        this.editingTemplateId = params['templateId'];
        this.loadTemplateForEditing(params['templateId']);
      } else {
        // Do NOT auto-load dashboard charts
        this.charts = [];
        this.widgets = [];
        this.tables = [];
        this.dataLists = [];
      }
    });
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  drag(event: DragEvent, type: string) {
    event.dataTransfer?.setData('text/plain', type);
  }

  dropOnDashboard(event: DragEvent) {
    event.preventDefault();
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    const rect = dashboard.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    try {
      const data = event.dataTransfer?.getData('chart');
      if (data) {
        const chartConfig = JSON.parse(data);
        this.addCustomChart(chartConfig, x, y);
        return;
      }

      const widgetKey = event.dataTransfer?.getData('widgetKey');
      if (widgetKey) {
        this.addWidget(widgetKey, x, y);
        return;
      }

      const type = event.dataTransfer?.getData('type');
      if (type) {
        switch (type) {
          case 'chart':
            this.addChart('line', x, y);
            break;
          case 'widget':
            this.addWidget('default', x, y);
            break;
          case 'table':
            this.addTable('default', x, y);
            break;
          case 'list':
            this.addDataList('default', x, y);
            break;
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }

  removeChart(chart: any) {
    const chartInstance = this.chartInstances.get(chart.id);
    if (chartInstance) {
      chartInstance.dispose();
      this.chartInstances.delete(chart.id);
    }
    this.charts = this.charts.filter(c => c.id !== chart.id);
  }

  renderChart(id: string, type: string, chartConfig?: any): ExtendedEChart | null {
    const chartDom = document.getElementById(id);
    if (!chartDom) return null;

    const chart = echarts.init(chartDom, null, {
      renderer: 'canvas',
      useDirtyRect: true,
      width: 'auto',
      height: 'auto'
    }) as ExtendedEChart;

    // Add resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    });
    resizeObserver.observe(chartDom);

    let option: any;
    const textStyle = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#2c3e50'
    };

    // If chartConfig is provided, use it to build the option
    if (chartConfig) {
      // Ensure we have the complete configuration
      const completeConfig = {
        ...chartConfig,
        data: chartConfig.data || [],
        type: type || chartConfig.type,
        title: chartConfig.title || 'Chart',
        xAxis: chartConfig.xAxis,
        yAxes: chartConfig.yAxes,
        fullState: chartConfig.fullState || chartConfig
      };
      option = this.getOptionFromChartConfig(completeConfig);
    } else {
      // No sample data for default templates
      option = {
        title: {
          text: 'No Data',
          left: 'center',
          top: 'center',
          textStyle: {
            ...textStyle,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#3d3185'
          }
        }
      };
    }

    if (option) {
      // Set the option and force a resize
      chart.setOption(option, true);
      setTimeout(() => {
        chart.resize();
      }, 100);
    }

    // Store resize observer for cleanup
    chart.resizeObserver = resizeObserver;

    return chart;
  }

  private debounceResize(chartElement: HTMLElement, chart: any) {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    }, 100);
  }

  ngAfterViewInit() {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100
    });
    this.initializeInteract();
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    // If edit modal is open, render preview
    if (this.isEditChartModalVisible) {
      setTimeout(() => this.updateEditChartPreview(), 100);
    }
  }

  ngOnDestroy() {
    // Cleanup
    window.removeEventListener('resize', this.handleWindowResize.bind(this));
    this.chartInstances.forEach(chart => {
      if (chart && !chart.isDisposed()) {
        if (chart.resizeObserver) {
          chart.resizeObserver.disconnect();
        }
        chart.dispose();
      }
    });
    this.chartInstances.clear();
  }

  private handleWindowResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.chartInstances.forEach(chart => {
        if (chart && !chart.isDisposed()) {
          chart.resize();
        }
      });
    }, 100);
  }

  private adjustDashboardHeight() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    // Get all draggable elements
    const elements = dashboard.querySelectorAll('.chart-card, .widget-card, .table-card, .list-card');
    let maxBottom = 0;

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const elementBottom = rect.top + rect.height + dashboard.scrollTop - dashboard.getBoundingClientRect().top;
      maxBottom = Math.max(maxBottom, elementBottom);
    });

    // Add extra space below the last element (at least viewport height)
    const minHeight = window.innerHeight - 120; // Account for header/padding
    const newHeight = Math.max(minHeight, maxBottom + window.innerHeight * 0.3);

    requestAnimationFrame(() => {
      dashboard.style.minHeight = `${newHeight}px`;

      // If we're adding a new element near the bottom, scroll to show it
      if (maxBottom > dashboard.scrollTop + dashboard.clientHeight - 100) {
        dashboard.scrollTo({
          top: maxBottom - dashboard.clientHeight + 200,
          behavior: 'smooth'
        });
      }
    });
  }

  initializeInteract() {
    const draggableElements = ['.chart-card', '.widget-card', '.table-card', '.list-card'];

    draggableElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (!element.hasAttribute('data-interact-initialized')) {
          interact(element as HTMLElement)
            .draggable({
              inertia: false, // Disable inertia for immediate response
              autoScroll: false, // Disable auto-scroll for better performance
              modifiers: [
                interact.modifiers.restrictRect({
                  restriction: 'parent',
                  endOnly: true
                })
              ],
              listeners: {
                start: (event: any) => {
                  const target = event.target;
                  target.style.transition = 'none'; // Disable transitions during drag
                },
                move: (event: any) => {
                  const target = event.target;
                  if (target.closest('.delete-btn')) return;

                  const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                  const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                  // Apply transform directly without animation
                  target.style.transform = `translate(${x}px, ${y}px)`;
                  target.setAttribute('data-x', x);
                  target.setAttribute('data-y', y);
                },
                end: (event: any) => {
                  const target = event.target;
                  // Re-enable transitions after drag
                  target.style.transition = 'transform 0.1s ease';
                  this.adjustDashboardHeight();
                }
              }
            })
            .resizable({
              edges: { left: true, right: true, bottom: true, top: true },
              margin: 5,
              listeners: {
                start: (event: any) => {
                  const target = event.target;
                  target.style.transition = 'none'; // Disable transitions during resize
                },
                move: (event: any) => {
                  const target = event.target;
                  let x = (parseFloat(target.getAttribute('data-x')) || 0);
                  let y = (parseFloat(target.getAttribute('data-y')) || 0);

                  // Apply size changes directly without animation
                  Object.assign(target.style, {
                    width: `${event.rect.width}px`,
                    height: `${event.rect.height}px`,
                    transform: `translate(${x}px, ${y}px)`
                  });

                  const chartDiv = target.querySelector('.chart-container');
                  if (chartDiv) {
                    const chartId = chartDiv.id;
                    const chart = this.chartInstances.get(chartId);
                    if (chart) {
                      this.debounceResize(chartDiv, chart);
                    }
                  }
                },
                end: (event: any) => {
                  const target = event.target;
                  // Re-enable transitions after resize
                  target.style.transition = 'transform 0.1s ease, width 0.1s ease, height 0.1s ease';
                  this.adjustDashboardHeight();
                }
              }
            });

          element.setAttribute('data-interact-initialized', 'true');
        }
      });
    });
  }

  private getCurrentLayout() {
    const getElementData = (id: string) => {
      const element = document.getElementById(`card-${id}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const dashboardRect = document.getElementById('dashboard')?.getBoundingClientRect();
        const relativeTop = rect.top - (dashboardRect?.top || 0);
        const relativeLeft = rect.left - (dashboardRect?.left || 0);

        return {
          // Always save these properties for exact restoration
          top: element.style.top,
          left: element.style.left,
          width: element.style.width,
          height: element.style.height,
          transform: element.style.transform,
          position: {
            top: relativeTop,
            left: relativeLeft
          }
        };
      }
      return {};
    };

    const getCompleteChartConfig = (chart: any) => {
      const chartInstance = this.chartInstances.get(chart.id);
      let completeConfig = { ...(chart.chartConfig || {}) };

      if (chartInstance && typeof chartInstance.getOption === 'function') {
        try {
          const option = chartInstance.getOption() as EChartsOption;

          // Extract all series data
          const seriesData = (option['series'] as any[])?.map((s: any) => ({
            name: s.name,
            type: s.type,
            data: s.data,
            itemStyle: s.itemStyle,
            areaStyle: s.areaStyle,
            smooth: s.smooth,
            symbol: s.symbol,
            symbolSize: s.symbolSize
          })) || [];

          // Extract axis configurations
          const xAxisConfig = (option['xAxis'] as any[])?.[0] || {};
          const yAxisConfig = (option['yAxis'] as any[])?.[0] || {};

          // Extract data from series
          let chartData: any[] = [];
          if (seriesData.length > 0 && seriesData[0].data) {
            if (Array.isArray(seriesData[0].data[0])) {
              // For scatter/area charts
              chartData = seriesData[0].data.map((point: any) => ({
                [completeConfig.xAxis]: point[0],
                [completeConfig.yAxes[0].name]: point[1]
              }));
            } else {
              // For bar/line charts
              const xData = (option['xAxis'] as any[])?.[0]?.data || [];
              chartData = xData.map((x: any, i: number) => {
                const row: any = { [completeConfig.xAxis]: x };
                seriesData.forEach((series: any, idx: number) => {
                  row[completeConfig.yAxes[idx]?.name || `value${idx}`] = series.data[i];
                });
                return row;
              });
            }
          }

          completeConfig = {
            ...completeConfig,
            data: chartData.length > 0 ? chartData : completeConfig.data,
            xAxis: completeConfig.xAxis || xAxisConfig.name,
            yAxes: completeConfig.yAxes || seriesData.map((s: any) => ({
              name: s.name,
              color: s.itemStyle?.color || '#3d3185'
            })),
            chartOptions: {
              type: completeConfig.type,
              title: (option['title'] as any)?.text,
              tooltip: option['tooltip'],
              legend: option['legend'],
              grid: option['grid'],
              xAxis: xAxisConfig,
              yAxis: yAxisConfig,
              series: seriesData
            }
          };
        } catch (error) {
          console.error('Error extracting chart configuration:', error);
        }
      }

      return completeConfig;
    };

    return {
      charts: this.charts.map(chart => {
        const elementData = getElementData(chart.id);
        const completeConfig = getCompleteChartConfig(chart);
        return {
          ...chart,
          ...elementData,
          chartConfig: completeConfig,
          lastUpdated: new Date().toISOString()
        };
      }),
      widgets: this.widgets.map(widget => ({
        ...widget,
        ...getElementData(widget.id),
        lastUpdated: new Date().toISOString()
      })),
      tables: this.tables.map(table => ({
        ...table,
        ...getElementData(table.id),
        lastUpdated: new Date().toISOString()
      })),
      dataLists: this.dataLists.map(list => ({
        ...list,
        ...getElementData(list.id),
        lastUpdated: new Date().toISOString()
      }))
    };
  }

  private loadTemplateForEditing(templateId: string) {
    try {
      const savedTemplates = localStorage.getItem('dashboardTemplates');
      if (savedTemplates) {
        const templates: DashboardTemplate[] = JSON.parse(savedTemplates);
        const template = templates.find(t => t.id === templateId);

        if (template && template.layout) {
          // Clear existing items
          this.charts = [];
          this.widgets = [];
          this.tables = [];
          this.dataLists = [];

          // Load template layout with exact positions and configurations
          if (template.layout.charts) {
            this.charts = template.layout.charts.map((chart: any) => {
              let chartConfig = chart.chartConfig || {};
              if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
                chartConfig = {
                  ...chartConfig,
                  data: [
                    { category: 'A', value: 10 },
                    { category: 'B', value: 20 },
                    { category: 'C', value: 15 }
                  ],
                  xAxis: chartConfig.xAxis || 'category',
                  yAxes: chartConfig.yAxes && chartConfig.yAxes.length > 0 ? chartConfig.yAxes : [{ name: 'value', color: '#3d3185' }],
                  type: chart.type || chartConfig.type,
                  title: chart.title || chartConfig.title
                };
              }
              return {
                ...chart,
                // Always restore these properties
                top: chart.top,
                left: chart.left,
                width: chart.width,
                height: chart.height,
                transform: chart.transform,
                chartConfig: chartConfig
              };
            });
          }
          if (template.layout.widgets) {
            this.widgets = template.layout.widgets.map((widget: any) => ({
              ...widget,
              top: widget.top,
              left: widget.left,
              width: widget.width,
              height: widget.height,
              transform: widget.transform
            }));
          }
          if (template.layout.tables) {
            this.tables = template.layout.tables.map((table: any) => ({
              ...table,
              top: table.top,
              left: table.left,
              width: table.width,
              height: table.height,
              transform: table.transform
            }));
          }
          if (template.layout.dataLists) {
            this.dataLists = template.layout.dataLists.map((list: any) => ({
              ...list,
              top: list.top,
              left: list.left,
              width: list.width,
              height: list.height,
              transform: list.transform
            }));
          }
          setTimeout(() => {
            this.charts.forEach(chart => {
              if (chart.chartConfig) {
                const chartContainer = document.getElementById(chart.id);
                if (chartContainer) {
                  chartContainer.innerHTML = '';
                  const chartDiv = document.createElement('div');
                  chartDiv.style.width = '100%';
                  chartDiv.style.height = '100%';
                  chartContainer.appendChild(chartDiv);
                  const chartInstance = this.renderChart(chart.id, chart.type, chart.chartConfig);
                  if (chartInstance) {
                    this.chartInstances.set(chart.id, chartInstance);
                    setTimeout(() => {
                      chartInstance.resize();
                    }, 100);
                  }
                }
              }
            });
            this.initializeInteract();
            this.adjustDashboardHeight();
            this.applySavedPositions();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  }

  loadDashboard() {
    // Load saved charts from localStorage
    const savedCharts = localStorage.getItem('savedChartConfigList');
    if (savedCharts) {
      try {
        const chartList = JSON.parse(savedCharts);
        if (Array.isArray(chartList)) {
          this.charts = [];
          chartList.forEach((chartConfig) => {
            const patchedConfig = chartConfig.fullState
              ? { ...chartConfig, ...chartConfig.fullState, data: chartConfig.data }
              : chartConfig;

            // Fallback: If data is missing or empty, assign sample data
            let fallbackData = [
              { category: 'A', value: 10 },
              { category: 'B', value: 20 },
              { category: 'C', value: 15 }
            ];
            let fallbackXAxis = 'category';
            let fallbackYAxes = [{ name: 'value', color: '#3d3185' }];

            const safeConfig = {
              ...patchedConfig,
              data: (patchedConfig.data && patchedConfig.data.length > 0) ? patchedConfig.data : fallbackData,
              xAxis: patchedConfig.xAxis || fallbackXAxis,
              yAxes: (patchedConfig.yAxes && patchedConfig.yAxes.length > 0) ? patchedConfig.yAxes : fallbackYAxes
            };

            // Always use a simple default position for all loaded charts
            const chart = {
              id: chartConfig.id || `chart-${Date.now()}`,
              type: chartConfig.type,
              title: chartConfig.title,
              top: '40px',
              left: '40px',
              chartConfig: safeConfig
            };
            this.charts.push(chart);
          });
        }
      } catch (error) {
        console.error('Error loading saved charts:', error);
      }
    }

    // Initialize interact.js for draggable functionality
    this.initializeInteract();

    // Render all charts
    setTimeout(() => {
      this.charts.forEach(chart => {
        this.renderChart(chart.id, chart.type, chart.chartConfig);
      });
      this.initializeInteract();
    }, 100);
  }

  resetDashboard() {
    // Clear all dashboard items
    this.charts = [];
    this.widgets = [];
    this.tables = [];
    this.dataLists = [];

    // Reset counters
    this.chartCount = 0;
    this.widgetCount = 0;
    this.tableCount = 0;
    this.dataListCount = 0;

    // Clear chart instances
    this.chartInstances.clear();

    // Clear saved layout from localStorage
    localStorage.removeItem('currentDashboardLayout');

    // Reinitialize dashboard
    this.initializeDashboard();
  }

  private initializeDashboard() {
    // Initialize counters
    this.chartCount = this.charts.length;
    this.widgetCount = this.widgets.length;
    this.tableCount = this.tables.length;
    this.dataListCount = this.dataLists.length;

    // Wait for view to be ready before initializing charts and interactions
    setTimeout(() => {
      // Initialize charts
      this.charts.forEach(chart => {
        const chartInstance = this.renderChart(chart.id, chart.type, chart.chartConfig);
        if (chartInstance) {
          this.chartInstances.set(chart.id, chartInstance);
        }
      });

      // Initialize drag-and-drop interactions
      this.initializeInteract();

      // Adjust dashboard height
      this.adjustDashboardHeight();
    }, 0);
  }

  saveAsTemplate() {
    const templateName = prompt('Enter a name for the template:');
    if (!templateName) return;

    const template: DashboardTemplate = {
      id: this.isEditingTemplate && this.editingTemplateId ? this.editingTemplateId : Date.now().toString(),
      name: templateName,
      layout: this.getCurrentLayout(),
      createdAt: new Date()
    };

    // Get existing templates or initialize empty array
    const existingTemplates = JSON.parse(localStorage.getItem('dashboardTemplates') || '[]');

    // If editing, update the existing template
    if (this.isEditingTemplate && this.editingTemplateId) {
      const index = existingTemplates.findIndex((t: any) => t.id === this.editingTemplateId);
      if (index !== -1) {
        existingTemplates[index] = template;
      }
    } else {
      // Add new template
      existingTemplates.push(template);
    }

    // Save back to localStorage
    localStorage.setItem('dashboardTemplates', JSON.stringify(existingTemplates));

    // Clear editing state
    this.isEditingTemplate = false;
    this.editingTemplateId = null;
    localStorage.removeItem('editingTemplateId');

    // Navigate to saved templates
    this.router.navigate(['/dashboard/saved-templates']);
  }

  applySavedPositions() {
    // Apply saved positions to all elements
    const applyPosition = (element: HTMLElement, data: any) => {
      if (data.transform) {
        element.style.transform = data.transform;
      }
      if (data.width) {
        element.style.width = data.width;
      }
      if (data.height) {
        element.style.height = data.height;
      }
    };

    // Apply to charts
    this.charts.forEach(chart => {
      const element = document.getElementById(`card-${chart.id}`);
      if (element) {
        applyPosition(element, chart);
      }
    });

    // Apply to widgets
    this.widgets.forEach(widget => {
      const element = document.getElementById(`card-${widget.id}`);
      if (element) {
        applyPosition(element, widget);
      }
    });

    // Apply to tables
    this.tables.forEach(table => {
      const element = document.getElementById(`card-${table.id}`);
      if (element) {
        applyPosition(element, table);
      }
    });

    // Apply to data lists
    this.dataLists.forEach(list => {
      const element = document.getElementById(`card-${list.id}`);
      if (element) {
        applyPosition(element, list);
      }
    });
  }

  addChart(type: string, x: number, y: number) {
    const id = `chart-${++this.chartCount}`;
    this.charts.push({
      id,
      type,
      top: `${y}px`,
      left: `${x}px`
    });

    setTimeout(() => {
      const chart = this.renderChart(id, type);
      if (chart) {
        this.chartInstances.set(id, chart);
      }
      this.initializeInteract();
      this.adjustDashboardHeight();
    });
  }

  addWidget(type: string, x: number, y: number) {
    const id = `widget-${++this.widgetCount}`;
    this.widgets.push({
      id,
      type,
      top: `${y}px`,
      left: `${x}px`,
      title: type.replace(' Widget', ''),
      content: this.getWidgetContent(type)
    });

    setTimeout(() => {
      this.initializeInteract();
      this.adjustDashboardHeight();
    });
  }

  addTable(type: string, x: number, y: number) {
    const id = `table-${++this.tableCount}`;
    this.tables.push({
      id,
      type,
      top: `${y}px`,
      left: `${x}px`,
      title: type.replace(' Table', ''),
      data: this.getSampleTableData()
    });

    setTimeout(() => {
      this.initializeInteract();
      this.adjustDashboardHeight();
    });
  }

  addDataList(type: string, x: number, y: number) {
    const id = `list-${++this.dataListCount}`;
    this.dataLists.push({
      id,
      type,
      top: `${y}px`,
      left: `${x}px`,
      title: type.replace(' List', ''),
      data: this.getDataListData()
    });

    setTimeout(() => {
      this.initializeInteract();
      this.adjustDashboardHeight();
    });
  }

  private getWidgetContent(type: string): any {
    const dummyData = {
      sales: {
        value: '₹1,25,432',
        trend: '+15.8%',
        trendDirection: 'up',
        icon: 'fa-solid fa-chart-line',
        title: 'Monthly Sales',
        details: [
          { status: 'Online', count: 856 },
          { status: 'Offline', count: 432 },
          { status: 'Returns', count: 45 }
        ]
      },
      customers: {
        value: '3,456',
        trend: '+12.3%',
        trendDirection: 'up',
        icon: 'fa-solid fa-users',
        title: 'Total Customers',
        details: [
          { category: 'New', count: 234 },
          { category: 'Active', count: 2789 },
          { category: 'Inactive', count: 433 }
        ]
      },
      orders: {
        value: '1,234',
        trend: '+8.7%',
        trendDirection: 'up',
        icon: 'fa-solid fa-cart-shopping',
        title: 'Total Orders',
        details: [
          { priority: 'Delivered', count: 987 },
          { priority: 'Processing', count: 156 },
          { priority: 'Cancelled', count: 91 }
        ]
      },
      revenue: {
        value: '₹45,678',
        trend: '+18.2%',
        trendDirection: 'up',
        icon: 'fa-solid fa-indian-rupee-sign',
        title: 'Total Revenue',
        details: [
          { category: 'Products', count: 32456 },
          { category: 'Services', count: 9876 },
          { category: 'Others', count: 3346 }
        ]
      },
      inventory: {
        value: '5,678',
        trend: '-2.4%',
        trendDirection: 'down',
        icon: 'fa-solid fa-boxes-stacked',
        title: 'Total Items',
        details: [
          { category: 'In Stock', count: 4234 },
          { category: 'Low Stock', count: 987 },
          { category: 'Out of Stock', count: 457 }
        ]
      },
      tasks: {
        value: '5',
        trend: '+2 New',
        trendDirection: 'up',
        icon: 'fa-solid fa-list-check',
        title: 'Upcoming Tasks',
        tasks: [
          { title: 'Prepare Sales Report', due: 'Today', status: 'In Progress', priority: 'High' },
          { title: 'Team Meeting', due: 'Tomorrow', status: 'Scheduled', priority: 'Medium' },
          { title: 'Update Inventory', due: 'In 2 days', status: 'Pending', priority: 'Low' },
          { title: 'Client Follow-up', due: 'In 3 days', status: 'Pending', priority: 'High' },
          { title: 'Review Feedback', due: 'In 5 days', status: 'Scheduled', priority: 'Medium' }
        ]
      },
      default: {
        value: '1,000',
        trend: '+5.0%',
        trendDirection: 'up',
        icon: 'fa-solid fa-chart-bar',
        title: 'Default Metric',
        details: [
          { category: 'Category A', count: 450 },
          { category: 'Category B', count: 350 },
          { category: 'Category C', count: 200 }
        ]
      }
    };

    return dummyData[type as keyof typeof dummyData] || dummyData.default;
  }

  private getSampleTableData(): any[] {
    return [
      { id: 1, name: 'Product A', price: 100, quantity: 50, status: 'Active', lastUpdated: '2024-03-15' },
      { id: 2, name: 'Product B', price: 200, quantity: 30, status: 'Inactive', lastUpdated: '2024-03-14' },
      { id: 3, name: 'Product C', price: 150, quantity: 40, status: 'Active', lastUpdated: '2024-03-15' },
      { id: 4, name: 'Product D', price: 250, quantity: 20, status: 'Active', lastUpdated: '2024-03-13' }
    ];
  }

  private getDataListData(): any[] {
    return [
      { id: 1, title: 'New User Registration', description: 'John Doe registered as a new user', time: '2 hours ago', priority: 'high' },
      { id: 2, title: 'Order Completed', description: 'Order #12345 has been completed', time: '3 hours ago', priority: 'medium' },
      { id: 3, title: 'Payment Received', description: 'Payment of $500 received', time: '5 hours ago', priority: 'high' },
      { id: 4, title: 'System Update', description: 'System updated to version 2.0', time: '1 day ago', priority: 'low' }
    ];
  }

  removeWidget(widget: any) {
    this.widgets = this.widgets.filter(w => w.id !== widget.id);
  }

  removeTable(table: any) {
    this.tables = this.tables.filter(t => t.id !== table.id);
  }

  removeDataList(list: any) {
    this.dataLists = this.dataLists.filter(l => l.id !== list.id);
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

  loadChartTemplates() {
    const savedCharts = localStorage.getItem('savedChartConfigList');
    if (savedCharts) {
      try {
        const chartList = JSON.parse(savedCharts);
        if (Array.isArray(chartList)) {
          this.chartTemplates = chartList.map(chartConfig => ({
            id: chartConfig.id || `chart-${Date.now()}`,
            type: chartConfig.type,
            title: chartConfig.title || 'Untitled Chart',
            data: chartConfig.data || [],
            xAxis: chartConfig.xAxis,
            yAxes: chartConfig.yAxes,
            headers: chartConfig.headers || [],
            sheetName: chartConfig.sheetName,
            chartConfig: chartConfig
          }));
        }
      } catch (error) {
        console.error('Error loading chart templates:', error);
        this.chartTemplates = [];
      }
    } else {
      this.chartTemplates = [];
    }
  }

  dragChart(event: DragEvent, chart: any) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('chart', JSON.stringify(chart));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  addCustomChart(chartConfig: any, x: number, y: number) {
    const chartId = `chart-${this.chartCount++}`;
    const chart = {
      id: chartId,
      type: chartConfig.type,
      title: chartConfig.title || 'Untitled Chart',
      top: `${y}px`,
      left: `${x}px`,
      width: '400px',
      height: '300px',
      transform: 'none',
      chartConfig: chartConfig
    };

    this.charts.push(chart);
    setTimeout(() => {
      const chartInstance = this.renderChart(chartId, chartConfig.type, chartConfig);
      if (chartInstance) {
        this.chartInstances.set(chartId, chartInstance);
      }
      // Ensure interact.js is initialized for new chart
      this.initializeInteract();
      this.adjustDashboardHeight();
    }, 100);
  }

  getOptionFromChartConfig(chartConfig: any): any {
    // Debug logging
    console.log('Chart Config received:', {
      hasConfig: !!chartConfig,
      type: chartConfig?.type,
      title: chartConfig?.title,
      hasData: !!chartConfig?.data,
      dataLength: chartConfig?.data?.length,
      xAxis: chartConfig?.xAxis,
      yAxes: chartConfig?.yAxes,
      fullState: chartConfig?.fullState
    });

    if (!chartConfig) {
      console.log('No chart config provided');
      return {
        title: { text: 'No Data', left: 'center', top: 'center', textStyle: { color: '#3d3185', fontWeight: 'bold', fontSize: 22 } }
      };
    }

    const data = chartConfig.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      console.log('No valid data array found:', { data });
      return {
        title: { text: 'No Data', left: 'center', top: 'center', textStyle: { color: '#3d3185', fontWeight: 'bold', fontSize: 22 } }
      };
    }

    // Debug log the first row of data
    console.log('First row of data:', data[0]);
    console.log('X-Axis key:', chartConfig.xAxis);
    console.log('Y-Axes:', chartConfig.yAxes);

    const textStyle = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#2c3e50'
    };

    // Common chart options
    const commonOptions: Partial<EChartsOption> = {
      backgroundColor: '#fff',
      title: {
        text: chartConfig.title || 'Data Visualization',
        left: 'center',
        top: 10,
        textStyle: {
          ...textStyle,
          fontSize: 20,
          fontWeight: 'bold' as const,
          color: '#3d3185'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#3d3185',
        borderWidth: 1,
        textStyle: {
          ...textStyle,
          fontSize: 14,
          color: '#333'
        },
        padding: [10, 15],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px;'
      },
      legend: {
        data: chartConfig.yAxes?.map((axis: any) => axis.name) || [],
        top: 50,
        textStyle: {
          ...textStyle,
          fontSize: 14,
          color: '#666'
        },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 20
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      }
    };

    const xAxisData = data.map((row: any) => row[chartConfig.xAxis]?.toString() || '');

    if (chartConfig.type === 'area') {
      const areaData = data.map((row: any) => {
        const x = row[chartConfig.xAxis];
        const y = row[chartConfig.yAxes[0].name];
        let xValue;
        if (typeof x === 'string' && moment(x).isValid()) {
          xValue = moment(x).valueOf();
        } else {
          xValue = x;
        }
        return [xValue, y];
      });
      return {
        ...commonOptions,
        tooltip: {
          ...commonOptions.tooltip,
          formatter: (params: any) => {
            const param = params[0];
            const xValue = param.value[0];
            const yValue = param.value[1];
            const xDisplay = typeof xValue === 'number' && xValue > 1000000000000 ?
              moment(xValue).format('YYYY-MM-DD') : xValue;
            return `${chartConfig.xAxis}: ${xDisplay}<br/>${chartConfig.yAxes[0].name}: ${yValue}`;
          }
        },
        xAxis: {
          type: (typeof areaData[0][0] === 'number' && areaData[0][0] > 1000000000000 ? 'time' : 'category') as XAXisComponentOption['type'],
          data: areaData.map((item: any) => item[0]),
          boundaryGap: false
        } as XAXisComponentOption,
        yAxis: {
          type: 'value',
          boundaryGap: [0, '100%']
        },
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          { start: 0, end: 100 }
        ],
        series: [{
          name: chartConfig.yAxes[0].name,
          type: 'line',
          smooth: true,
          symbol: 'none',
          areaStyle: {
            opacity: 0.3,
            color: (window as any).echarts ? new (window as any).echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: chartConfig.yAxes[0].color || '#3d3185' },
              { offset: 1, color: 'rgba(255, 255, 255, 0.1)' }
            ]) : undefined
          },
          data: areaData.map((item: any) => item[1])
        }]
      };
    }

    if (chartConfig.type === 'bar' || chartConfig.type === 'line' || chartConfig.type === 'scatter') {
      return {
        ...commonOptions,
        xAxis: {
          type: 'category',
          data: xAxisData
        },
        yAxis: {
          type: 'value'
        },
        series: chartConfig.yAxes.map((axis: any) => ({
          name: axis.name,
          type: chartConfig.type,
          data: data.map((row: any) => Number(row[axis.name]) || 0),
          itemStyle: {
            color: axis.color || '#3d3185'
          },
          smooth: chartConfig.type === 'line',
          symbol: chartConfig.type === 'scatter' ? 'circle' : 'none',
          symbolSize: chartConfig.type === 'scatter' ? 8 : 0
        }))
      };
    }

    if (chartConfig.type === 'pie' || chartConfig.type === 'doughnut') {
      // If data is already in [{ name, value }] format, use it directly
      let pieData = [];
      if (Array.isArray(data) && data.length > 0 && data[0].name !== undefined && data[0].value !== undefined) {
        pieData = data.map((d: any) => ({
          name: d.name,
          value: d.value
        }));
      } else {
        // fallback: aggregate by yAxes (old logic)
        pieData = chartConfig.yAxes.map((axis: any) => {
          const total = data.reduce((sum: number, row: any) => {
            const value = Number(row[axis.name]) || 0;
            return sum + value;
          }, 0);
          return {
            name: axis.name,
            value: total
          };
        });
      }
      return {
        ...commonOptions,
        tooltip: {
          ...commonOptions.tooltip,
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          ...commonOptions.legend,
          orient: 'vertical',
          left: 'left',
          top: 'center',
          data: pieData.map((d: any) => d.name)
        },
        series: [{
          type: 'pie',
          radius: chartConfig.type === 'doughnut' ? ['50%', '70%'] : '50%',
          center: ['50%', '50%'],
          data: pieData,
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 14,
            color: '#333',
            lineHeight: 20,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          labelLine: {
            show: true,
            length: 20,
            length2: 20,
            smooth: true
          },
          emphasis: {
            scale: true,
            scaleSize: 5,
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          animation: true,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: (idx: number) => idx * 100
        }]
      };
    }

    if (chartConfig.type === 'candlestick') {
      // Prepare OHLC data: expects data to have open, high, low, close, volume, and xAxis (date/time)
      const ohlcData = (data || []).map(row => [
        row[chartConfig.xAxis], // Date or X value
        Number(row.open),
        Number(row.high),
        Number(row.low),
        Number(row.close),
        Number(row.volume)
      ]);
      // Convert date to timestamp for ECharts 'time' axis
      const ohlcDataWithTimestamps = ohlcData.map(item => [moment(item[0]).valueOf(), ...item.slice(1)]);
      return {
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
              formatter: (value: number) => moment(value).format('YYYY-MM-DD'),
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
            data: ohlcDataWithTimestamps.map(item => [item[0], item[1], item[4], item[3], item[2]]), // [timestamp, open, close, low, high]
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
            data: ohlcDataWithTimestamps.map(item => item[5]),
            itemStyle: {
              color: '#7fbe9e'
            }
          }
        ]
      };
    }

    // fallback
    return null;
  }

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  getChartIcon(chartType: string): string {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return 'fas fa-chart-bar';
      case 'line':
        return 'fas fa-chart-line';
      case 'pie':
        return 'fas fa-chart-pie';
      case 'doughnut':
        return 'fas fa-circle-notch';
      case 'area':
        return 'fas fa-chart-area';
      case 'scatter':
        return 'fas fa-braille';
      case 'candlestick':
        return 'fas fa-chart-line';
      default:
        return 'fas fa-chart-bar';
    }
  }

  get filteredCharts() {
    if (!this.searchChartTerm) return this.chartTemplates;
    const term = this.searchChartTerm.toLowerCase();
    return this.chartTemplates.filter(chart =>
      (chart.title || '').toLowerCase().includes(term) ||
      (chart.type || '').toLowerCase().includes(term)
    );
  }

  editChart(chart: any) {
    this.editingChart = chart.config;
    this.editChartTitle = chart.title;
    this.editChartType = chart.type;
    this.editXAxis = chart.config.xAxis;
    this.editYAxes = chart.config.yAxes ? chart.config.yAxes.map((y: any) => y.name) : [];
    this.editCustomColors = { ...chart.config.customColors };
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

  saveEditedChart() {
    if (!this.editChartTitle || !this.editChartType || !this.editXAxis || this.editYAxes.length === 0) {
      return;
    }
    // Update chart config
    const updatedChart = {
      ...this.editingChart,
      title: this.editChartTitle,
      type: this.editChartType,
      xAxis: this.editXAxis,
      yAxes: this.editYAxes.map(name => ({ name, color: this.editCustomColors[name] || '#3d3185' })),
      customColors: { ...this.editCustomColors }
    };
    // Update in localStorage
    const savedCharts = localStorage.getItem('savedChartConfigList');
    if (savedCharts) {
      let chartList = JSON.parse(savedCharts);
      chartList = chartList.map((c: any) => c.id === updatedChart.id ? { ...c, ...updatedChart } : c);
      localStorage.setItem('savedChartConfigList', JSON.stringify(chartList));
    }
    // Update in UI (sidebar)
    this.loadChartTemplates();

    // Update in dashboard if present
    const dashboardIdx = this.charts.findIndex(c => c.id === updatedChart.id);
    if (dashboardIdx !== -1) {
      this.charts[dashboardIdx] = {
        ...this.charts[dashboardIdx],
        ...updatedChart,
        chartConfig: { ...this.charts[dashboardIdx].chartConfig, ...updatedChart }
      };
      setTimeout(() => {
        this.renderChart(this.charts[dashboardIdx].id, this.charts[dashboardIdx].type, this.charts[dashboardIdx].chartConfig);
      }, 100);
    }

    // Show toast and close modal
    this.toastr.success(
      `<div class="toast-content">
        <div class="toast-icon"><i class="fas fa-save"></i></div>
        <div class="toast-message">
          <div class="toast-title">Chart Updated</div>
          <div class="toast-text">Your chart configuration has been saved successfully!</div>
        </div>
      </div>`,
      '',
      {
        timeOut: 2500,
        extendedTimeOut: 1000,
        closeButton: true,
        progressBar: true,
        enableHtml: true,
        positionClass: 'toast-top-right',
        toastClass: 'custom-toast success-toast',
        titleClass: 'toast-title',
        messageClass: 'toast-message',
        tapToDismiss: true,
        newestOnTop: true
      }
    );
    this.closeEditChartModal();
  }

  deleteChart(chart: any) {
    if (confirm('Are you sure you want to delete this chart?')) {
      this.chartTemplates = this.chartTemplates.filter(c => c.id !== chart.id);
      // Remove from localStorage as well
      const savedCharts = localStorage.getItem('savedChartConfigList');
      if (savedCharts) {
        let chartList = JSON.parse(savedCharts);
        chartList = chartList.filter((c: any) => c.id !== chart.id);
        localStorage.setItem('savedChartConfigList', JSON.stringify(chartList));
      }
      // Remove from dashboard if present
      this.charts = this.charts.filter(c => c.id !== chart.id);
    }
  }

  // Handle Y-Axis checkbox change in edit modal
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

  // Handle color input change in edit modal
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
    // Prepare config
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

  dragWidget(event: DragEvent, widget: any) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('widgetKey', widget.key);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
