import { Component, AfterViewInit, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';
import { WorkspaceService } from '../../services/workspace.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sheet.component.html',
  styleUrl: './sheet.component.scss'
})
export class SheetComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('chart1') chart1Ref!: ElementRef;
  @ViewChild('chart2') chart2Ref!: ElementRef;
  @ViewChild('chart3') chart3Ref!: ElementRef;
  @ViewChild('chart4') chart4Ref!: ElementRef;
  @ViewChild('chart5') chart5Ref!: ElementRef;
  @ViewChild('chart6') chart6Ref!: ElementRef;
  @ViewChild('chart7') chart7Ref!: ElementRef;
  @ViewChild('chart8') chart8Ref!: ElementRef;

  private charts: echarts.ECharts[] = [];
  selectedWorkspace: string = '';
  private workspaceSubscription: Subscription;

  constructor(private workspaceService: WorkspaceService) {
    this.workspaceSubscription = this.workspaceService.selectedWorkspace$.subscribe(
      workspace => {
        this.selectedWorkspace = workspace || 'Select Project';
      }
    );
  }

  ngOnInit() {
    this.selectedWorkspace = this.workspaceService.getSelectedWorkspace() || 'Select Project';
  }

  ngAfterViewInit() {
    this.initializeCharts();
  }

  private initializeCharts() {
    // Bar Chart 1 - Distribution of Sr. No.
    const chart1 = echarts.init(this.chart1Ref.nativeElement);
    chart1.setOption({
      grid: {
        top: 10,
        right: 10,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['0', '2', '4', '6', '8', '10'],
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        data: [5, 15, 25, 35, 20, 10],
        type: 'bar',
        itemStyle: {
          color: '#4A90E2',
          borderRadius: 4
        }
      }]
    });
    this.charts.push(chart1);

    // Bar Chart 2 - Distribution of Total
    const chart2 = echarts.init(this.chart2Ref.nativeElement);
    chart2.setOption({
      grid: {
        top: 10,
        right: 10,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['0', '100', '200', '300', '400', '500'],
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        data: [8, 20, 30, 25, 15, 5],
        type: 'bar',
        itemStyle: {
          color: '#50C878',
          borderRadius: 4
        }
      }]
    });
    this.charts.push(chart2);

    // Pie Chart 3 - Moving Average
    const chart3 = echarts.init(this.chart3Ref.nativeElement);
    chart3.setOption({
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        data: [
          { value: 85, itemStyle: { color: '#e0e0e0' } },
          { value: 15, itemStyle: { color: '#ff6b6b' } }
        ],
        label: { show: false }
      }]
    });
    this.charts.push(chart3);

    // Line Chart 4 - Running Sr. No. Across Time
    const chart4 = echarts.init(this.chart4Ref.nativeElement);
    chart4.setOption({
      grid: {
        top: 10,
        right: 10,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        data: [10, 15, 12, 20, 18, 25],
        type: 'line',
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(74, 144, 226, 0.3)' },
            { offset: 1, color: 'rgba(74, 144, 226, 0.1)' }
          ])
        },
        lineStyle: { color: '#4A90E2' },
        itemStyle: { color: '#4A90E2' }
      }]
    });
    this.charts.push(chart4);

    // Pie Chart 5 - Total Across Time
    const chart5 = echarts.init(this.chart5Ref.nativeElement);
    chart5.setOption({
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        data: [
          { value: 75, itemStyle: { color: '#e0e0e0' } },
          { value: 25, itemStyle: { color: '#ff6b6b' } }
        ],
        label: { show: false }
      }]
    });
    this.charts.push(chart5);

    // Scatter Chart 6 - Total vs BIOMETRIC
    const chart6 = echarts.init(this.chart6Ref.nativeElement);
    chart6.setOption({
      grid: {
        top: 10,
        right: 10,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'scatter',
        data: [
          [10, 20], [15, 25], [20, 30],
          [25, 35], [30, 40], [35, 45]
        ],
        itemStyle: { color: '#4A90E2' },
        symbolSize: 8
      }]
    });
    this.charts.push(chart6);

    // Pie Chart 7 - Total vs BIOMETRIC (Second)
    const chart7 = echarts.init(this.chart7Ref.nativeElement);
    chart7.setOption({
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        data: [
          { value: 65, itemStyle: { color: '#e0e0e0' } },
          { value: 35, itemStyle: { color: '#ff6b6b' } }
        ],
        label: { show: false }
      }]
    });
    this.charts.push(chart7);

    // Pie Chart 8 - EMP CTC
    const chart8 = echarts.init(this.chart8Ref.nativeElement);
    chart8.setOption({
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        data: [
          { value: 80, itemStyle: { color: '#e0e0e0' } },
          { value: 20, itemStyle: { color: '#ff6b6b' } }
        ],
        label: { show: false }
      }]
    });
    this.charts.push(chart8);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.charts.forEach(chart => chart.resize());
    });
  }

  ngOnDestroy() {
    // Clean up charts when component is destroyed
    this.charts.forEach(chart => chart.dispose());
    window.removeEventListener('resize', () => {
      this.charts.forEach(chart => chart.resize());
    });
    this.workspaceSubscription.unsubscribe();
  }
}
