import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';

interface DataSource {
  name: string;
  id: string;
  type: 'snowflake' | 'csv' | 'excel';
  icon: string;
  timestamp?: string;
  fileName?: string;
}

interface ConnectOption {
  name: string;
  description: string;
  icon: string;
  type: 'upload' | 'demo';
}

interface DatabaseOption {
  name: string;
  icon: string;
  defaultPort: string;
  jdbcPrefix: string;
  status?: 'Beta' | 'Alpha';
}

interface CsvColumn {
  name: string;
  type: string;
  originalName: string;
  sample: string[];
}

interface CsvData {
  headers: CsvColumn[];
  rows: any[];
  preview: any[];
}

interface ColumnTypeOption {
  value: string;
  description: string;
}

type ColumnType = 'STRING' | 'INT' | 'NUMERIC' | 'DATE' | 'BOOLEAN';

interface DatabaseConnection {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  sslMode: 'Require' | 'Disable';
}

@Component({
  selector: 'app-data-sources',
  standalone: true,
  imports: [CommonModule, NgbModule, FormsModule],
  templateUrl: './data-sources.component.html',
  styleUrl: './data-sources.component.scss'
})
export class DataSourcesComponent {
  @ViewChild('connectDataModal') connectDataModal: any;
  @ViewChild('csvUploadModal') csvUploadModal: any;
  @ViewChild('filePreviewModal') filePreviewModal: any;
  @ViewChild('demoDataModal') demoDataModal: any;
  @ViewChild('databaseConnectionModal') databaseConnectionModal: any;

  // CSV Upload related properties
  csvDataSourceName: string = 'Untitled Data Source';
  isDragging: boolean = false;
  selectedFile: File | null = null;
  isFirstRowHeader: boolean = true;
  csvData: CsvData | null = null;

  // Database connection form
  databaseConnection: DatabaseConnection = {
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
    sslMode: 'Require'
  };

  selectedDatabase: DatabaseOption | null = null;

  // SSL Mode options
  sslModeOptions = [
    { value: 'Require', label: 'Require' },
    { value: 'Disable', label: 'Disable' }
  ];

  // IP addresses to whitelist (shown in the UI)
  ipAddressesToWhitelist = [
    '3.218.100.54/32',
    '3.228.159.139/32',
    '54.225.71.151/32'
  ];

  columnTypeOptions: ColumnTypeOption[] = [
    { value: 'STRING', description: 'Text values like names, descriptions, or categories' },
    { value: 'INT', description: 'Whole numbers without decimals' },
    { value: 'NUMERIC', description: 'Numbers that can have decimal points' },
    { value: 'DATE', description: 'Date and time values' }
  ];

  getColumnTypeDescription(type: string): string {
    const option = this.columnTypeOptions.find(opt => opt.value === type);
    return option ? `${type} (${option.description})` : type;
  }

  columnTypes: ColumnType[] = ['STRING', 'INT', 'NUMERIC', 'DATE', 'BOOLEAN'];

  dataSources: DataSource[] = [
    {
      name: 'GoodData Snowflake demo',
      id: 'gdc_demo_940fa5e7-7aa9-4351-bd04-7328c8d1c955',
      type: 'snowflake',
      icon: 'bi-snow'
    },
    {
      name: 'Untitled CSV data source',
      id: 'gdc_csv_ds_cieh',
      type: 'csv',
      icon: 'bi-file-text'
    },
    {
      name: 'Untitled CSV data source',
      id: 'gdc_csv_ds_ddck1',
      type: 'csv',
      icon: 'bi-file-text'
    }
  ];

  connectOptions: ConnectOption[] = [
    {
      name: 'CSV/XLSX Data Source',
      description: 'Upload CSV or Excel files to our storage',
      icon: 'bi-file-text',
      type: 'upload'
    },
    {
      name: 'Demo Data Source',
      description: 'Connect to our demo database.',
      icon: 'bi-database',
      type: 'demo'
    }
  ];

