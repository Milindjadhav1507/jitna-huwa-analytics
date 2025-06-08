import { Routes } from '@angular/router';
import { LoginComponent } from './layout/login/login.component';
import { RegisterComponent } from './layout/register/register.component';
import { ForgetPasswordComponent } from './layout/forget-password/forget-password.component';
import { HomeComponent } from './layout/home/home.component';
import { ExcelPreviewComponent } from './features/excel-preview/excel-preview.component';
import { SheetComponent } from './features/sheet/sheet.component';

export const routes: Routes = [
    {path: '',redirectTo: 'login',pathMatch: 'full'},
    {path: 'login',component: LoginComponent},
    {path: 'register',component: RegisterComponent},
    {path: 'forget-password',component: ForgetPasswordComponent},
    {path: 'settings',component: ForgetPasswordComponent},
    {path: 'excel-preview',component: ExcelPreviewComponent},
    {path: 'sheet-preview',component: SheetComponent},





    {path: 'home',loadChildren: () => import('./features/home/home-routing.module').then(m => m.HomeRoutingModule)},
    {path: 'dashboard',loadChildren: () => import('./features/dashboard-module/dashboard-module-routing.module').then(m => m.DashboardModuleRoutingModule)},
    {path: 'import-data',loadChildren: () => import('./features/import-data-module/import-data-module-routing.module').then(m => m.ImportDataModuleRoutingModule)},
    {path: 'join-data',loadChildren: () => import('./features/join-data-module/join-data-module-routing.module').then(m => m.JoinDataModuleRoutingModule)},


];
