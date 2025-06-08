import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

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
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss']
})
export class WorkspacesComponent implements OnInit {
  workspaces: Workspace[] = [];

  showModal = false;
  isEditMode = false;
  currentWorkspace: Workspace = {
    id: 0,
    name: '',
    description: '',
    createdDate: new Date(),
    status: 'active',
    members: 0,
    lastModified: new Date()
  };

  constructor() { }

  ngOnInit(): void {
    // Load workspaces from localStorage
    const savedWorkspaces = localStorage.getItem('workspaces');
    if (savedWorkspaces) {
      this.workspaces = JSON.parse(savedWorkspaces);
    } else {
      // Default workspaces if none exist
      this.workspaces = [
        {
          id: 1,
          name: 'Analytics',
          description: 'Main analytics workspace for data visualization',
          createdDate: new Date('2024-03-01'),
          status: 'active',
          members: 5,
          lastModified: new Date('2024-03-15')
        },
        {
          id: 2,
          name: 'Sales',
          description: 'Quarterly sales analysis and reporting',
          createdDate: new Date('2024-02-15'),
          status: 'active',
          members: 3,
          lastModified: new Date('2024-03-14')
        }
      ];
      localStorage.setItem('workspaces', JSON.stringify(this.workspaces));
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'active':
        return 'badge bg-success';
      case 'archived':
        return 'badge bg-secondary';
      case 'draft':
        return 'badge bg-warning';
      default:
        return 'badge bg-primary';
    }
  }

  openNewWorkspaceModal(): void {
    this.isEditMode = false;
    this.currentWorkspace = {
      id: this.workspaces.length + 1,
      name: '',
      description: '',
      createdDate: new Date(),
      status: 'active',
      members: 0,
      lastModified: new Date()
    };
    this.showModal = true;
  }

  openEditWorkspaceModal(workspace: Workspace): void {
    this.isEditMode = true;
    this.currentWorkspace = { ...workspace };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveWorkspace(): void {
    if (this.isEditMode) {
      // Update existing workspace
      const index = this.workspaces.findIndex(w => w.id === this.currentWorkspace.id);
      if (index !== -1) {
        this.workspaces[index] = {
          ...this.currentWorkspace,
          lastModified: new Date()
        };
        this.showSuccessToast('Workspace updated successfully!');
      }
    } else {
      // Add new workspace
      this.workspaces.push({
        ...this.currentWorkspace,
        createdDate: new Date(),
        lastModified: new Date()
      });
      this.showSuccessToast('New workspace created successfully!');
    }
    
    // Save to localStorage
    localStorage.setItem('workspaces', JSON.stringify(this.workspaces));
    this.closeModal();
  }

  deleteWorkspace(workspace: Workspace): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete workspace "${workspace.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        const index = this.workspaces.findIndex(w => w.id === workspace.id);
        if (index !== -1) {
          this.workspaces.splice(index, 1);
          // Update localStorage
          localStorage.setItem('workspaces', JSON.stringify(this.workspaces));
          this.showSuccessToast('Workspace deleted successfully!');
        }
      }
    });
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
