import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as jsPlumb from 'jsplumb';

// Define proper types for jsPlumb
type EndpointType = ['Dot' | 'Rectangle' | 'Blank', any];
type ConnectorType = ['Flowchart' | 'Bezier' | 'Straight', any];

interface JsPlumbOptions {
  Container: HTMLElement;
  DragOptions?: {
    cursor?: string;
    grid?: [number, number];
  };
  Connector?: ConnectorType;
  Endpoint?: EndpointType;
  EndpointStyle?: any;
  PaintStyle?: any;
  HoverPaintStyle?: any;
  ConnectionsDetachable?: boolean;
}

interface TableColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface TableData {
  id: string;
  name: string;
  columns: TableColumn[];
  position: { x: number; y: number };
  isCollapsed: boolean;
  previewData: any[];
}

@Component({
  selector: 'app-join-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './join-data.component.html',
  styleUrl: './join-data.component.scss'
})
export class JoinDataComponent implements OnInit, AfterViewInit {
  @ViewChild('diagramContainer') diagramContainer!: ElementRef;
  @ViewChild('diagramWrapper') diagramWrapper!: ElementRef;

  private jsPlumbInstance: any;
  private isDragging: boolean = false;

  // Zoom related properties
  readonly ZOOM_STEP = 0.1;
  readonly MIN_ZOOM = 0.2;
  readonly MAX_ZOOM = 3;
  readonly ZOOM_ANIMATION_DURATION = 300; // ms
  currentZoom: number = 1;
  isZooming: boolean = false;
  zoomPercentage: number = 100;
  private zoomTimeout: any;

