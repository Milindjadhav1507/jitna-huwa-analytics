import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { WorkspaceService } from '../../services/workspace.service';

interface UserData {
  full_name: string;
  email: string;
  role: string;
  mobile_no: string;
  image?: string;
  selected_workspace: string;
  workspaces: string[];
}

interface Workspace {
  id: number;
  name: string;
  description: string;
  createdDate: Date;
  status: 'active' | 'archived' | 'draft';
  members: number;
  lastModified: Date;
}

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, NgbModalModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  @ViewChild('newWorkspaceModal') newWorkspaceModal: any;

  showComponent = true;
  currentUrl: string = '';
  isUserInfoVisible = false;
  isWorkspaceInfoVisible = false;
  userImage: string = '';
  private closeTimeout: any;
  private workspaceCloseTimeout: any;

  // Modal related properties
  showModal = false;
  currentWorkspace: Workspace = {
    id: 0,
    name: '',
    description: '',
    createdDate: new Date(),
    status: 'active',
    members: 0,
    lastModified: new Date()
  };

  thisIsMyData: UserData = {
    full_name: 'Vishal Jadhav',
    email: 'Vishaljadhav22@gmail.com',
    role: 'Super Admin',
    mobile_no: '+91 8007441905',
    selected_workspace: '',
    workspaces: []
  };

  constructor(
    private router: Router,
    private modalService: NgbModal,
    private workspaceService: WorkspaceService
  ) {
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.showComponent = !event.url.includes('/login') && !event.url.includes('/register') && !event.url.includes('/forget-password');
      this.currentUrl = event.url;
    });
  }

  ngOnInit() {
    this.showComponent = !this.router.url.includes('/login');
    this.loadWorkspaces();
  }

  loadWorkspaces() {
    // Load workspaces from localStorage
    const savedWorkspaces = localStorage.getItem('workspaces');
    if (savedWorkspaces) {
      const workspaceList: Workspace[] = JSON.parse(savedWorkspaces);
      this.thisIsMyData.workspaces = workspaceList.map(w => w.name);

      // Set default workspace if none is selected
      if (!this.thisIsMyData.selected_workspace && this.thisIsMyData.workspaces.length > 0) {
        this.changeWorkspace(this.thisIsMyData.workspaces[0]);
      }
    }
  }

  showUserInfo() {
    this.isUserInfoVisible = true;
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
  }

  hideUserInfo() {
    this.closeTimeout = setTimeout(() => {
      this.isUserInfoVisible = false;
    }, 500);
  }

  showWorkspaceInfo() {
    this.isWorkspaceInfoVisible = true;
    if (this.workspaceCloseTimeout) {
      clearTimeout(this.workspaceCloseTimeout);
    }
  }

  hideWorkspaceInfo() {
    this.workspaceCloseTimeout = setTimeout(() => {
      this.isWorkspaceInfoVisible = false;
    }, 500);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.router.navigate(['/login']);
  }

  changeWorkspace(workspace: string) {
    this.thisIsMyData.selected_workspace = workspace;
    this.workspaceService.setSelectedWorkspace(workspace);
    console.log('Workspace changed to:', workspace);
  }

  openNewWorkspaceModal(): void {
    this.currentWorkspace = {
      id: Date.now(),
      name: '',
      description: '',
      createdDate: new Date(),
      status: 'active',
      members: 0,
      lastModified: new Date()
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveWorkspace(): void {
    if (this.currentWorkspace.name.trim()) {
      // Create workspace object
      const workspaceObj: Workspace = {
        ...this.currentWorkspace,
        createdDate: new Date(),
        lastModified: new Date()
      };

      // Store in localStorage
      const existingWorkspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
      existingWorkspaces.push(workspaceObj);
      localStorage.setItem('workspaces', JSON.stringify(existingWorkspaces));

      // Update local workspaces list
      this.thisIsMyData.workspaces.push(workspaceObj.name);

      // Set as selected workspace
      this.changeWorkspace(workspaceObj.name);

      // Show success message
      this.showSuccessToast('New workspace created successfully!');

      // Close modal
      this.closeModal();
    }
  }

  private showSuccessToast(message: string): void {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }
}
