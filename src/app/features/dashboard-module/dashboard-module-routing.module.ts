import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DahsboardComponent } from './dahsboard/dahsboard.component';
import { SavedTemplatesComponent } from './saved-templates/saved-templates.component';
import { TemplateViewerComponent } from './template-viewer/template-viewer.component';

const routes: Routes = [
  {
    path: '',
    component: DahsboardComponent
  },
  {
    path: 'saved-templates',
    component: SavedTemplatesComponent
  },
  {
    path: 'template/:id',
    component: TemplateViewerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardModuleRoutingModule { }
