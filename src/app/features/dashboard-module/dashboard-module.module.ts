import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardModuleRoutingModule } from './dashboard-module-routing.module';
import { DahsboardComponent } from './dahsboard/dahsboard.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [
    CommonModule,
    DashboardModuleRoutingModule,
    DragDropModule,
    DahsboardComponent
  ]
})
export class DashboardModuleModule { }
