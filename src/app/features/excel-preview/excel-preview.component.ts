import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import * as echarts from 'echarts';
import type {
  EChartsOption,
  SeriesOption,
  TitleComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  GridComponentOption,
  XAXisComponentOption,
  YAXisComponentOption,
  RadarSeriesOption,
  PieSeriesOption,
  LineSeriesOption,
  BarSeriesOption,
  ScatterSeriesOption,
  CandlestickSeriesOption
} from 'echarts';
import moment from 'moment';
import { ToastrService } from 'ngx-toastr';

interface DataSummary {
  totalRows: number;
  totalColumns: number;
  fileName: string;
  workspaceName: string;
}

interface ColumnConfig {
  name: string;
  type: string;
  isSelected: boolean;
  isEditing?: boolean;
}

interface RowData {
  [key: string]: any;
  selected?: boolean;
}

interface PivotConfig {
  rows: string[];
  columns: string[];
  values: string[];
  aggregator: 'sum' | 'average' | 'count' | 'min' | 'max';
}

@Component({
  selector: 'app-excel-preview',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink, NgbModule],
  templateUrl: './excel-preview.component.html',
  styleUrls: ['./excel-preview.component.scss']
})
export class ExcelPreviewComponent implements OnInit, AfterViewInit {
  // Data from import component
  headers: string[] = [];
  allData: RowData[] = [];
  previewData: RowData[] = [];
  columnConfigs: ColumnConfig[] = [];

  // Available data types for columns
  availableDataTypes = [
    {
      value: 'INT',
      label: 'INT (Whole numbers without decimals)',
      displayText: 'INT'
    },
    {
      value: 'FLOAT',
      label: 'FLOAT (Numbers with decimal points)',
      displayText: 'FLOAT'
    },
    {
      value: 'STRING',
      label: 'STRING (Text values like names, descriptions, or categories)',
      displayText: 'STRING'
    },
    {
      value: 'DATE',
      label: 'DATE (Date and time values)',
      displayText: 'DATE'
    },
    {
      value: 'BOOLEAN',
      label: 'BOOLEAN (True/False values)',
      displayText: 'BOOLEAN'
    }
  ];

  // Editing state
  editingCell: { rowIndex: number; header: string } | null = null;
  editingColumn: string | null = null;
  editingColumnName: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Data summary
  dataSummary: DataSummary = {
    totalRows: 0,
    totalColumns: 0,
    fileName: '',
    workspaceName: ''
  };

  // Chart properties
  @ViewChild('chartCanvas') chartCanvas!: ElementRef;
  chart: echarts.ECharts | null = null;
  public selectedChartType: string = '';
  public selectedXAxis: string = '';
  public selectedYAxes: string[] = [];
  public chartTitle: string = '';
  public isChartModalVisible: boolean = false;

  // Updated and new chart properties
  dataSourceInfo: string = '';
  public customColors: { [key: string]: string } = {};

  // Y-axis panel state
  public isYAxisPanelOpen: boolean = false;
  public chartTypes: string[] = ['bar', 'line', 'pie', 'scatter'];

  sheetsData: any[] = [];
  selectedSheetIndex: number = 0;

  // Candlestick chart constants
  private readonly CANDLESTICK_COLORS = {
    upColor: '#ec0000',
    upBorderColor: '#8A0000',
    downColor: '#00da3c',
    downBorderColor: '#008F28'
  };

  public isTitleTouched: boolean = false;

  // Add new property to track sheet chart status
  sheetChartStatus: { [key: string]: boolean } = {};

  // Aggregate property for pie/doughnut
  public isAggregate: boolean = false;

  // Add property for aggregate column
  public selectedAggregateColumn: string = '';

  // Pivot table properties
  public pivotConfig: PivotConfig = {
    rows: [],
    columns: [],
    values: [],
    aggregator: 'sum'
  };

  public availableAggregators = [
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' }
  ];

  constructor(private router: Router, private cdr: ChangeDetectorRef, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadData();
    this.updateSheetChartStatus();
    this.chartTypes = [...this.chartTypes, 'pivot'];
  }

  ngAfterViewInit() {
    // Initialize chart container
    if (this.chartCanvas) {
      this.chart = echarts.init(this.chartCanvas.nativeElement);
      window.addEventListener('resize', () => {
        this.chart?.resize();
      });
    }
  }

  private loadData() {
    // First try to get data from router state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { data: any };

    if (state?.data) {
      this.sheetsData = [{
        sheetName: state.data.sheetName || 'Sheet1',
        headers: state.data.headers,
        data: state.data.data,
        columnConfigs: state.data.columnConfigs
      }];
      this.selectedSheetIndex = 0;
      this.initializeData(this.sheetsData[0]);
    } else {
      // Load data from localStorage that was saved by import-data component
      const importedSheetsData = localStorage.getItem('importedSheetsData');
      if (importedSheetsData) {
        try {
          this.sheetsData = JSON.parse(importedSheetsData);
          if (this.sheetsData.length > 0) {
            this.selectedSheetIndex = 0;
            this.initializeData(this.sheetsData[0]);
          }
        } catch (error) {
          console.error('Error loading data from localStorage:', error);
        }
      } else {
        console.warn('No data found in localStorage');
      }
    }
  }

