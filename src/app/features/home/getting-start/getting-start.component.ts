import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { WorkspacesComponent } from '../workspaces/workspaces.component';

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
  selector: 'app-getting-start',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbModalModule, FormsModule],
  templateUrl: './getting-start.component.html',
  styleUrl: './getting-start.component.scss'
})
export class GettingStartComponent {
  @ViewChild('newWorkspaceModal') newWorkspaceModal: any;
  
  userName: string = 'Vishal Jadhav';
  workspaces: string[] = ['Analytics', 'Sales', 'Marketing', 'Finance', 'HR'];
  selectedWorkspace: string = '';
  newWorkspace: Workspace = {
    id: 0,
    name: '',
    description: '',
    createdDate: new Date(),
    status: 'active',
    members: 0,
    lastModified: new Date()
  };
  
  constructor(private modalService: NgbModal) {}

  openDemoDataModal(content: any) {
    this.modalService.open(content, {
      ariaLabelledBy: 'modal-basic-title',
      centered: true,
      size: 'lg'
    });
  }

  openNewWorkspaceModal(content: any) {
    this.modalService.open(content, {
      ariaLabelledBy: 'new-workspace-title',
      centered: true
    });
  }

  onWorkspaceSelect(workspace: string) {
    if (workspace === 'new') {
      this.openNewWorkspaceModal(this.newWorkspaceModal);
    } else {
      this.selectedWorkspace = workspace;
    }
  }

  createNewWorkspace(modal: any) {
    if (this.newWorkspace.name.trim()) {
      // Add to workspaces array
      this.workspaces.push(this.newWorkspace.name);
      
      // Create workspace object for workspace component
      const workspaceObj: Workspace = {
        id: this.workspaces.length,
        name: this.newWorkspace.name,
        description: this.newWorkspace.description,
        createdDate: new Date(),
        status: 'active',
        members: 0,
        lastModified: new Date()
      };

      // Store in localStorage for workspace component to access
      const existingWorkspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
      existingWorkspaces.push(workspaceObj);
      localStorage.setItem('workspaces', JSON.stringify(existingWorkspaces));

      // Reset form and close modal
      this.newWorkspace = {
        id: 0,
        name: '',
        description: '',
        createdDate: new Date(),
        status: 'active',
        members: 0,
        lastModified: new Date()
      };
      
      modal.close();
      this.selectedWorkspace = workspaceObj.name;
    }
  }
}