  // Sample tables data with proper positioning
  tables: TableData[] = [
    {
      id: 'customers',
      name: 'Customers',
      position: { x: 150, y: 150 },  // Left side
      isCollapsed: false,
      previewData: [
        { customer_id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
        { customer_id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '987-654-3210' },
        { customer_id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '555-123-4567' }
      ],
      columns: [
        { name: 'customer_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false },
        { name: 'email', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false },
        { name: 'phone', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      id: 'orders',
      name: 'Orders',
      position: { x: 600, y: 150 },  // Center top
      isCollapsed: false,
      previewData: [
        { order_id: 1, customer_id: 1, order_date: '2024-01-01', total_amount: 100.50 },
        { order_id: 2, customer_id: 2, order_date: '2024-01-02', total_amount: 200.75 },
        { order_id: 3, customer_id: 1, order_date: '2024-01-03', total_amount: 150.25 }
      ],
      columns: [
        { name: 'order_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_id', type: 'INT', isPrimaryKey: false, isForeignKey: true },
        { name: 'order_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false },
        { name: 'total_amount', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      id: 'order_items',
      name: 'Order Items',
      position: { x: 600, y: 450 },  // Center bottom
      isCollapsed: false,
      previewData: [
        { item_id: 1, order_id: 1, product_id: 1, quantity: 2, unit_price: 25.50 },
        { item_id: 2, order_id: 1, product_id: 2, quantity: 1, unit_price: 49.99 },
        { item_id: 3, order_id: 2, product_id: 3, quantity: 3, unit_price: 15.75 }
      ],
      columns: [
        { name: 'item_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'order_id', type: 'INT', isPrimaryKey: false, isForeignKey: true },
        { name: 'product_id', type: 'INT', isPrimaryKey: false, isForeignKey: true },
        { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'unit_price', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      id: 'products',
      name: 'Products',
      position: { x: 1050, y: 450 },  // Right bottom
      isCollapsed: false,
      previewData: [
        { product_id: 1, name: 'Laptop', category: 'Electronics', price: 999.99 },
        { product_id: 2, name: 'Smartphone', category: 'Electronics', price: 699.99 },
        { product_id: 3, name: 'Headphones', category: 'Accessories', price: 149.99 }
      ],
      columns: [
        { name: 'product_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false },
        { name: 'category', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false },
        { name: 'price', type: 'DECIMAL', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      id: 'categories',
      name: 'Categories',
      position: { x: 1050, y: 150 },  // Right top
      isCollapsed: false,
      previewData: [
        { category_id: 1, name: 'Electronics', description: 'Electronic devices and accessories' },
        { category_id: 2, name: 'Clothing', description: 'Apparel and fashion items' },
        { category_id: 3, name: 'Home & Kitchen', description: 'Home appliances and kitchenware' }
      ],
      columns: [
        { name: 'category_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false },
        { name: 'description', type: 'TEXT', isPrimaryKey: false, isForeignKey: false }
      ]
    }
  ];

  constructor() {}

  ngOnInit() {
    // Initialize with improved spacing
    const positions = {
      'customers': { x: 100, y: 100 },
      'orders': { x: 500, y: 100 },
      'order_items': { x: 500, y: 400 },
      'products': { x: 900, y: 400 },
      'categories': { x: 900, y: 100 }
    };

    this.tables.forEach(table => {
      const position = positions[table.id as keyof typeof positions];
      if (position) {
        table.position = position;
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeJsPlumb();
      this.initializeZoomHandlers();
    }, 100);
  }

  private initializeJsPlumb() {
    try {
      // Initialize jsPlumb with improved options
      const options: JsPlumbOptions = {
        Container: this.diagramContainer.nativeElement,
        DragOptions: {
          cursor: 'move',
          grid: [10, 10]
        },
        // Improved connector settings for smoother arrows
        Connector: ['Flowchart', { 
          cornerRadius: 5,
          gap: 12,
          stub: [15, 15],
          midpoint: 0.7
        }],
        // Enhanced endpoint styling
        Endpoint: ['Dot', { 
          radius: 4,
          cssClass: 'endpoint'
        }],
        EndpointStyle: { 
          fill: '#4a90e2',
          stroke: '#357abd',
          strokeWidth: 1
        },
        // Improved connection styling
        PaintStyle: { 
          stroke: '#4a90e2',
          strokeWidth: 1.5,
          outlineStroke: 'transparent',
          outlineWidth: 4
        },
        HoverPaintStyle: { 
          stroke: '#357abd',
          strokeWidth: 2
        },
        ConnectionsDetachable: false
      };

      this.jsPlumbInstance = jsPlumb.jsPlumb.getInstance(options);

      // Make tables draggable with improved handling
      this.tables.forEach(table => {
        const tableEl = document.getElementById(table.id);
        if (tableEl) {
          tableEl.style.left = `${table.position.x}px`;
          tableEl.style.top = `${table.position.y}px`;

          this.jsPlumbInstance.draggable(tableEl, {
            grid: [10, 10],
            start: () => {
              this.isDragging = true;
              // Add dragging class for visual feedback
              tableEl.classList.add('dragging');
            },
            drag: () => {
              // Repaint connections during drag for smoother movement
              this.jsPlumbInstance.repaintEverything();
            },
            stop: (event: any) => {
              this.isDragging = false;
              tableEl.classList.remove('dragging');
              const id = event.el.id;
              const table = this.tables.find(t => t.id === id);
              if (table) {
                table.position = {
                  x: parseInt(event.el.style.left, 10),
                  y: parseInt(event.el.style.top, 10)
                };
              }
              // Final repaint to ensure clean connections
              this.jsPlumbInstance.repaintEverything();
            }
          });

          // Improved source/target settings
          this.jsPlumbInstance.makeSource(tableEl, {
            filter: '.column.foreign-key',
            anchor: ['Left', 'Right'],
            maxConnections: -1,
            endpoint: ['Dot', { radius: 4 }],
            paintStyle: { 
              fill: '#4a90e2',
              stroke: '#357abd'
            }
          });

          this.jsPlumbInstance.makeTarget(tableEl, {
            filter: '.column.primary-key',
            anchor: ['Left', 'Right'],
            maxConnections: -1,
            endpoint: ['Dot', { radius: 4 }],
            paintStyle: { 
              fill: '#4a90e2',
              stroke: '#357abd'
            }
          });
        }
      });

      // Create connections after a short delay
      setTimeout(() => {
        this.createConnections();
      }, 100);
    } catch (error) {
      console.error('Error initializing jsPlumb:', error);
    }
  }

  private createConnections() {
    const connections = [
      // Orders -> Customers (customer_id)
      {
        source: 'orders',
        target: 'customers',
        sourceColumn: 'customer_id',
        targetColumn: 'customer_id'
      },
      // Order Items -> Orders (order_id)
      {
        source: 'order_items',
        target: 'orders',
        sourceColumn: 'order_id',
        targetColumn: 'order_id'
      },
      // Order Items -> Products (product_id)
      {
        source: 'order_items',
        target: 'products',
        sourceColumn: 'product_id',
        targetColumn: 'product_id'
      },
      // Products -> Categories (category)
      {
        source: 'products',
        target: 'categories',
        sourceColumn: 'category',
        targetColumn: 'category_id'
      }
    ];

    connections.forEach(conn => {
      try {
        this.jsPlumbInstance.connect({
          source: conn.source,
          target: conn.target,
          anchor: ['Right', 'Left'],
          endpoint: ['Dot', { radius: 4 }],
          connector: ['Flowchart', { 
            cornerRadius: 5,
            gap: 12,
            stub: [15, 15],
            midpoint: 0.7
          }],
          paintStyle: { 
            stroke: '#4a90e2',
            strokeWidth: 1.5
          },
          overlays: [
            ['Arrow', {
              location: 1,
              width: 10,
              length: 10,
              foldback: 0.9
            }],
            ['Label', {
              label: `${conn.sourceColumn} → ${conn.targetColumn}`,
              cssClass: 'connection-label',
              location: 0.5,
              y: -10
            }]
          ]
        });
      } catch (error) {
        console.error(`Error creating connection from ${conn.source} to ${conn.target}:`, error);
      }
    });
  }

  toggleTableCollapse(table: TableData) {
    table.isCollapsed = !table.isCollapsed;
    setTimeout(() => {
      this.jsPlumbInstance.repaintEverything();
    });
  }

  resetLayout() {
    const positions = {
      'customers': { x: 100, y: 100 },
      'orders': { x: 500, y: 100 },
      'order_items': { x: 500, y: 400 },
      'products': { x: 900, y: 400 },
      'categories': { x: 900, y: 100 }
    };

    this.tables.forEach(table => {
      const newPosition = positions[table.id as keyof typeof positions];
      if (newPosition) {
        table.position = newPosition;
        const tableEl = document.getElementById(table.id);
        if (tableEl) {
          tableEl.style.left = `${newPosition.x}px`;
          tableEl.style.top = `${newPosition.y}px`;
        }
      }
    });
    
    // Repaint connections after repositioning with a delay
    if (this.jsPlumbInstance) {
      setTimeout(() => {
        this.jsPlumbInstance.repaintEverything();
      }, 100);
    }
  }

  // Zoom related properties
  private initializeZoomHandlers() {
    // Add wheel zoom handler
    this.diagramWrapper.nativeElement.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        const mouseX = e.clientX - this.diagramWrapper.nativeElement.offsetLeft;
        const mouseY = e.clientY - this.diagramWrapper.nativeElement.offsetTop;
        this.smoothZoom(delta, mouseX, mouseY);
      }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          this.zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          this.zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          this.resetZoom();
        }
      }
    });

    // Double-click to reset zoom
    this.diagramWrapper.nativeElement.addEventListener('dblclick', (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        this.resetZoom();
      }
    });
  }

  // Enhanced zoom controls
  zoomIn() {
    this.smoothZoom(this.ZOOM_STEP);
  }

  zoomOut() {
    this.smoothZoom(-this.ZOOM_STEP);
  }

  resetZoom() {
    const currentZoom = this.currentZoom;
    const targetZoom = 1;
    
    this.animateZoom(currentZoom, targetZoom, this.ZOOM_ANIMATION_DURATION);
  }

  private smoothZoom(delta: number, mouseX?: number, mouseY?: number) {
    const oldZoom = this.currentZoom;
    const newZoom = Math.min(Math.max(oldZoom + delta, this.MIN_ZOOM), this.MAX_ZOOM);
    
    if (newZoom !== oldZoom) {
      this.animateZoom(oldZoom, newZoom, this.ZOOM_ANIMATION_DURATION, mouseX, mouseY);
    }
  }

  private animateZoom(fromZoom: number, toZoom: number, duration: number, mouseX?: number, mouseY?: number) {
    if (this.zoomTimeout) {
      clearTimeout(this.zoomTimeout);
    }

    this.isZooming = true;
    const startTime = performance.now();
    const container = this.diagramContainer.nativeElement;
    const wrapper = this.diagramWrapper.nativeElement;
    const contentWrapper = container.querySelector('.content-wrapper');

    // Get the current scroll position
    const startScrollX = container.scrollLeft;
    const startScrollY = container.scrollTop;

    // Calculate the point to zoom to (relative to content)
    const rect = container.getBoundingClientRect();
    const zoomX = mouseX ?? (rect.width / 2);
    const zoomY = mouseY ?? (rect.height / 2);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.currentZoom = fromZoom + (toZoom - fromZoom) * easeProgress;
      this.zoomPercentage = Math.round(this.currentZoom * 100);

      // Apply zoom transformation
      if (contentWrapper) {
        contentWrapper.style.transform = `scale(${this.currentZoom})`;
      }

      // Calculate new scroll position to keep the zoom point steady
      const scrollX = (zoomX * this.currentZoom - zoomX);
      const scrollY = (zoomY * this.currentZoom - zoomY);
      
      container.scrollLeft = startScrollX + scrollX * easeProgress;
      container.scrollTop = startScrollY + scrollY * easeProgress;

      // Update jsPlumb connections
      if (this.jsPlumbInstance) {
        this.jsPlumbInstance.setZoom(this.currentZoom);
        this.jsPlumbInstance.repaintEverything();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isZooming = false;
        this.zoomTimeout = setTimeout(() => {
          if (this.jsPlumbInstance) {
            // Final repaint to ensure connections are properly positioned
            this.jsPlumbInstance.repaintEverything();
          }
        }, 100);
      }
    };

    requestAnimationFrame(animate);
  }

  // Helper method to format zoom percentage
  formatZoomPercentage(): string {
    return `${Math.round(this.zoomPercentage)}%`;
  }

  // Add zoom class based on current state
  getZoomClass(): string {
    if (this.currentZoom === 1) return 'zoom-normal';
    return this.currentZoom < 1 ? 'zoom-out' : 'zoom-in';
  }
}