  private initializeData(data: any) {
    // Clear any existing data
    this.headers = [];
    this.allData = [];
    this.columnConfigs = [];

    // Set headers and data
    this.headers = data.headers || [];
    this.allData = (data.data || []).map((row: any) => ({ ...row, selected: false }));

    // Initialize column configs if provided, otherwise create them
    if (data.columnConfigs && data.columnConfigs.length > 0) {
      this.columnConfigs = data.columnConfigs;
    } else {
      // Auto-detect column types and create column configs
      this.columnConfigs = this.headers.map(header => {
        const detectedType = this.detectColumnType(header);
        return {
          name: header,
          type: detectedType,
          isSelected: true,
          isEditing: false
        };
      });
    }

    // Update data summary
    this.dataSummary = {
      totalRows: this.allData.length,
      totalColumns: this.headers.length,
      fileName: data.fileName || 'Imported Data',
      workspaceName: data.workspaceName || 'Default Workspace'
    };

    // Set data source info
    this.dataSourceInfo = `${this.dataSummary.fileName} - ${data.sheetName || 'Sheet1'}`;

    // Initialize custom colors for all headers
    this.headers.forEach(header => {
      this.customColors[header] = this.getRandomColor();
    });

    // Calculate pagination
    this.totalPages = Math.ceil(this.allData.length / this.pageSize);
    this.currentPage = 1;
    this.loadPageData();

    // Force change detection
    this.cdr.detectChanges();
  }

  // Cell editing
  isEditingCell(row: RowData, header: string): boolean {
    return this.editingCell?.rowIndex === this.previewData.indexOf(row) &&
           this.editingCell?.header === header;
  }

  startEditingCell(row: RowData, header: string) {
    this.editingCell = {
      rowIndex: this.previewData.indexOf(row),
      header: header
    };
  }

  stopEditingCell(row: RowData, header: string) {
    this.editingCell = null;
    // Update the data type if needed
    this.updateColumnType(header);
  }

  // Column editing
  isEditingColumn(header: string): boolean {
    return this.editingColumn === header;
  }

  startEditingColumn(header: string) {
    this.editingColumn = header;
    this.editingColumnName = header;
  }

  stopEditingColumn(header: string) {
    if (this.editingColumn) {
      const oldHeader = this.editingColumn;
      const newHeader = this.editingColumnName;

      if (newHeader && newHeader !== oldHeader) {
        // Update column name in all data
        this.allData.forEach(row => {
          row[newHeader] = row[oldHeader];
          delete row[oldHeader];
        });

        // Update headers and configs
        const index = this.headers.indexOf(oldHeader);
        if (index !== -1) {
          this.headers[index] = newHeader;
          this.columnConfigs[index].name = newHeader;
        }
      }

      this.editingColumn = null;
      this.editingColumnName = '';
    }
  }

  getColumnName(header: string): string {
    const config = this.columnConfigs.find(c => c.name === header);
    return config ? config.name : header;
  }

  // Row operations
  deleteRow(index: number) {
    const globalIndex = (this.currentPage - 1) * this.pageSize + index;
    this.allData.splice(globalIndex, 1);
    this.dataSummary.totalRows--;
    this.totalPages = Math.ceil(this.allData.length / this.pageSize);
    this.loadPageData();
  }

  selectAllRows() {
    const allSelected = this.previewData.every(row => row.selected);
    this.previewData.forEach(row => {
      row.selected = !allSelected;
    });
  }

  hasSelectedRows(): boolean {
    return this.previewData.some(row => row.selected);
  }

  areAllRowsSelected(): boolean {
    return this.previewData.length > 0 && this.previewData.every(row => row.selected);
  }

  getSelectedRowCount(): number {
    return this.allData.filter(row => row.selected).length;
  }

  deleteSelectedRows() {
    this.allData = this.allData.filter(row => !row.selected);
    this.dataSummary.totalRows = this.allData.length;
    this.totalPages = Math.ceil(this.allData.length / this.pageSize);
    this.loadPageData();
  }

  // Column operations
  deleteColumn(header: string) {
    const index = this.headers.indexOf(header);
    if (index !== -1) {
      this.headers.splice(index, 1);
      this.columnConfigs.splice(index, 1);
      this.allData.forEach(row => {
        delete row[header];
      });
      this.dataSummary.totalColumns--;
      this.loadPageData();
    }
  }

  // Data type detection and update
  private updateColumnType(header: string) {
    const newType = this.detectColumnType(header);
    const config = this.columnConfigs.find(c => c.name === header);
    if (config) {
      config.type = newType;
    }
  }

  private detectColumnType(header: string): string {
    const values = this.allData.map(row => row[header]);
    const nonEmptyValues = values.filter(val => val !== null && val !== undefined && val !== '');

    if (nonEmptyValues.length === 0) return 'STRING';

    // Special handling for known column names
    const headerLower = header.toLowerCase();
    if (headerLower === 'date' || headerLower.includes('date')) {
      return 'DATE';
    }

    // Check for currency/price columns
    if (['close', 'open', 'high', 'low', 'price', 'amount', 'total', 'sum', 'value'].some(term => headerLower.includes(term))) {
      return 'FLOAT';
    }

    // Check for dates with multiple formats
    const isAllDates = nonEmptyValues.every(val => {
      if (typeof val === 'number' && val > 25569 && val < 47483) {
        return true; // Excel date
      }

      // Try parsing with moment in strict mode
      const dateFormats = [
        'M/D/YY',
        'MM/DD/YY',
        'M/D/YYYY',
        'MM/DD/YYYY',
        'YYYY-MM-DD',
        'DD-MM-YYYY',
        'MM-DD-YYYY',
        'DD/MM/YYYY',
        'MM/DD/YYYY',
        'YYYY/MM/DD',
        'DD-MMM-YYYY',
        'DD MMM YYYY',
        'MMM DD, YYYY'
      ];

      return dateFormats.some(format => moment(val, format, true).isValid());
    });
    if (isAllDates) return 'DATE';

    // Check for integers (including comma-separated numbers)
    const isAllIntegers = nonEmptyValues.every(val => {
      const cleanNum = String(val).replace(/,/g, ''); // Remove commas
      const num = Number(cleanNum);
      return !isNaN(num) && Number.isInteger(num) && num >= -2147483648 && num <= 2147483647;
    });
    if (isAllIntegers) return 'INT';

    // Check for floating point numbers (including comma-separated numbers)
    const isAllNumbers = nonEmptyValues.every(val => {
      const cleanNum = String(val).replace(/,/g, ''); // Remove commas
      const num = Number(cleanNum);
      return !isNaN(num) && num >= -1.7976931348623157e+308 && num <= 1.7976931348623157e+308;
    });
    if (isAllNumbers) return 'FLOAT';

    // Check for boolean values
    const booleanValues = ['true', 'false', '0', '1', 'yes', 'no', 'y', 'n', 't', 'f'];
    const isAllBooleans = nonEmptyValues.every(val =>
      booleanValues.includes(String(val).toLowerCase().trim())
    );
    if (isAllBooleans) return 'BOOLEAN';

    // Check for percentage values
    const isAllPercentages = nonEmptyValues.every(val => {
      const strVal = String(val).trim();
      return strVal.endsWith('%') && !isNaN(Number(strVal.slice(0, -1)));
    });
    if (isAllPercentages) return 'FLOAT';

    return 'STRING';
  }

