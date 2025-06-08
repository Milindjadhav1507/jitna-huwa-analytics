import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngFor, *ngIf, etc.
import { FormsModule, ReactiveFormsModule } from '@angular/forms';   // Import FormsModule for ngModel
import { NgbModal, NgbModalRef, NgbModule, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import { Router, RouterLink } from '@angular/router';
import moment from 'moment';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Category {
  name: string;
  isDivider?: boolean; // Optional flag for the horizontal rule
}

interface ImportSource {
  name: string;
  iconType: 'bi' | 'img' | 'custom'; // Type of icon
  iconValue: string; // Class for bi, URL for img, text for custom
  customClass?: string; // Specific class for custom styled icons (like local drive/feeds)
  type: 'file' | 'cloud' | 'database';
  sourceType?: string;
}

interface ImportForm {
  workspaceName: string;
  description: string;
  fileType?: string;
  file?: File | null;
  dataSourceName: string;
  storageType?: string;
  selectedSheet?: string;
  // Database fields
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  databaseName?: string;
  connectionUrl?: string;  // Added connection URL field
}

interface ExcelRow {
  [key: string]: string | number;
}

interface ColumnConfig {
  name: string;
  originalName: string;
  dataType: string;
  type: string;
  isSelected: boolean;
  isEditing: boolean;
}

interface DatabaseConfig {
  label: string;
  fields: {
    host: boolean;
    port: boolean;
    username: boolean;
    password: boolean;
    databaseName: boolean;
    connectionUrl: boolean;  // Added connection URL field
  };
  defaultPort?: string;
}

interface Workspace {
  id: number;
  name: string;
  description: string;
  createdDate: Date;
  status: 'active' | 'archived' | 'draft';
  members: number;
  lastModified: Date;
}

@Component({
  selector: 'app-import-data',
  imports: [
    CommonModule,RouterLink,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    DragDropModule,
    MatGridListModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  standalone: true, // Modern Angular uses standalone components
  templateUrl: './import-data.component.html',
  styleUrl: './import-data.component.scss'
})
export class ImportDataComponent {
  @ViewChild('newWorkspaceModal') newWorkspaceModal: any;
  @ViewChild('importModal') importModal: any;
  @ViewChild('chartCanvas', { static: false }) chartCanvas: any;

  // Add Esarwa form property
  esarwaForm = {
    apiKey: '',
    token: ''
  };

  // Add chart property
  private chart: any = null;

  searchTerm: string = '';
  activeCategory: string = 'Most Popular'; // Track active category
  selectedSource: string = ''; // Track selected source card
  modalRef: NgbModalRef | null = null;
  importForm: ImportForm = {
    workspaceName: '',
    description: '',
    dataSourceName: '',
    fileType: 'xlsx'
  };
  fileTypes = ['json', 'xml', 'excel', 'xlsx', 'csv', 'text', 'html', 'others'];
  storageTypes: string[] = [];
  uploadedFileName: string = '';
  csvData: any[] = [];
  csvHeaders: string[] = [];
  columnConfigs: ColumnConfig[] = [];
  showTable: boolean = false;
  protected readonly Object = Object; // Add this line to fix Object property error

  // Workspace related properties
  workspaces: string[] = [];
  newWorkspace: Workspace = {
    id: 0,
    name: '',
    description: '',
    createdDate: new Date(),
    status: 'active',
    members: 0,
    lastModified: new Date()
  };

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

  // Database configurations
  databaseConfigs: { [key: string]: DatabaseConfig } = {
    'MSSQL': {
      label: 'Microsoft SQL Server',
      fields: {
        host: true,
        port: true,
        username: true,
        password: true,
        databaseName: true,
        connectionUrl: true
      },
      defaultPort: '1433'
    },
    'MySQL': {
      label: 'MySQL Database',
      fields: {
        host: true,
        port: true,
        username: true,
        password: true,
        databaseName: true,
        connectionUrl: true
      },
      defaultPort: '3306'
    },
    'PostgreSQL': {
      label: 'PostgreSQL Database',
      fields: {
        host: true,
        port: true,
        username: true,
        password: true,
        databaseName: true,
        connectionUrl: true
      },
      defaultPort: '5432'
    }
  };

  categories: Category[] = [
    { name: 'All' },
    { name: 'Most Popular' },
    { name: 'Recently Added' },
    { name: '', isDivider: true }, // Represents the <hr>
    // { name: 'Files & Feeds' },
    // { name: 'Cloud Storage/Drive' },
    // { name: 'Databases & Datalakes' },
    // { name: 'Streaming Data' },
    // { name: 'Zoho Apps' },
    // { name: 'Sales/CRM' },
    // { name: 'Marketing' },
    // { name: 'Finance' },
    // { name: 'Human Resources' },
    // { name: 'IT & Help Desk' },
    // { name: 'ERP' },
    // { name: 'Project Management' },
    // { name: 'E-Commerce' },
    // { name: 'Social Media' },
    // { name: 'Survey/Forms' },
    // { name: 'Custom Solutions' },
  ];

  // Group sources by row for easier layout in HTML if needed,
  // or keep as a flat list and let CSS/HTML handle wrapping.
  // Let's use a flat list for simplicity with *ngFor and rely on Bootstrap columns.
  // Let's use a flat list for simplicity with *ngFor and rely on Bootstrap columns.
  importSources: ImportSource[] = [
    {
      name: 'Esarwa',
      iconType: 'img',
      iconValue: 'assets/images/logo/esarwa.ico',
      customClass: 'icon-local-drive rounded-circle',
      type: 'file'
    },
    {
      name: 'Local Drive',
      iconType: 'img',
      iconValue: 'assets/images/logo/localdrive.png',
      customClass: 'icon-local-drive rounded-circle',
      type: 'file'
    },
    {
      name: 'Google Drive',
      iconType: 'img',
      iconValue: 'assets/images/logo/google drive.png',
      type: 'cloud',
      sourceType: 'google-drive'
    },
    {
      name: 'OneDrive',
      iconType: 'img',
      iconValue: 'assets/images/logo/onedrive.png',
      type: 'cloud',
      sourceType: 'onedrive'
    },
    {
      name: 'Dropbox',
      iconType: 'img',
      iconValue: 'assets/images/logo/dropbox.png',
      type: 'cloud',
      sourceType: 'dropbox'
    },
    {
      name: 'MSSQL',
      iconType: 'img',
      iconValue: 'assets/images/logo/mssql.png',
      type: 'database',
      sourceType: 'MSSQL'
    },
    {
      name: 'MySQL',
      iconType: 'img',
      iconValue: 'assets/images/logo/Mysql_logo.png',
      type: 'database',
      sourceType: 'MySQL'
    },
    {
      name: 'PostgreSQL',
      iconType: 'img',
      iconValue: 'assets/images/logo/postgresql-icon.png',
      type: 'database',
      sourceType: 'PostgreSQL'
    }
  ];

  // Grid layout properties
  gridColumns = 3;
  gridRowHeight = '200px';
  gridGutterSize = '16px';
  gridItems: any[] = [];

  // Chart resize properties
  isResizing = false;
  resizeDirection: 'horizontal' | 'vertical' | 'both' | null = null;
  startX = 0;
  startY = 0;
  startWidth = 0;
  startHeight = 0;
  chartContainer: HTMLElement | null = null;

  // Add dashboard items
  dashboardItems = [
    {
      id: 1,
      title: 'Net Sales',
      content: 'Sales performance metrics',
      width: 'calc(25% - 12px)',
      height: '200px',
      position: { row: 1, col: 1 }
    },
    {
      id: 2,
      title: 'Orders',
      content: 'Order tracking and metrics',
      width: 'calc(25% - 12px)',
      height: '200px',
      position: { row: 1, col: 2 }
    },
    {
      id: 3,
      title: 'Active Customers',
      content: 'Customer activity metrics',
      width: 'calc(25% - 12px)',
      height: '200px',
      position: { row: 1, col: 3 }
    },
    {
      id: 4,
      title: 'Gross Profit Margin',
      content: 'Profitability metrics',
      width: 'calc(25% - 12px)',
      height: '200px',
      position: { row: 1, col: 4 }
    },
    {
      id: 5,
      title: 'Revenue Trend',
      content: 'Revenue analysis over time',
      width: 'calc(70% - 8px)',
      height: '400px',
      position: { row: 2, col: 1 }
    },
    {
      id: 6,
      title: 'Net Sales Breakdown',
      content: 'Detailed sales analysis',
      width: 'calc(30% - 8px)',
      height: '400px',
      position: { row: 2, col: 2 }
    }
  ];

  private resizeGuide: HTMLElement | null = null;
  private resizeOverlay: HTMLElement | null = null;
  private aspectRatio: number = 1;
  editingColumn: string | null = null;
  editingColumnName: string = '';
  editingOriginalHeader: string | null = null;

  // Add new properties for sheet handling
  availableSheets: string[] = [];
  selectedSheet: string = '';

  // Store all sheets' data for preview
  sheetData: { [sheetName: string]: { headers: string[], data: any[] } } = {};
  selectedSheets: string[] = [];

  // Store column configs for each sheet
  columnConfigsBySheet: { [sheetName: string]: ColumnConfig[] } = {};

  expandedSheets: { [sheetName: string]: boolean } = {};

  fileSizeError: string = '';

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.loadWorkspaces();
  }

  ngOnInit() {
    // Check if we're in edit mode
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { data: any, isEdit: boolean, source: any };

    if (state?.isEdit && state.data && state.source) {
      // Pre-fill the form with existing data
      this.importForm = {
        workspaceName: state.data.workspaceName,
        description: state.data.description,
        dataSourceName: state.data.dataSourceName,
        fileType: state.data.fileType || 'xlsx'
      };

      // Set the existing data
      this.csvHeaders = state.data.headers;
      this.csvData = state.data.data;
      this.columnConfigs = state.data.columnConfigs;
      this.showTable = true;

      // Open the import modal with Local Drive source
      setTimeout(() => {
        this.openImportModal(this.importModal, state.source);
      }, 0);
    }
  }

  loadWorkspaces() {
    // Load workspaces from localStorage
    const savedWorkspaces = localStorage.getItem('workspaces');
    if (savedWorkspaces) {
      const workspaceList = JSON.parse(savedWorkspaces);
      this.workspaces = workspaceList.map((w: Workspace) => w.name);
    }
  }

  onWorkspaceSelect(workspace: string) {
    if (workspace === 'new') {
      this.openNewWorkspaceModal(this.newWorkspaceModal);
    } else {
      this.importForm.workspaceName = workspace;
    }
  }

  openNewWorkspaceModal(content: any) {
    this.modalService.open(content, {
      ariaLabelledBy: 'new-workspace-title',
      centered: true
    });
  }

  createNewWorkspace(modal: any) {
    if (this.newWorkspace.name.trim()) {
      // Create workspace object
      const workspaceObj: Workspace = {
        id: Date.now(),
        name: this.newWorkspace.name,
        description: this.newWorkspace.description,
        createdDate: new Date(),
        status: 'active',
        members: 0,
        lastModified: new Date()
      };

      // Store in localStorage
      const existingWorkspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
      existingWorkspaces.push(workspaceObj);
      localStorage.setItem('workspaces', JSON.stringify(existingWorkspaces));

      // Update local workspaces list
      this.workspaces.push(workspaceObj.name);

      // Set as selected workspace
      this.importForm.workspaceName = workspaceObj.name;

      // Reset form and close modal
      this.newWorkspace = {
        id: 0,
        name: '',
        description: '',
        createdDate: new Date(),
        status: 'active',
        members: 0,
        lastModified: new Date()
      };

      modal.close();
    }
  }

  // Method to change the active category
  selectCategory(categoryName: string): void {
    this.activeCategory = categoryName;
    // In a real app, you would likely filter the importSources based on the category here
    console.log('Selected category:', categoryName);
  }

  // Method to change the selected source card
  selectSource(sourceName: string): void {
    this.selectedSource = sourceName;
    console.log('Selected source:', sourceName);
  }

  // Placeholder for search functionality
  performSearch(): void {
    console.log('Searching for:', this.searchTerm);
    // Implement search/filter logic here
  }

  openImportModal(content: any, source: ImportSource): void {
    this.selectedSource = source.name;
    this.resetForm();

    // Set up form based on source type
    if (source.type === 'cloud') {
      this.storageTypes = this.importSources
        .filter(s => s.type === 'cloud')
        .map(s => s.name);
    } else if (source.type === 'database' && source.sourceType) {
      const dbConfig = this.databaseConfigs[source.sourceType];
      if (dbConfig) {
        this.importForm.port = dbConfig.defaultPort;
      }
    }

    // Use extra large modal for Local Drive
    const modalOptions: NgbModalOptions = (source.name === 'Local Drive' || source.name === 'Esarwa') ? {
      size: 'xl',
      scrollable: true,
      backdrop: 'static' as const,
      keyboard: false,
      windowClass: 'extra-large-modal',
      centered: true,
      modalDialogClass: 'modal-dialog-centered modal-dialog-scrollable modal-xl'
    } : {
      size: 'lg',
      scrollable: true
    };

    this.modalRef = this.modalService.open(content, modalOptions);
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.resetForm();
    }
  }

  resetForm(): void {
    this.importForm = {
      workspaceName: '',
      description: '',
      dataSourceName: '',
      fileType: 'xlsx',
      selectedSheet: ''
    };
    this.uploadedFileName = '';
    this.csvData = [];
    this.csvHeaders = [];
    this.columnConfigs = [];
    this.showTable = false;
    this.availableSheets = [];
    this.selectedSheet = '';
    this.sheetData = {};
    this.selectedSheets = [];
    this.columnConfigsBySheet = {};
  }

  getSelectedSourceType(): 'file' | 'cloud' | 'database' | undefined {
    const source = this.importSources.find(s => s.name === this.selectedSource);
    return source?.type;
  }

  getSelectedSourceConfig(): DatabaseConfig | undefined {
    const source = this.importSources.find(s => s.name === this.selectedSource);
    if (source?.type === 'database' && source.sourceType) {
      return this.databaseConfigs[source.sourceType];
    }
    return undefined;
  }

  authenticateCloudStorage(): void {
    // Implement cloud storage authentication
    this.toastr.info(
      `<div class="toast-content">
        <div class="toast-icon">
          <i class="fas fa-cloud"></i>
        </div>
        <div class="toast-message">
          <div class="toast-title">Authentication Required</div>
          <div class="toast-text">Authenticating with ${this.selectedSource}...</div>
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
        toastClass: 'custom-toast info-toast',
        titleClass: 'toast-title',
        messageClass: 'toast-message',
        tapToDismiss: true,
        newestOnTop: true
      }
    );
  }

  connectToDatabase(): void {
    // Implement database connection
    this.toastr.info(
      `<div class="toast-content">
        <div class="toast-icon">
          <i class="fas fa-database"></i>
        </div>
        <div class="toast-message">
          <div class="toast-title">Database Connection</div>
          <div class="toast-text">Connecting to ${this.selectedSource}...</div>
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
        toastClass: 'custom-toast info-toast',
        titleClass: 'toast-title',
        messageClass: 'toast-message',
        tapToDismiss: true,
        newestOnTop: true
      }
    );
    console.log('Database connection details:', this.importForm);
  }

  getFileAcceptString(fileType: string | undefined): string {
    if (!fileType) return '*';

    switch (fileType.toLowerCase()) {
      case 'excel':
        return '.xls,.xlsx';
      case 'xlsx':
        return '.xlsx';
      case 'csv':
        return '.csv';
      case 'json':
        return '.json';
      case 'xml':
        return '.xml';
      case 'text':
        return '.txt';
      case 'html':
        return '.html,.htm';
      default:
        return '*';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // XLSX/XLS file size restriction for demo account
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if ((fileExtension === 'xlsx' || fileExtension === 'xls') && file.size > 2097152) {
      this.fileSizeError = 'Demo account does not allow uploading files larger than 2MB.';
      event.target.value = '';
      this.toastr.error(
        `<div class="toast-content">
          <div class="toast-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="toast-message">
            <div class="toast-title">File Size Error</div>
            <div class="toast-text">Demo account does not allow uploading files larger than 2MB.</div>
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
          toastClass: 'custom-toast error-toast',
          titleClass: 'toast-title',
          messageClass: 'toast-message',
          tapToDismiss: true,
          newestOnTop: true
        }
      );
      return;
    } else {
      this.fileSizeError = '';
    }

    const selectedFileType = this.importForm.fileType?.toLowerCase();

    // Check if file type matches
    const isValidFile = selectedFileType === 'others' ||
                       selectedFileType === 'excel' && (fileExtension === 'xlsx' || fileExtension === 'xls') ||
                       fileExtension === selectedFileType;

    if (isValidFile) {
      this.importForm.file = file;
      this.uploadedFileName = file.name;

      // Automatically read Excel files
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        this.readFile(file, fileExtension);
      }
    } else {
      this.toastr.error(
        `<div class="toast-content">
          <div class="toast-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="toast-message">
            <div class="toast-title">Invalid File Type</div>
            <div class="toast-text">Please select a valid ${selectedFileType} file.</div>
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
          toastClass: 'custom-toast error-toast',
          titleClass: 'toast-title',
          messageClass: 'toast-message',
          tapToDismiss: true,
          newestOnTop: true
        }
      );
      event.target.value = '';
    }
  }

  readFile(file: File, fileType: string): void {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      const data = e.target.result;
      if (fileType === 'xlsx' || fileType === 'xls') {
        this.parseExcel(data);
      }
      this.showTable = true;
    };

    reader.readAsBinaryString(file);
  }

  private parseExcel(data: string): void {
    try {
      const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
      this.availableSheets = workbook.SheetNames;
      this.sheetData = {};
      this.selectedSheets = [...this.availableSheets]; // default: all selected
      this.columnConfigsBySheet = {};

      this.availableSheets.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
          raw: false,
          dateNF: 'YYYY-MM-DD'
        });
        if (jsonData.length === 0) return;
        const headers = (jsonData[0] || []).map(header => String(header || '').trim());
        const dataRows = jsonData.slice(1).map(row => {
          const rowData: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] !== undefined ? String(row[index]).trim() : '';
          });
          return rowData;
        }).filter(row => Object.values(row).some(value => value !== ''));
        this.sheetData[sheetName] = { headers, data: dataRows };
        // Initialize column configs for this sheet
        this.columnConfigsBySheet[sheetName] = headers.map(header => {
          const detectedType = this.detectColumnTypeForSheet(sheetName, header, dataRows);
          return {
            name: header,
            originalName: header,
            dataType: detectedType,
            type: detectedType,
            isSelected: true,
            isEditing: false
          };
        });
      });

      // For backward compatibility, set csvHeaders/csvData to the first sheet
      if (this.availableSheets.length > 0) {
        const first = this.availableSheets[0];
        this.csvHeaders = this.sheetData[first]?.headers || [];
        this.csvData = this.sheetData[first]?.data || [];
        this.columnConfigs = this.columnConfigsBySheet[first] || [];
      }
      this.showTable = true;
      this.toastr.success(
        `<div class="toast-content">
          <div class="toast-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="toast-message">
            <div class="toast-title">Success</div>
            <div class="toast-text">Excel data loaded successfully!</div>
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
    } catch (error) {
      console.error('Error parsing Excel:', error);
      this.toastr.error(
        `<div class="toast-content">
          <div class="toast-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="toast-message">
            <div class="toast-title">Error</div>
            <div class="toast-text">Error parsing Excel file. Please check the file format.</div>
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
          toastClass: 'custom-toast error-toast',
          titleClass: 'toast-title',
          messageClass: 'toast-message',
          tapToDismiss: true,
          newestOnTop: true
        }
      );
      this.csvData = [];
      this.csvHeaders = [];
      this.sheetData = {};
      this.columnConfigsBySheet = {};
      this.showTable = false;
    }
  }

  // Detect column type for a specific sheet
  private detectColumnTypeForSheet(sheet: string, header: string, dataRows: any[]): string {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('date') || headerLower.includes('created') || headerLower.includes('modified') || headerLower.includes('time')) {
      return 'DATE';
    }
    if (headerLower.includes('price') || headerLower.includes('amount') || headerLower.includes('cost') || headerLower.includes('rate') || ['close', 'open', 'high', 'low'].includes(headerLower)) {
      return 'FLOAT';
    }
    if (headerLower.includes('id') || headerLower.includes('count') || headerLower.includes('quantity') || headerLower.includes('number') || headerLower.includes('volume')) {
      return 'INT';
    }
    if (headerLower.includes('is') || headerLower.includes('has') || headerLower.includes('active') || headerLower.includes('enabled')) {
      return 'BOOLEAN';
    }
    const values = dataRows.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    if (values.length === 0) return 'STRING';
    const isAllDates = values.every(val => {
      if (typeof val === 'number' && val > 25569 && val < 47483) return true;
      return moment(val, [
        'M/D/YY','MM/DD/YY','M/D/YYYY','MM/DD/YYYY','YYYY-MM-DD','DD-MM-YYYY','MM-DD-YYYY','DD/MM/YYYY','MM/DD/YYYY','YYYY/MM/DD'
      ], true).isValid();
    });
    if (isAllDates) return 'DATE';
    const isAllIntegers = values.every(val => {
      const cleanNum = String(val).replace(/,/g, '');
      const num = Number(cleanNum);
      return !isNaN(num) && Number.isInteger(num);
    });
    if (isAllIntegers) return 'INT';
    const isAllNumbers = values.every(val => {
      const cleanNum = String(val).replace(/,/g, '');
      return !isNaN(Number(cleanNum));
    });
    if (isAllNumbers) return 'FLOAT';
    const booleanValues = ['true', 'false', '0', '1', 'yes', 'no'];
    const isAllBooleans = values.every(val => booleanValues.includes(String(val).toLowerCase()));
    if (isAllBooleans) return 'BOOLEAN';
    return 'STRING';
  }

  // Per-sheet column selection toggle
  toggleColumnSelectionForSheet(sheet: string, header: string): void {
    const config = this.columnConfigsBySheet[sheet]?.find(c => c.name === header);
    if (config) config.isSelected = !config.isSelected;
  }

  isColumnSelectedForSheet(sheet: string, header: string): boolean {
    const config = this.columnConfigsBySheet[sheet]?.find(c => c.name === header);
    return config ? config.isSelected : true;
  }

  // Per-sheet data type change
  onDataTypeChangeForSheet(sheet: string, header: string, newType: string): void {
    const config = this.columnConfigsBySheet[sheet]?.find(c => c.name === header);
    if (config) config.type = newType;
    // Optionally, convert data in sheetData[sheet].data for this column
  }

  // Per-sheet column editing
  startEditingColumnForSheet(sheet: string, header: string) {
    const config = this.columnConfigsBySheet[sheet]?.find(c => c.name === header);
    if (config) {
      config.isEditing = true;
      this.editingColumn = header;
      this.editingColumnName = header;
      this.editingOriginalHeader = header;
    }
  }

  stopEditingColumnForSheet(sheet: string, header: string, shouldSave: boolean) {
    const configs = this.columnConfigsBySheet[sheet];
    const originalHeader = this.editingOriginalHeader || header;
    if (configs) {
      const config = configs.find(c => c.name === originalHeader);
      if (shouldSave && config && this.editingColumnName && this.editingColumnName !== originalHeader) {
        // Update column name in all data
        this.sheetData[sheet].data.forEach(row => {
          row[this.editingColumnName] = row[originalHeader];
          delete row[originalHeader];
        });
        // Update headers and configs
        const index = this.sheetData[sheet].headers.indexOf(originalHeader);
        if (index !== -1) {
          this.sheetData[sheet].headers[index] = this.editingColumnName;
        }
        config.name = this.editingColumnName;
        config.originalName = this.editingColumnName;
      }
      if (config) config.isEditing = false;
      this.editingColumn = null;
      this.editingColumnName = '';
      this.editingOriginalHeader = null;
    }
  }

  isEditingColumnForSheet(sheet: string, header: string): boolean {
    const config = this.columnConfigsBySheet[sheet]?.find(c => c.name === header);
    return config ? config.isEditing : false;
  }

  getColumnTypeForSheet(sheet: string, header: string): string {
    const config = this.columnConfigsBySheet[sheet]?.find(c => c.name === header);
    return config ? config.type : 'STRING';
  }

  // Grid item methods
  addGridItem(): void {
    const newItem = {
      id: Date.now(),
      title: `Item ${this.gridItems.length + 1}`,
      content: 'Drag or resize me',
      width: '100%',
      height: '200px'
    };
    this.gridItems.push(newItem);
    this.recalculateGrid();
  }

  removeGridItem(index: number): void {
    this.gridItems.splice(index, 1);
    this.recalculateGrid();
  }

  // Chart resize methods
  startResize(event: MouseEvent, direction: 'horizontal' | 'vertical' | 'both'): void {
    this.isResizing = true;
    this.resizeDirection = direction;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.chartContainer = event.target as HTMLElement;
    this.startWidth = this.chartContainer.offsetWidth;
    this.startHeight = this.chartContainer.offsetHeight;

    // Prevent text selection during resize
    event.preventDefault();
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.stopResize);
  }

  onResize = (event: MouseEvent): void => {
    if (!this.isResizing || !this.chartContainer) return;

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    if (this.resizeDirection === 'horizontal' || this.resizeDirection === 'both') {
      const newWidth = Math.max(200, this.startWidth + deltaX);
      this.chartContainer.style.width = `${newWidth}px`;
    }

    if (this.resizeDirection === 'vertical' || this.resizeDirection === 'both') {
      const newHeight = Math.max(200, this.startHeight + deltaY);
      this.chartContainer.style.height = `${newHeight}px`;
    }

    // Resize the chart if it exists
    if (this.chart) {
      this.chart.resize();
    }
  }

  stopResize = (): void => {
    this.isResizing = false;
    this.resizeDirection = null;
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.stopResize);
  }

  // Add this method to initialize the chart
  private initializeChart(): void {
    if (this.chartCanvas) {
      // Initialize your chart here
      // Example: this.chart = new Chart(this.chartCanvas.nativeElement, {...});
    }
  }

  // Update the grid items initialization
  initializeGridItems(): void {
    this.gridItems = [
      { id: 1, title: 'Item 1', content: 'Drag or resize me', width: '100%', height: '200px' },
      { id: 2, title: 'Item 2', content: 'Drag or resize me', width: '100%', height: '200px' },
      { id: 3, title: 'Item 3', content: 'Drag or resize me', width: '100%', height: '200px' },
      { id: 4, title: 'Item 4', content: 'Drag or resize me', width: '100%', height: '200px' },
      { id: 5, title: 'Item 5', content: 'Drag or resize me', width: '100%', height: '200px' },
      { id: 6, title: 'Item 6', content: 'Drag or resize me', width: '100%', height: '200px' }
    ];
  }

  // Update the resize method to handle auto-adjusting
  onGridItemResize(event: MouseEvent, item: any, direction: 'horizontal' | 'vertical' | 'both'): void {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = parseFloat(item.width);
    const startHeight = parseFloat(item.height);
    const minWidth = 200;
    const minHeight = 200;

    const onMouseMove = (e: MouseEvent) => {
      if (direction === 'horizontal' || direction === 'both') {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(minWidth, startWidth + deltaX);
        item.width = `${newWidth}px`;
      }

      if (direction === 'vertical' || direction === 'both') {
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(minHeight, startHeight + deltaY);
        item.height = `${newHeight}px`;
      }

      // Force grid layout recalculation
      this.recalculateGrid();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Update the recalculateGrid method with proper typing
  private recalculateGrid(): void {
    requestAnimationFrame(() => {
      const container = document.querySelector('.grid-container') as HTMLElement;
      if (container) {
        container.classList.remove('grid-container');
        // Force reflow
        container.getBoundingClientRect();
        container.classList.add('grid-container');
      }
    });
  }

  // Update the drop method
  onGridItemDrop(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.gridItems, event.previousIndex, event.currentIndex);
    // Recalculate grid after drop
    this.recalculateGrid();
  }

  // Add method to handle sheet selection
  onSheetChange(sheetName: string): void {
    this.selectedSheet = sheetName;
    if (this.importForm.file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.parseExcel(e.target.result);
      };
      reader.readAsBinaryString(this.importForm.file);
    }
  }

  toggleSheetSelection(sheet: string, checked: boolean) {
    if (checked) {
      if (!this.selectedSheets.includes(sheet)) {
        this.selectedSheets = [...this.selectedSheets, sheet];
      }
    } else {
      this.selectedSheets = this.selectedSheets.filter(s => s !== sheet);
    }
  }

  analyzeAndReadData(): void {
    // Prepare an array to hold the processed data for each selected sheet
    const processedSheets = this.selectedSheets.map(sheetName => {
      const sheet = this.sheetData[sheetName];
      const columnConfigs = this.columnConfigsBySheet[sheetName] || [];
      // Only include selected columns
      const selectedHeaders = sheet.headers.filter(header => {
        const config = columnConfigs.find(c => c.name === header);
        return config?.isSelected;
      });
      // Prepare data with only selected columns
      const selectedData = sheet.data.map(row => {
        const filteredRow: any = {};
        selectedHeaders.forEach(header => {
          filteredRow[header] = row[header];
        });
        return filteredRow;
      });
      // Prepare column config for selected columns
      const selectedColumnConfigs = columnConfigs.filter(c => c.isSelected);

      return {
        sheetName,
        headers: selectedHeaders,
        data: selectedData,
        columnConfigs: selectedColumnConfigs
      };
    });

    // Save to localStorage
    localStorage.setItem('importedSheetsData', JSON.stringify(processedSheets));
    // this.toastr.success('Data analyzed and saved successfully!');

    // Close the modal
    if (this.modalRef) {
      this.modalRef.close();
      this.resetForm(); // Reset form after closing
    }
  }

  toggleSheetExpand(sheet: string): void {
    this.expandedSheets[sheet] = !this.expandedSheets[sheet];
  }

  // Add connectEsarwa method
  connectEsarwa(): void {
    if (!this.esarwaForm.apiKey || !this.esarwaForm.token) {
      this.toastr.error('Please enter both API Key and Token');
      return;
    }

    // Here you would typically make an API call to validate the credentials
    // For now, we'll just show a success message
    this.toastr.success('Successfully connected to Esarwa!');

    // Close the modal
    if (this.modalRef) {
      this.modalRef.close();
      // Reset the form
      this.esarwaForm = {
        apiKey: '',
        token: ''
      };
    }
  }
}