  supportedDatabases: DatabaseOption[] = [
    { 
      name: 'MySQL', 
      icon: 'assets/images/db/Mysql_logo.png',
      defaultPort: '3306',
      jdbcPrefix: 'jdbc:mysql://'
    },
    { 
      name: 'MariaDB', 
      icon: 'assets/images/db/mariadb.png',
      defaultPort: '3306',
      jdbcPrefix: 'jdbc:mariadb://'
    },
    { 
      name: 'Redis', 
      icon: 'assets/images/db/redis.png',
      defaultPort: '6379',
      jdbcPrefix: 'redis://'
    },
    { 
      name: 'Oracle', 
      icon: 'assets/images/db/oracle.png',
      defaultPort: '1521',
      jdbcPrefix: 'jdbc:oracle:thin:@//'
    },
    { 
      name: 'PostgreSQL', 
      icon: 'assets/images/db/postgresql-icon.png',
      defaultPort: '5432',
      jdbcPrefix: 'jdbc:postgresql://'
    },
    { 
      name: 'Azure SQL', 
      icon: 'assets/images/db/azure sql.png',
      defaultPort: '1433',
      jdbcPrefix: 'jdbc:sqlserver://'
    },
    { 
      name: 'PHP Admin', 
      icon: 'assets/images/db/phpmyadmin.png',
      defaultPort: '80',
      jdbcPrefix: 'http://'
    },
    { 
      name: 'MongoDB', 
      icon: 'assets/images/db/mongodb.png',
      defaultPort: '27017',
      jdbcPrefix: 'mongodb://'
    },
    { 
      name: 'MS SQL', 
      icon: 'assets/images/db/mssql.png',
      defaultPort: '1433',
      jdbcPrefix: 'jdbc:sqlserver://'
    }
  ];

  constructor(private modalService: NgbModal, private router: Router) {
    this.loadDataSourcesFromLocalStorage();
  }

  loadDataSourcesFromLocalStorage() {
    try {
      // Load imported data
      const importedData = JSON.parse(localStorage.getItem('importedData') || '[]');
      
      if (!Array.isArray(importedData)) {
        // If importedData is not an array, convert it to an array
        const data = importedData ? [importedData] : [];
        
        // Convert imported data to DataSource format
        const importedSources = data.map((data: any) => ({
          name: data.dataSourceName || data.workspaceName || 'Untitled Data Source',
          id: `imported_${data.timestamp}`,
          type: data.fileName?.toLowerCase().endsWith('xlsx') ? 'excel' as const : 'csv' as const,
          icon: data.fileName?.toLowerCase().endsWith('xlsx') ? 'bi-file-earmark-excel' : 'bi-file-text',
          timestamp: data.timestamp,
          fileName: data.fileName
        }));

        // Combine with existing data sources
        this.dataSources = [...this.dataSources, ...importedSources];

        // Sort by timestamp (newest first)
        this.dataSources.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
      }
    } catch (error) {
      console.error('Error loading imported data:', error);
    }
  }