  // Existing methods
  loadPageData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.previewData = this.allData.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPageData();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  isColumnSelected(header: string): boolean {
    const config = this.columnConfigs.find(c => c.name === header);
    return config ? config.isSelected : false;
  }

  toggleColumnSelection(header: string) {
    const config = this.columnConfigs.find(c => c.name === header);
    if (config) {
      config.isSelected = !config.isSelected;
      // If the column was deselected and is currently selected as X or Y axis, reset
      if (!config.isSelected) {
        if (this.selectedXAxis === header) {
          this.selectedXAxis = '';
        }
        if (this.selectedYAxes.includes(header)) {
          this.selectedYAxes = this.selectedYAxes.filter(h => h !== header);
        }
      }
    }
  }

  getColumnType(header: string): string {
    const config = this.columnConfigs.find(c => c.name === header);
    return config ? config.type : 'STRING';
  }

  downloadData() {
    const selectedColumns = this.columnConfigs.filter(c => c.isSelected).map(c => c.name);
    const filteredData = this.allData.map(row => {
      const filteredRow: any = {};
      selectedColumns.forEach(column => {
        filteredRow[column] = row[column];
      });
      return filteredRow;
    });

    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${this.dataSummary.fileName}_preview.xlsx`);
  }

  proceedToNextStep() {
    const selectedColumns = this.columnConfigs.filter(c => c.isSelected).map(c => c.name);
    const filteredData = this.allData.map(row => {
      const filteredRow: any = {};
      selectedColumns.forEach(column => {
        filteredRow[column] = row[column];
      });
      return filteredRow;
    });

    localStorage.setItem('previewedData', JSON.stringify({
      headers: selectedColumns,
      data: filteredData,
      columnConfigs: this.columnConfigs.filter(c => c.isSelected),
      fileName: this.dataSummary.fileName,
      workspaceName: this.dataSummary.workspaceName
    }));

    this.router.navigate(['/join-data']);
  }

  // Chart Modal Methods
  openChartModal() {
    // Reset selections and validation state
    this.selectedXAxis = '';
    this.selectedYAxes = [];
    this.selectedChartType = '';
    this.chartTitle = '';
    this.isTitleTouched = false;

    // Show modal
    this.isChartModalVisible = true;

    // Clear and reinitialize chart after modal is shown
    setTimeout(() => {
        if (this.chartCanvas) {
            // Dispose of existing chart instance
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }
            // Clear the canvas
            const canvas = this.chartCanvas.nativeElement;
            canvas.innerHTML = '';
            // Create new chart instance
            this.chart = echarts.init(canvas);
            this.chart.setOption({
                title: {
                    text: 'Select chart type and data to preview',
                    left: 'center',
                    top: 'center',
                    textStyle: {
                        fontSize: 16,
                        color: '#999'
                    }
                }
            });
        }
    }, 100);
  }

  closeChartModal() {
    this.isChartModalVisible = false;
  }

  onChartTypeChange() {
    if (this.selectedChartType && this.selectedXAxis && this.selectedYAxes.length > 0) {
      this.generateChart();
    }
  }

  onTitleChange() {
    this.isTitleTouched = true;
    if (this.chart) {
      // Only update the chart title, do not regenerate the chart data
      this.chart.setOption({
        title: {
          text: this.chartTitle || 'Data Visualization'
        }
      });
    }
  }

  onAxisChange() {
    if (this.selectedXAxis && this.selectedYAxes.length > 0) {
      this.generateChart();
    }
  }

  onYAxisChange(header: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedYAxes.push(header);
    } else {
      this.selectedYAxes = this.selectedYAxes.filter(h => h !== header);
    }
    if (this.selectedChartType && this.selectedXAxis) {
    this.generateChart();
    }
  }

  updateSeriesColor(header: string, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.customColors[header] = color;
    if (this.selectedChartType && this.selectedXAxis && this.selectedYAxes.length > 0) {
    this.generateChart();
    }
  }

  // Modify the generateChart method to add candlestick support
  generateChart() {
    if (this.selectedChartType === 'pivot') {
      // Dispose of any existing chart instance
      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }
      this.generatePivotTable();
      return;
    }
    if (!this.chart || !this.selectedChartType || !this.selectedXAxis || this.selectedYAxes.length === 0) {
      return;
    }

    try {
      const data = this.allData;
      const xAxisData = data.map(row => row[this.selectedXAxis]?.toString() || '');

      // Common chart options with proper typing
      const commonOptions: Partial<EChartsOption> = {
        backgroundColor: '#fff',
        title: {
          text: this.chartTitle || 'Data Visualization',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 20,
            fontWeight: 'bold' as const,
            color: '#3d3185',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }
        } as TitleComponentOption,
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#3d3185',
          borderWidth: 1,
          textStyle: {
            color: '#333',
            fontSize: 14,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          padding: [10, 15],
          extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px;'
        } as TooltipComponentOption,
        legend: {
          data: this.selectedYAxes,
          top: 50,
          textStyle: {
            color: '#666',
            fontSize: 14,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 20
        } as LegendComponentOption,
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        } as GridComponentOption,
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLabel: {
            rotate: 45,
            interval: 0,
            color: '#666',
            fontSize: 12,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          axisLine: {
            lineStyle: {
              color: '#e0e0e0'
            }
          },
          axisTick: {
            alignWithLabel: true
          }
        } as XAXisComponentOption,
        yAxis: {
          type: 'value',
          axisLabel: {
            color: '#666',
            fontSize: 12,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          },
          axisLine: {
            lineStyle: {
              color: '#e0e0e0'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0'
            }
          }
        } as YAXisComponentOption
      };

      let options: EChartsOption;

      if (this.selectedChartType === 'candlestick') {
        // Only allow one Y-axis for candlestick chart
        if (this.selectedYAxes.length !== 1) {
          return;
        }

        const ohlcData = this.generateOHLCData(data, this.selectedXAxis, this.selectedYAxes[0]);
        // Convert date to timestamp for ECharts 'time' axis
        const dates = ohlcData.map(item => moment(item[0]).valueOf());
        // Update ohlcData to use timestamp as first column
        const ohlcDataWithTimestamps = ohlcData.map(item => [moment(item[0]).valueOf(), ...item.slice(1)]);

        options = {
          backgroundColor: '#fff',
          title: {
            text: '', // Title handled by custom HTML
          },
          legend: {
            show: false // Hide ECharts legend, use custom HTML legend
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
              data: ohlcDataWithTimestamps.map(item => [item[0], item[1], item[2], item[3], item[4]]),
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
      } else if (this.selectedChartType === 'pie' || this.selectedChartType === 'doughnut') {
        // Save pie/doughnut as array of { name, value } objects, grouped by label and aggregated by value
        const groupMap = new Map<string, number>();
        for (const row of this.allData) {
          const label = row[this.selectedXAxis];
          const value = Number(row[this.selectedAggregateColumn]) || 0;
          if (groupMap.has(label)) {
            groupMap.set(label, groupMap.get(label)! + value);
          } else {
            groupMap.set(label, value);
          }
        }
        const chartData = Array.from(groupMap.entries()).map(([name, value]) => ({ name, value }));
        const series: PieSeriesOption[] = [{
          type: 'pie',
          radius: this.selectedChartType === 'doughnut' ? ['50%', '70%'] : '50%',
          center: ['50%', '50%'],
          data: chartData,
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 14,
            color: '#333'
          }
        }];
        const options: EChartsOption = {
          backgroundColor: '#fff',
          title: {
            text: this.chartTitle || 'Data Visualization',
            left: 'center',
            top: 10,
            textStyle: {
              fontSize: 20,
              fontWeight: 'bold' as const,
              color: '#3d3185'
            }
          },
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          legend: {
            data: chartData.map(d => d.name),
            orient: 'vertical',
            left: 'left',
            top: 'center'
          },
          series
        };
        if (this.chart) {
          this.chart.setOption(options, true);
          this.chart.resize();
        }
        return;
      } else if (this.selectedChartType === 'radar') {
        const series: RadarSeriesOption[] = this.selectedYAxes.map(yAxis => ({
          name: yAxis,
          type: 'radar',
          data: [{
            value: data.map(row => Number(row[yAxis]) || 0),
            name: yAxis
          }],
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3
          },
          itemStyle: {
            color: this.customColors[yAxis] || this.getRandomColor()
          }
        }));

        options = {
          ...commonOptions,
          radar: {
            indicator: xAxisData.map(name => ({ name, max: 100 })),
            splitNumber: 4,
            shape: 'circle',
            axisName: {
              color: '#666',
              fontSize: 14,
              padding: [3, 5],
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            },
            splitLine: {
              lineStyle: {
                color: ['#e0e0e0', '#f0f0f0', '#f5f5f5', '#fafafa']
              }
            },
            splitArea: {
              show: true,
              areaStyle: {
                color: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.3)']
              }
            },
            axisLine: {
              lineStyle: {
                color: '#e0e0e0'
              }
            }
          },
          series
        };
      } else if (this.selectedChartType === 'area') {
        // Only allow one Y-axis for area chart
        if (this.selectedYAxes.length !== 1) {
          return;
        }

        // Get the exact values from Excel data
        const areaData = this.allData.map(row => {
          const x = row[this.selectedXAxis];
          const y = row[this.selectedYAxes[0]];

          // Convert x to timestamp if it's a date string
          let xValue;
          if (typeof x === 'string' && moment(x).isValid()) {
            xValue = moment(x).valueOf();
          } else {
            xValue = x; // Keep original value if not a date
          }

          // Keep y value exactly as is from Excel
          return [xValue, y];
        });

        const options: EChartsOption = {
          tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
              const param = params[0];
              const xValue = param.value[0];
              const yValue = param.value[1];
              // Format x value if it's a timestamp
              const xDisplay = typeof xValue === 'number' && xValue > 1000000000000 ?
                moment(xValue).format('YYYY-MM-DD') : xValue;
              return `${this.selectedXAxis}: ${xDisplay}<br/>${this.selectedYAxes[0]}: ${yValue}`;
            }
          },
          title: {
            left: 'center',
            text: this.chartTitle || 'Area Chart'
          },
          toolbox: {
            feature: {
              dataZoom: { yAxisIndex: 'none' },
              restore: {},
              saveAsImage: {}
            }
          },
          xAxis: {
            type: (typeof areaData[0][0] === 'number' && areaData[0][0] > 1000000000000 ? 'time' : 'category') as XAXisComponentOption['type'],
            data: areaData.map(item => item[0]),
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
          series: [
            {
              name: this.selectedYAxes[0],
              type: 'line',
              smooth: true,
              symbol: 'none',
              areaStyle: {
                opacity: 0.3,
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: this.customColors[this.selectedYAxes[0]] || this.getRandomColor() },
                  { offset: 1, color: 'rgba(255, 255, 255, 0.1)' }
                ])
              },
              data: areaData.map(item => item[1]),
              itemStyle: {
                color: this.customColors[this.selectedYAxes[0]] || this.getRandomColor()
              }
            }
          ]
        };
        this.chart.setOption(options, true);
        this.chart.resize();
        return;
      } else {
        const series: (LineSeriesOption | BarSeriesOption | ScatterSeriesOption)[] = this.selectedYAxes.map(yAxis => {
          const baseSeries = {
            name: yAxis,
            data: data.map(row => Number(row[yAxis]) || 0),
            symbol: this.selectedChartType === 'scatter' ? 'circle' : 'none',
            symbolSize: this.selectedChartType === 'scatter' ? 8 : 0,
            itemStyle: {
              color: this.customColors[yAxis] || this.getRandomColor(),
              borderWidth: 2,
              borderColor: '#fff'
            },
            animation: true,
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: (idx: number) => idx * 100
          };

          if (this.selectedChartType === 'line') {
            return {
              ...baseSeries,
              type: 'line',
              smooth: true,
              showSymbol: true,
              symbolSize: 8,
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
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: this.customColors[yAxis] || this.getRandomColor() },
                  { offset: 1, color: 'rgba(255, 255, 255, 0.1)' }
                ])
              },
              emphasis: {
                focus: 'series',
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: 'rgba(0,0,0,0.2)'
                }
              }
            } as LineSeriesOption;
          } else if (this.selectedChartType === 'bar') {
            return {
              ...baseSeries,
              type: 'bar',
              barWidth: '60%',
              itemStyle: {
                ...baseSeries.itemStyle,
                borderRadius: [4, 4, 0, 0]
              }
            } as BarSeriesOption;
          } else {
            return {
              ...baseSeries,
              type: 'scatter',
              symbolSize: 10,
              itemStyle: {
                ...baseSeries.itemStyle,
                borderWidth: 1
              }
            } as ScatterSeriesOption;
          }
        });

        options = {
          ...commonOptions,
          series,
          tooltip: {
            ...commonOptions.tooltip,
            trigger: 'axis',
            axisPointer: {
              type: 'cross',
              label: {
                backgroundColor: '#3d3185'
              }
            }
          } as TooltipComponentOption
        };
      }

      this.chart.setOption(options, true);
      this.chart.resize();
    } catch (error) {
      console.error('Error generating chart:', error);
    }
  }

  public getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  public saveChart(): void {
    // Validate required fields
    if (!this.chartTitle) {
      this.isTitleTouched = true;
      return;
    }

    if (!this.selectedChartType || !this.selectedXAxis || this.selectedYAxes.length === 0) {
      return;
    }

    let selectedColumns = this.columnConfigs.filter(c => c.isSelected).map(c => c.name);
    let filteredData;
    let yAxes;

    if (this.selectedChartType === 'candlestick') {
      // Generate OHLC data for dashboard (match dashboard format)
      const ohlcData = this.generateOHLCData(this.allData, this.selectedXAxis, this.selectedYAxes[0]);
      filteredData = ohlcData.map(item => ({
        date: item[0], // Always use 'date' as the key
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5]
      }));
      selectedColumns = ['date', 'open', 'high', 'low', 'close', 'volume'];
      // Always save all yAxes for candlestick
      yAxes = [
        { name: 'open', color: this.customColors['open'] || this.getRandomColor() },
        { name: 'high', color: this.customColors['high'] || this.getRandomColor() },
        { name: 'low', color: this.customColors['low'] || this.getRandomColor() },
        { name: 'close', color: this.customColors['close'] || this.getRandomColor() },
        { name: 'volume', color: this.customColors['volume'] || this.getRandomColor() }
      ];
    } else if (this.selectedChartType === 'pie' || this.selectedChartType === 'doughnut') {
      // Save pie/doughnut as array of { name, value } objects, grouped by label and aggregated by value
      const groupMap = new Map<string, number>();
      for (const row of this.allData) {
        const label = row[this.selectedXAxis];
        const value = Number(row[this.selectedAggregateColumn]) || 0;
        if (groupMap.has(label)) {
          groupMap.set(label, groupMap.get(label)! + value);
        } else {
          groupMap.set(label, value);
        }
      }
      filteredData = Array.from(groupMap.entries()).map(([name, value]) => ({ name, value }));
      selectedColumns = [this.selectedXAxis, this.selectedAggregateColumn];
      yAxes = [
        { name: this.selectedAggregateColumn, color: this.customColors[this.selectedAggregateColumn] || this.getRandomColor() }
      ];
    } else {
      filteredData = this.allData.map(row => {
        const filteredRow: any = {};
        selectedColumns.forEach(column => {
          filteredRow[column] = row[column];
        });
        return filteredRow;
      });
      yAxes = this.selectedYAxes.map(axis => ({
        name: axis,
        color: this.customColors[axis] || this.getRandomColor()
      }));
    }

    const chartId = 'chart-' + Date.now();
    const chartData = {
      id: chartId,
      type: this.selectedChartType,
      title: this.chartTitle,
      data: filteredData,
      xAxis: this.selectedChartType === 'candlestick' ? 'date' : this.selectedXAxis,
      yAxes: yAxes,
      headers: selectedColumns,
      sheetName: this.sheetsData[this.selectedSheetIndex]?.sheetName || 'Sheet1',
      customColors: this.customColors,
      dataSource: this.dataSourceInfo,
      isPlacedOnDashboard: false,
      createdAt: new Date().toISOString(),
      fullState: {
        allData: this.allData,
        columnConfigs: this.columnConfigs,
        selectedChartType: this.selectedChartType,
        selectedXAxis: this.selectedXAxis,
        selectedYAxes: this.selectedYAxes,
        chartTitle: this.chartTitle,
        customColors: this.customColors,
        headers: this.headers,
        sheetName: this.sheetsData[this.selectedSheetIndex]?.sheetName || '',
        dataSourceInfo: this.dataSourceInfo
      }
    };

    // Save chart config as a list in localStorage
    const existing = localStorage.getItem('savedChartConfigList');
    let chartList = [];
    if (existing) {
      try {
        chartList = JSON.parse(existing);
        if (!Array.isArray(chartList)) chartList = [];
      } catch {
        chartList = [];
      }
    }
    chartList.push(chartData);
    localStorage.setItem('savedChartConfigList', JSON.stringify(chartList));

    // Update sheet chart status after saving
    this.updateSheetChartStatus();

    // Close modal and show success toast
    this.closeChartModal();

    // Show success toast with chart details
    this.toastr.success(
      `<div class="toast-content">
        <div class="toast-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="toast-message">
          <div class="toast-title">Chart Saved Successfully</div>
          <div class="toast-text">"${this.chartTitle}" has been saved to your dashboard.</div>
        </div>
      </div>`,
      '',
      {
        timeOut: 4000,
        extendedTimeOut: 2000,
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

    // Show additional info toast with a slight delay
    setTimeout(() => {
      this.toastr.info(
        `<div class="toast-content">
          <div class="toast-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="toast-message">
            <div class="toast-title">Chart Details</div>
            <div class="toast-text">
              <div class="detail-item">
                <span class="detail-label">ID:</span>
                <span class="detail-value">${chartId}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${this.selectedChartType.charAt(0).toUpperCase() + this.selectedChartType.slice(1)} Chart</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>`,
        '',
        {
          timeOut: 5000,
          extendedTimeOut: 2000,
          closeButton: true,
          progressBar: true,
          enableHtml: true,
          positionClass: 'toast-top-right',
          toastClass: 'custom-toast info-toast',
          titleClass: 'toast-title',
          messageClass: 'toast-message',
          tapToDismiss: true,
          newestOnTop: true
        }
      );
    }, 1000);
  }

  private updateChartOptions(chartData: any): void {
    // Initialize ECharts options
    const options: any = {
      title: {
        text: chartData.title
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: chartData.yAxes.map((axis: any) => axis.name)
      },
      xAxis: {
        type: 'category',
        data: this.allData.map((row: any) => row[chartData.xAxis])
      },
      yAxis: {
        type: 'value'
      },
      series: chartData.yAxes.map((axis: any) => ({
        name: axis.name,
        type: chartData.type.toLowerCase(),
        data: this.allData.map((row: any) => row[axis.name]),
        itemStyle: {
          color: axis.color
        }
      }))
    };

    // Update chart instance with new options
    if (this.chart) {
      this.chart.setOption(options);
    }
  }

  toggleYAxisPanel() {
    this.isYAxisPanelOpen = !this.isYAxisPanelOpen;
  }

  public getChartIcon(chartType: string): string {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return 'fa-chart-bar';
      case 'line':
        return 'fa-chart-line';
      case 'pie':
        return 'fa-chart-pie';
      case 'scatter':
        return 'fa-chart-scatter';
      default:
        return 'fa-chart-bar';
    }
  }

  public deleteTemplate(): void {
    // Clear chart data and close modal
    this.selectedChartType = '';
    this.selectedXAxis = '';
    this.selectedYAxes = [];
    this.chartTitle = '';
    this.closeChartModal();
  }

  public saveDashboard(): void {
    // Save the current chart configuration
    const chartConfig = {
      type: this.selectedChartType,
      title: this.chartTitle,
      xAxis: this.selectedXAxis,
      yAxes: this.selectedYAxes,
      colors: this.customColors,
      dataSource: this.dataSourceInfo
    };

    // You can emit this configuration or save it to a service
    console.log('Saving chart configuration:', chartConfig);
    this.closeChartModal();
  }

  // Add method to handle data type change
  onDataTypeChange(header: string, newType: string): void {
    const config = this.columnConfigs.find(c => c.name === header);
    if (config) {
      config.type = newType;
    }

    // Convert all values in the column to the new type
    this.allData.forEach(row => {
      const value = row[header];
      if (value !== null && value !== undefined && value !== '') {
        switch (newType) {
          case 'DATE':
            let parsedDate = null;

            // Try parsing with moment in multiple formats
            const dateFormats = [
              'M/D/YY',
              'MM/DD/YY',
              'M/D/YYYY',
              'MM/DD/YYYY',
              'YYYY-MM-DD',
              'DD-MM-YYYY',
              'MM-DD-YYYY',
              'DD/MM/YYYY',
              'MM/DD/YYYY',
              'YYYY/MM/DD',
              'DD-MMM-YYYY',
              'DD MMM YYYY',
              'MMM DD, YYYY'
            ];

            // First try Excel date number
            if (typeof value === 'number' && value > 25569 && value < 47483) {
              const excelEpoch = new Date(1899, 11, 30);
              parsedDate = new Date(excelEpoch.getTime() + (value * 24 * 60 * 60 * 1000));
            } else {
              // Try each format
              for (const format of dateFormats) {
                const momentDate = moment(value, format, true);
                if (momentDate.isValid()) {
                  parsedDate = momentDate.toDate();
                  break;
                }
              }
            }

            // Format the date if valid
            row[header] = parsedDate ? moment(parsedDate).format('MM/DD/YY') : value;
            break;

          case 'INT':
            const cleanInt = String(value).replace(/,/g, '');
            const intVal = Math.floor(Number(cleanInt));
            row[header] = !isNaN(intVal) ? intVal.toString() : value;
            break;

          case 'FLOAT':
            const cleanFloat = String(value).replace(/,/g, '');
            const floatVal = parseFloat(cleanFloat);
            row[header] = !isNaN(floatVal) ? floatVal.toFixed(2) : value;
            break;

          case 'BOOLEAN':
            const strVal = String(value).toLowerCase().trim();
            if (['true', '1', 'yes', 'y', 't'].includes(strVal)) {
              row[header] = 'true';
            } else if (['false', '0', 'no', 'n', 'f'].includes(strVal)) {
              row[header] = 'false';
            }
            break;

          case 'STRING':
            row[header] = String(value);
            break;
        }
      }
    });

    this.loadPageData();
  }

  selectSheet(index: number) {
    this.selectedSheetIndex = index;
    this.initializeData(this.sheetsData[index]);
  }

  getSelectedHeaders(): string[] {
    return this.columnConfigs.filter(c => c.isSelected).map(c => c.name);
  }

  getPaginationSummary(): string {
    if (this.dataSummary.totalRows === 0) return 'No data to display';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.dataSummary.totalRows);
    return `Showing ${start}–${end} of ${this.dataSummary.totalRows} rows`;
  }

  // Add MA calculation function
  private calculateMA(dayCount: number, data: any[]): any[] {
    const result = [];
    for (let i = 0, len = data.length; i < len; i++) {
      if (i < dayCount - 1) {
        result.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < dayCount; j++) {
        sum += +data[i - j][1]; // Using close price (index 1)
      }
      result.push(+(sum / dayCount).toFixed(2));
    }
    return result;
  }

  // Update generateOHLCData to handle stock data format
  private generateOHLCData(data: RowData[], xAxis: string, yAxis: string): any[] {
    // Dummy implementation: create fake OHLC data from yAxis value
    return data.map((row, idx) => {
      const base = Number(row[yAxis]) || 100;
      const open = base + Math.random() * 5;
      const close = base - Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 2;
      const high = Math.max(open, close) + Math.random() * 2;
      const volume = Math.floor(Math.abs(base) * (1000 + Math.random() * 500));
      return [row[xAxis], open, close, low, high, volume];
    });
  }

  // Add new method to check sheet chart status
  private updateSheetChartStatus() {
    // Reset all sheet statuses to false initially
    this.sheetsData.forEach(sheet => {
      this.sheetChartStatus[sheet.sheetName || 'Sheet1'] = false;
    });

    // Get saved charts from localStorage
    const savedChartsStr = localStorage.getItem('savedChartConfigList');
    if (savedChartsStr) {
      try {
        const savedCharts = JSON.parse(savedChartsStr);
        if (Array.isArray(savedCharts)) {
          // For each saved chart, mark its sheet as having charts
          savedCharts.forEach(chart => {
            if (chart.sheetName && this.sheetChartStatus.hasOwnProperty(chart.sheetName)) {
              this.sheetChartStatus[chart.sheetName] = true;
            }
          });
        }
      } catch (error) {
        console.error('Error parsing saved charts:', error);
      }
    }
  }

  // Add method to check if sheet has charts
  hasSheetCharts(sheetName: string): boolean {
    return this.sheetChartStatus[sheetName || 'Sheet1'] || false;
  }

  // Add chart type helper methods
  getChartTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'line': 'fas fa-chart-line',
      'bar': 'fas fa-chart-bar',
      'pie': 'fas fa-chart-pie',
      'doughnut': 'fas fa-circle-notch',
      'scatter': 'fas fa-braille',
      'area': 'fas fa-chart-area',
      'candlestick': 'fas fa-chart-simple'
    };
    return icons[type] || '';
  }

  getChartTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'line': 'Line Chart',
      'bar': 'Bar Chart',
      'pie': 'Pie Chart',
      'doughnut': 'Doughnut Chart',
      'scatter': 'Scatter Chart',
      'area': 'Area Chart',
      'candlestick': 'Candlestick Chart'
    };
    return labels[type] || type;
  }

  selectChartType(type: string) {
    this.selectedChartType = type;
    this.onChartTypeChange();
  }

  // Add this method to handle aggregate checkbox change
  onAggregateChange() {
    this.updateChartData();
  }

  // Update chart data logic to support aggregation for pie/doughnut
  updateChartData() {
    let chartData = [];
    if ((this.selectedChartType === 'pie' || this.selectedChartType === 'doughnut') && this.selectedXAxis && this.selectedAggregateColumn) {
      // Aggregate data
      const groupMap = new Map<string, number>();
      for (const row of this.allData) {
        const xValue = row[this.selectedXAxis];
        const yValue = Number(row[this.selectedAggregateColumn]) || 0;
        if (groupMap.has(xValue)) {
          groupMap.set(xValue, groupMap.get(xValue)! + yValue);
        } else {
          groupMap.set(xValue, yValue);
        }
      }
      const chartData = Array.from(groupMap.entries()).map(([name, value]) => ({ name, value }));
      const series: PieSeriesOption[] = [{
        type: 'pie',
        radius: this.selectedChartType === 'doughnut' ? ['50%', '70%'] : '50%',
        center: ['50%', '50%'],
        data: chartData,
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 14,
          color: '#333'
        }
      }];
      const options: EChartsOption = {
        backgroundColor: '#fff',
        title: {
          text: this.chartTitle || 'Data Visualization',
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 20,
            fontWeight: 'bold' as const,
            color: '#3d3185'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          data: chartData.map(d => d.name),
          orient: 'vertical',
          left: 'left',
          top: 'center'
        },
        series
      };
      if (this.chart) {
        this.chart.setOption(options, true);
        this.chart.resize();
      }
      return;
    } else {
      // Non-aggregate logic (original or fallback)
      // You may want to use your existing chart data logic here
      chartData = this.previewData.map(row => {
        return {
          label: row[this.selectedXAxis],
          value: this.selectedYAxes.reduce((sum, y) => sum + (Number(row[y]) || 0), 0)
        };
      });
    }
    // Call your chart rendering logic here
    this.generateChartWithData(chartData);
  }

  // Helper to render chart with given data (implement as needed)
  generateChartWithData(chartData: any[]) {
    // You can adapt this to your charting library
    // For example, call this.updateChartOptions(chartData) if using ECharts
    this.updateChartOptions(chartData);
  }

  // Helper: Only non-numeric columns for label
  getCategoryHeaders(): string[] {
    return this.headers.filter(h => {
      const type = this.getColumnType(h);
      return type === 'STRING' || type === 'DATE';
    });
  }

  // Helper: Only numeric columns for aggregate
  getNumericHeaders(): string[] {
    return this.headers.filter(h => {
      const type = this.getColumnType(h);
      return type === 'INT' || type === 'FLOAT';
    });
  }

  // Helper: Only date columns for candlestick X-axis
  getCandlestickXAxisHeaders(): string[] {
    // Use this in your template to restrict X-axis selection for candlestick chart
    return this.headers.filter(h => this.getColumnType(h) === 'DATE');
  }

  // Add method to delete a chart and update sheet status
  public deleteChart(chartId: string): void {
    const savedChartsStr = localStorage.getItem('savedChartConfigList');
    if (savedChartsStr) {
      try {
        let chartList = JSON.parse(savedChartsStr);
        if (Array.isArray(chartList)) {
          // Remove the chart with matching ID
          chartList = chartList.filter(chart => chart.id !== chartId);
          // Save updated list
          localStorage.setItem('savedChartConfigList', JSON.stringify(chartList));
          // Update sheet status
          this.updateSheetChartStatus();

          // Show success toast
          this.toastr.success('Chart deleted successfully', '', {
            timeOut: 3000,
            positionClass: 'toast-top-right'
          });
        }
      } catch (error) {
        console.error('Error deleting chart:', error);
        this.toastr.error('Error deleting chart', '', {
          timeOut: 3000,
          positionClass: 'toast-top-right'
        });
      }
    }
  }

  // Add pivot table generation method
  private generatePivotTable() {
    if (!this.pivotConfig.rows.length || !this.pivotConfig.columns.length || !this.pivotConfig.values.length) {
      return;
    }

    // Create pivot data structure
    const pivotData = new Map<string, Map<string, { [value: string]: number }>>();
    const rowKeysSet = new Set<string>();
    const colKeysSet = new Set<string>();

    // Process data
    this.allData.forEach(row => {
      const rowKey = this.pivotConfig.rows.map(r => row[r]).join('|');
      const colKey = this.pivotConfig.columns.map(c => row[c]).join('|');
      rowKeysSet.add(rowKey);
      colKeysSet.add(colKey);
      if (!pivotData.has(rowKey)) {
        pivotData.set(rowKey, new Map<string, { [value: string]: number }>());
      }
      const colMap = pivotData.get(rowKey)!;
      if (!colMap.has(colKey)) {
        colMap.set(colKey, {});
      }
      const valueMap = colMap.get(colKey)!;
      this.pivotConfig.values.forEach(valueCol => {
        let value = row[valueCol];
        value = Number(value ?? 0);
        valueMap[valueCol] = typeof valueMap[valueCol] === 'number' ? valueMap[valueCol] + value : value;
      });
    });

    // Prepare unique columns for header
    const uniqueColumns: string[] = [];
    const colKeyArr = Array.from(colKeysSet);
    this.pivotConfig.values.forEach(valueCol => {
      colKeyArr.forEach(colKey => {
        uniqueColumns.push(`${colKey}|||${valueCol}`);
      });
    });

    // Prepare table data
    const tableData: any[] = [];
    let grandTotals: { [key: string]: number } = {};
    let rowGrandTotals: number[] = [];
    let colGrandTotals: { [key: string]: number } = {};

    Array.from(rowKeysSet).forEach(rowKey => {
      const rowData: any = {};
      const rowValues = rowKey.split('|');
      // Add row headers
      this.pivotConfig.rows.forEach((header, index) => {
        rowData[header] = rowValues[index];
      });
      let rowTotal = 0;
      uniqueColumns.forEach(colCombo => {
        const [colKey, valueCol] = colCombo.split('|||');
        const value = Number(pivotData.get(rowKey)?.get(colKey)?.[valueCol] ?? 0);
        rowData[colCombo] = value;
        rowTotal += value;
        // Column grand total
        colGrandTotals[colCombo] = (colGrandTotals[colCombo] || 0) + value;
      });
      rowData['__rowTotal'] = rowTotal;
      tableData.push(rowData);
    });

    // Calculate grand total for all columns
    let grandTotal = 0;
    Object.values(colGrandTotals).forEach(val => (grandTotal += val));

    // Create table HTML
    const tableHtml = `
      <table class="table table-bordered table-hover pivot-table-compact">
        <thead>
          <tr>
            ${this.pivotConfig.rows.map(r => `<th class='sticky-col'>${r}</th>`).join('')}
            ${uniqueColumns
              .map(c => {
                const [colKey, valueCol] = c.split('|||');
                return `<th>${colKey ? colKey + ' - ' : ''}${valueCol}</th>`;
              })
              .join('')}
            <th class='sticky-col'>Grand Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableData
            .map(
              row => `
              <tr>
                ${this.pivotConfig.rows.map(r => `<td class='sticky-col'>${row[r]}</td>`).join('')}
                ${uniqueColumns.map(c => `<td>${row[c] || 0}</td>`).join('')}
                <td class='sticky-col'>${row['__rowTotal']}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <th class='sticky-col'>Grand Total</th>
            ${uniqueColumns.map(c => `<th>${colGrandTotals[c] || 0}</th>`).join('')}
            <th class='sticky-col'>${grandTotal}</th>
          </tr>
        </tfoot>
      </table>
    `;

    // Update chart container with pivot table
    if (this.chartCanvas) {
      this.chartCanvas.nativeElement.innerHTML = tableHtml;
    }
  }
}
