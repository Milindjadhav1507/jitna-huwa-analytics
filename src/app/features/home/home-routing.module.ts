import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestComponent } from './test/test.component';
import { HomeComponent } from '../../layout/home/home.component';
import { GettingStartComponent } from './getting-start/getting-start.component';
import { WorkspacesComponent } from './workspaces/workspaces.component';
import { DataSourcesComponent } from './data-sources/data-sources.component';
import { UserTeamComponent } from './user-team/user-team.component';

const routes: Routes = [
  {
    path: '',component: HomeComponent,
    children: [
                { path: 'getting-started', component: GettingStartComponent },
                { path: 'workspaces', component: WorkspacesComponent },
                { path: 'data-sources', component: DataSourcesComponent },
                { path: 'user-team', component: UserTeamComponent },
                { path: 'test', component: TestComponent },
              ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})


export class HomeRoutingModule { }
