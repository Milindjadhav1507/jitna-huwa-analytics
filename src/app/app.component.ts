import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import ApexCharts from 'apexcharts';
import * as echarts from 'echarts';
import AOS from 'aos';
import { jsPDF } from 'jspdf';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, NgbModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'esarwa-analy';

  ngOnInit() {
    // Initialize AOS
    AOS.init();

    // Initialize ApexCharts
    this.initApexChart();

    // Initialize ECharts
    this.initEChart();
  }

  initApexChart() {
    const options = {
      series: [{
        name: 'Test Data',
        data: [30, 40, 35, 50, 49, 60, 70, 91, 125]
      }],
      chart: {
        type: 'line',
        height: 350
      },
      xaxis: {
        categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999]
      }
    };

    const chart = new ApexCharts(document.querySelector("#apexChart"), options);
    chart.render();
  }

  initEChart() {
    const chartDom = document.getElementById('echart');
    const myChart = echarts.init(chartDom);
    const option = {
      xAxis: {
        type: 'category',
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: [150, 230, 224, 218, 135, 147, 260],
        type: 'line'
      }]
    };
    myChart.setOption(option);
  }

  generatePDF() {
    const doc = new jsPDF();
    doc.text('Hello World!', 10, 10);
    doc.save('test.pdf');
  }
}
