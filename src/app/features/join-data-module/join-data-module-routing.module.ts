import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JoinDataComponent } from './join-data/join-data.component';

const routes: Routes = [
  {
    path: '',component: JoinDataComponent,
    children: [
      // { path: 'join-data', component: JoinDataComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JoinDataModuleRoutingModule { }
