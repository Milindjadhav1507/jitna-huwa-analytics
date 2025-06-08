import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardModuleRoutingModule } from './dashboard-module-routing.module';
import { DahsboardComponent } from './dahsboard/dahsboard.component';
import { SavedTemplatesComponent } from './saved-templates/saved-templates.component';

@NgModule({
  imports: [
    CommonModule,
    DashboardModuleRoutingModule,
    DahsboardComponent,
    SavedTemplatesComponent
  ]
})
export class DashboardModule { } 