  onConnectData() {
    this.modalService.open(this.connectDataModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      modalDialogClass: 'connect-data-modal'
    });
  }

  onSelectDataSource(option: ConnectOption, modal: any) {
    if (option.type === 'upload') {
      // Close the current modal
      modal.close();
      // Open the CSV upload modal
      this.modalService.open(this.csvUploadModal, {
        size: 'lg',
        centered: true,
        backdrop: 'static',
        modalDialogClass: 'csv-upload-modal'
      });
    } else if (option.type === 'demo') {
      // Close the current modal
      modal.close();
      // Open the demo data modal
      this.modalService.open(this.demoDataModal, {
        centered: true,
        backdrop: 'static',
        modalDialogClass: 'demo-data-modal'
      });
    }
  }

  onSelectDatabase(database: DatabaseOption, modal: any) {
    this.selectedDatabase = database;
    // Set default port for the selected database
    this.databaseConnection.port = database.defaultPort;
    // Close current modal
    modal.close();
    // Open database connection modal
    this.modalService.open(this.databaseConnectionModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      modalDialogClass: 'database-connection-modal'
    });
  }

  onTestConnection() {
    // Here you would implement the actual connection testing logic
    console.log('Testing connection with:', this.databaseConnection);
    // For now, just show an alert
    alert('Connection test successful!');
  }

  onConnectDatabase(modal: any) {
    if (this.selectedDatabase && this.databaseConnection) {
      // Here you would implement the actual database connection logic
      console.log('Connecting to database:', this.selectedDatabase.name);
      console.log('Connection details:', this.databaseConnection);
      
      // Add the new data source to the list
      const newDataSource: DataSource = {
        name: `${this.selectedDatabase.name} Connection`,
        id: `gdc_db_${Date.now()}`,
        type: 'snowflake', // You might want to add a new type for databases
        icon: this.selectedDatabase.icon
      };
      
      this.dataSources = [...this.dataSources, newDataSource];
      
      // Reset and close modal
      this.databaseConnection = {
        host: '',
        port: '',
        username: '',
        password: '',
        database: '',
        sslMode: 'Require'
      };
      this.selectedDatabase = null;
      modal.close();
    }
  }

  // CSV Upload related methods
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileType = file.type || '';
      const fileName = file.name.toLowerCase();
      
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        this.selectedFile = file;
        this.readCsvFile(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        this.selectedFile = file;
        this.readExcelFile(file);
      } else {
        alert('Please upload a CSV or Excel file');
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const fileName = file.name.toLowerCase();
      
      this.selectedFile = file;
      if (fileName.endsWith('.csv')) {
        this.readCsvFile(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        this.readExcelFile(file);
      }
    }
  }

  removeSelectedFile() {
    this.selectedFile = null;
    this.csvData = null;
  }

  onBack(modal: any) {
    // Reset all file-related states
    this.selectedFile = null;
    this.csvData = null;
    this.csvDataSourceName = 'Untitled Data Source';
    this.isFirstRowHeader = true;
    
    // Close current modal and open connect data modal
    modal.close();
    this.onConnectData();
  }

  readCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = this.isFirstRowHeader ? lines[0].split(',') : [];
      const rows = this.isFirstRowHeader ? lines.slice(1) : lines;
      
      // Process the data
      const processedData = rows
        .filter(row => row.trim()) // Remove empty rows
        .map(row => row.split(','));

      // Create column definitions
      const columns: CsvColumn[] = (this.isFirstRowHeader ? headers : processedData[0].map((_, i) => `Column ${i + 1}`))
        .map((header, index) => ({
          name: header.trim(),
          originalName: header.trim(),
          type: this.detectColumnType(processedData.map(row => row[index])),
          sample: processedData.slice(0, 4).map(row => row[index])
        }));

      this.csvData = {
        headers: columns,
        rows: processedData,
        preview: processedData.slice(0, 4)
      };

      // Open preview modal
      this.openPreviewModal();
    };
    reader.readAsText(file);
  }

  readExcelFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert Excel data to array format with proper options
        const excelData = XLSX.utils.sheet_to_json<any[]>(worksheet, { 
          header: 1,
          raw: false,
          defval: '' // Use empty string for empty cells
        });
        
        // Filter out completely empty rows
        const filteredData = excelData.filter(row => row.some(cell => cell !== ''));
        
        // Process the data similar to CSV
        const headers = this.isFirstRowHeader ? filteredData[0] : [];
        const rows = this.isFirstRowHeader ? filteredData.slice(1) : filteredData;
        
        // Create column definitions
        const columns: CsvColumn[] = (this.isFirstRowHeader ? headers : rows[0].map((_, i) => `Column ${i + 1}`))
          .map((header, index) => ({
            name: String(header || '').trim() || `Column ${index + 1}`,
            originalName: String(header || '').trim() || `Column ${index + 1}`,
            type: this.detectColumnType(rows.map(row => String(row[index] || ''))),
            sample: rows.slice(0, 4).map(row => String(row[index] || ''))
          }));

        this.csvData = {
          headers: columns,
          rows: rows,
          preview: rows.slice(0, 4)
        };

        // Open preview modal
        this.openPreviewModal();
      } catch (error) {
        console.error('Error processing Excel file:', error);
        alert('Error processing Excel file. Please make sure it is a valid Excel file.');
      }
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }

  detectColumnType(values: string[]): ColumnType {
    // Remove empty values and undefined
    values = values.filter(v => v !== undefined && v !== null && v !== '');
    
    if (values.length === 0) return 'STRING';

    // Check if all values are numbers
    const areAllIntegers = values.every(v => /^-?\d+$/.test(String(v).trim()));
    if (areAllIntegers) return 'INT';

    // Check if all values are decimal numbers
    const areAllNumbers = values.every(v => !isNaN(Number(v)));
    if (areAllNumbers) return 'NUMERIC';

    // Check if all values are dates
    const areAllDates = values.every(v => {
      const parsed = Date.parse(String(v));
      return !isNaN(parsed);
    });
    if (areAllDates) return 'DATE';

    // Check if all values are booleans
    const booleanValues = ['true', 'false', '0', '1', 'yes', 'no'];
    const areAllBooleans = values.every(v => 
      booleanValues.includes(String(v).toLowerCase().trim())
    );
    if (areAllBooleans) return 'BOOLEAN';

    return 'STRING';
  }

  openPreviewModal() {
    if (this.csvData) {
      const modalRef = this.modalService.open(this.filePreviewModal, {
        size: 'xl',
        centered: true,
        backdrop: 'static',
        modalDialogClass: 'file-preview-modal'
      });
    }
  }

  onColumnTypeChange(column: CsvColumn, newType: string) {
    column.type = newType;
  }

  onSave(modal: any) {
    if (this.selectedFile && this.csvData) {
      // Create a unique ID for this data source
      const dataSourceId = 'gdc_file_' + Date.now();
      const timestamp = new Date().toISOString();
      
      // Create the data source object
      const newDataSource: DataSource = {
        name: this.csvDataSourceName,
        id: dataSourceId,
        type: this.selectedFile.name.toLowerCase().endsWith('xlsx') ? 'excel' : 'csv',
        icon: this.selectedFile.name.toLowerCase().endsWith('xlsx') ? 'bi-file-earmark-excel' : 'bi-file-text',
        fileName: this.selectedFile.name,
        timestamp: timestamp
      };
      
      // Save the data to localStorage
      const localStorageKey = `data_source_${dataSourceId}`;
      const dataToSave = {
        name: this.csvDataSourceName,
        file: this.selectedFile.name,
        headers: this.csvData.headers,
        rows: this.csvData.rows,
        isFirstRowHeader: this.isFirstRowHeader,
        timestamp: timestamp
      };
      
      localStorage.setItem(localStorageKey, JSON.stringify(dataToSave));
      
      // Add the new data source to the list
      this.dataSources = [...this.dataSources, newDataSource];
      
      // Reset and close modal
      this.selectedFile = null;
      this.csvData = null;
      this.csvDataSourceName = 'Untitled Data Source';
      modal.close();
    }
  }

  onConnectDemo(modal: any) {
    // Add the demo data source
    const demoDataSource: DataSource = {
      name: 'GoodData Snowflake Demo',
      id: 'gdc_demo_' + Date.now(),
      type: 'snowflake',
      icon: 'bi-snow'
    };
    
    this.dataSources = [...this.dataSources, demoDataSource];
    modal.close();
  }

  onEditDataSource(source: DataSource) {
    if (source.type === 'csv' || source.type === 'excel') {
      // For imported data
      if (source.id.startsWith('imported_')) {
        const importedData = JSON.parse(localStorage.getItem('importedData') || '[]');
        const data = importedData.find((item: any) => 
          item.timestamp === source.id.replace('imported_', '')
        );

        if (data) {
          // Navigate to import data component with the data
          this.router.navigate(['/import-data'], {
            state: {
              data: data,
              isEdit: true,
              source: {
                name: 'Local Drive',
                iconType: 'img',
                iconValue: 'assets/images/logo/localdrive.png',
                customClass: 'icon-local-drive rounded-circle',
                type: 'file'
              }
            }
          });
        }
      } else {
        // Existing logic for non-imported data sources
        const localStorageKey = `data_source_${source.id}`;
        const savedData = localStorage.getItem(localStorageKey);
        
        if (savedData) {
          try {
            const data = JSON.parse(savedData);
            // Navigate to import data component with the data
            this.router.navigate(['/import-data'], {
              state: {
                data: data,
                isEdit: true,
                source: {
                  name: 'Local Drive',
                  iconType: 'img',
                  iconValue: 'assets/images/logo/localdrive.png',
                  customClass: 'icon-local-drive rounded-circle',
                  type: 'file'
                }
              }
            });
          } catch (error) {
            console.error('Error loading data source:', error);
            alert('Error loading data source. Please try again.');
          }
        }
      }
    } else {
      // Existing logic for database connections
      const database = this.supportedDatabases.find(db => db.name === source.name.split(' ')[0]);
      if (database) {
        this.selectedDatabase = database;
        this.modalService.open(this.databaseConnectionModal, {
          size: 'lg',
          centered: true,
          backdrop: 'static',
          modalDialogClass: 'database-connection-modal'
        });
      }
    }
  }

  onDeleteDataSource(source: DataSource) {
    if (confirm(`Are you sure you want to delete "${source.name}"?`)) {
      // For imported data
      if (source.id.startsWith('imported_')) {
        const importedData = JSON.parse(localStorage.getItem('importedData') || '[]');
        if (!Array.isArray(importedData)) {
          // If it's a single object, remove it
          localStorage.removeItem('importedData');
        } else {
          // If it's an array, filter out the item to delete
          const updatedData = importedData.filter((item: any) => 
            item.timestamp !== source.id.replace('imported_', '')
          );
          localStorage.setItem('importedData', JSON.stringify(updatedData));
        }
      } else {
        // For non-imported data sources
        const localStorageKey = `data_source_${source.id}`;
        localStorage.removeItem(localStorageKey);
      }
      
      // Remove from the data sources list
      this.dataSources = this.dataSources.filter(ds => ds.id !== source.id);
    }
  }
}