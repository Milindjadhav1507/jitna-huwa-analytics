import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'inactive';
  teams: number[];
  workspaces: string[];
  dataSources: string[];
  lastActive: Date;
  createdAt: Date;
}

interface Team {
  id: number;
  name: string;
  description: string;
  members: number[];
  workspaces: string[];
  dataSources: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-user-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-team.component.html',
  styleUrls: ['./user-team.component.scss']
})
export class UserTeamComponent implements OnInit {
  // View control
  activeView: 'users' | 'teams' = 'users';
  
  // Lists
  users: UserProfile[] = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      avatar: 'assets/avatars/user1.jpg',
      status: 'active',
      teams: [1, 2],
      workspaces: ['Analytics', 'Sales'],
      dataSources: ['MySQL', 'PostgreSQL'],
      lastActive: new Date(),
      createdAt: new Date('2024-01-15')
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'Analyst',
      avatar: 'assets/avatars/user2.jpg',
      status: 'active',
      teams: [1],
      workspaces: ['Marketing'],
      dataSources: ['MongoDB'],
      lastActive: new Date(),
      createdAt: new Date('2024-02-01')
    }
  ];

  teams: Team[] = [
    {
      id: 1,
      name: 'Analytics Team',
      description: 'Main analytics and reporting team',
      members: [1, 2],
      workspaces: ['Analytics', 'Sales'],
      dataSources: ['MySQL', 'PostgreSQL'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    },
    {
      id: 2,
      name: 'Marketing Team',
      description: 'Digital marketing and analytics',
      members: [1],
      workspaces: ['Marketing'],
      dataSources: ['MongoDB'],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date()
    }
  ];

  // Filters
  filters = {
    workspace: '',
    dataSource: '',
    team: '',
    searchQuery: ''
  };

  // Selection
  selectedUsers: number[] = [];
  selectedTeams: number[] = [];

  // Modals
  showUserModal = false;
  showTeamModal = false;
  showProfileModal = false;
  isEditMode = false;

  // Current items
  currentUser: UserProfile = this.getEmptyUser();
  currentTeam: Team = this.getEmptyTeam();

  // Add new properties for select all
  allUsersSelected = false;
  allTeamsSelected = false;
  showTeamDetailsModal = false;
  currentTeamDetails: Team | null = null;

  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;

  // Filtered lists
  filteredUsers: UserProfile[] = [];
  filteredTeams: Team[] = [];

  // Add Math property
  Math = Math;

  constructor() {
    // Add keyboard event listener for global shortcuts
    document.addEventListener('keydown', (event) => {
      // Prevent shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + A to select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        if (this.activeView === 'users') {
          this.toggleSelectAllUsers();
        } else {
          this.toggleSelectAllTeams();
        }
      }

      // Ctrl/Cmd + N to create new
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        if (this.activeView === 'users') {
          this.openNewUserModal();
        } else {
          this.openNewTeamModal();
        }
      }

      // Ctrl/Cmd + E to edit selected
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        this.editSelected();
      }

      // Delete key to remove selected
      if (event.key === 'Delete') {
        event.preventDefault();
        if (this.activeView === 'users') {
          this.deleteUsers();
        } else {
          this.deleteTeams();
        }
      }

      // 1 to switch to Users view
      if (event.key === '1') {
        event.preventDefault();
        this.switchView('users');
      }

      // 2 to switch to Teams view
      if (event.key === '2') {
        event.preventDefault();
        this.switchView('teams');
      }
    });
  }

  ngOnInit(): void {
    this.filteredUsers = [...this.users];
    this.filteredTeams = [...this.teams];
    this.updatePagination();
  }

  // Helper methods
  getTeamNameById(teamId: number): string {
    const team = this.teams.find(t => t.id === teamId);
    return team ? team.name : '';
  }

  private getEmptyUser(): UserProfile {
    return {
      id: 0,
      name: '',
      email: '',
      role: 'User',
      avatar: 'assets/avatars/default.jpg',
      status: 'active',
      teams: [],
      workspaces: [],
      dataSources: [],
      lastActive: new Date(),
      createdAt: new Date()
    };
  }

  private getEmptyTeam(): Team {
    return {
      id: 0,
      name: '',
      description: '',
      members: [],
      workspaces: [],
      dataSources: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // View methods
  switchView(view: 'users' | 'teams'): void {
    this.activeView = view;
    this.clearSelections();
  }

  clearSelections(): void {
    this.selectedUsers = [];
    this.selectedTeams = [];
  }

  // User methods
  openNewUserModal(): void {
    this.isEditMode = false;
    this.currentUser = this.getEmptyUser();
    this.showUserModal = true;
  }

  openEditUserModal(user: UserProfile): void {
    this.isEditMode = true;
    this.currentUser = { ...user };
    this.showUserModal = true;
  }

  openUserProfile(user: UserProfile): void {
    this.currentUser = { ...user };
    this.showProfileModal = true;
  }

  saveUser(): void {
    if (this.isEditMode) {
      const index = this.users.findIndex(u => u.id === this.currentUser.id);
      if (index !== -1) {
        this.users[index] = { ...this.currentUser };
        this.showSuccessToast('User updated successfully!');
      }
    } else {
      this.currentUser.id = this.users.length + 1;
      this.users.push({ ...this.currentUser });
      this.showSuccessToast('User created successfully!');
    }
    this.closeUserModal();
  }

  deleteUsers(): void {
    if (this.selectedUsers.length === 0) return;

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${this.selectedUsers.length} selected users?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'No, keep them',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.users = this.users.filter(u => !this.selectedUsers.includes(u.id));
        this.selectedUsers = [];
        this.showSuccessToast('Users deleted successfully!');
      }
    });
  }

  // Team methods
  openNewTeamModal(): void {
    this.isEditMode = false;
    this.currentTeam = this.getEmptyTeam();
    this.showTeamModal = true;
  }

  openEditTeamModal(team: Team): void {
    this.isEditMode = true;
    this.currentTeam = { ...team };
    this.showTeamModal = true;
  }

  saveTeam(): void {
    if (this.isEditMode) {
      const index = this.teams.findIndex(t => t.id === this.currentTeam.id);
      if (index !== -1) {
        this.teams[index] = { ...this.currentTeam };
        this.showSuccessToast('Team updated successfully!');
      }
    } else {
      this.currentTeam.id = this.teams.length + 1;
      this.teams.push({ ...this.currentTeam });
      this.showSuccessToast('Team created successfully!');
    }
    this.closeTeamModal();
  }

  deleteTeams(): void {
    if (this.selectedTeams.length === 0) return;

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${this.selectedTeams.length} selected teams?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'No, keep them',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.teams = this.teams.filter(t => !this.selectedTeams.includes(t.id));
        this.selectedTeams = [];
        this.showSuccessToast('Teams deleted successfully!');
      }
    });
  }

  // Modal methods
  closeUserModal(): void {
    this.showUserModal = false;
  }

  closeTeamModal(): void {
    this.showTeamModal = false;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }

  // Filter methods
  applyFilters(): void {
    const searchLower = this.filters.searchQuery.toLowerCase();
    
    if (this.activeView === 'users') {
      this.filteredUsers = this.users.filter(user => {
        const matchesSearch = !searchLower || 
          user.name.toLowerCase().includes(searchLower) || 
          user.email.toLowerCase().includes(searchLower);
        
        const matchesWorkspace = !this.filters.workspace || 
          user.workspaces.includes(this.filters.workspace);
        
        const matchesDataSource = !this.filters.dataSource || 
          user.dataSources.includes(this.filters.dataSource);
        
        return matchesSearch && matchesWorkspace && matchesDataSource;
      });
    } else {
      this.filteredTeams = this.teams.filter(team => {
        const matchesSearch = !searchLower || 
          team.name.toLowerCase().includes(searchLower) || 
          team.description.toLowerCase().includes(searchLower);
        
        const matchesWorkspace = !this.filters.workspace || 
          team.workspaces.includes(this.filters.workspace);
        
        const matchesDataSource = !this.filters.dataSource || 
          team.dataSources.includes(this.filters.dataSource);
        
        return matchesSearch && matchesWorkspace && matchesDataSource;
      });
    }
    
    this.currentPage = 1;
    this.updatePagination();
  }

  // Selection methods
  toggleUserSelection(userId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const index = this.selectedUsers.indexOf(userId);
    if (index === -1) {
      this.selectedUsers.push(userId);
    } else {
      this.selectedUsers.splice(index, 1);
    }
  }

  toggleTeamSelection(teamId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const index = this.selectedTeams.indexOf(teamId);
    if (index === -1) {
      this.selectedTeams.push(teamId);
    } else {
      this.selectedTeams.splice(index, 1);
    }
  }

  // Select all functionality
  toggleSelectAllUsers(): void {
    this.allUsersSelected = !this.allUsersSelected;
    this.selectedUsers = this.allUsersSelected ? this.users.map(user => user.id) : [];
  }

  toggleSelectAllTeams(): void {
    this.allTeamsSelected = !this.allTeamsSelected;
    this.selectedTeams = this.allTeamsSelected ? this.teams.map(team => team.id) : [];
  }

  // Row click handlers
  onUserRowClick(user: UserProfile): void {
    this.currentUser = { ...user };
    this.showProfileModal = true;
  }

  onTeamRowClick(team: Team): void {
    this.currentTeamDetails = { ...team };
    this.showTeamDetailsModal = true;
  }

  closeTeamDetailsModal(): void {
    this.showTeamDetailsModal = false;
    this.currentTeamDetails = null;
  }

  // Toast notification
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

  // Helper methods
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
      '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
      '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
      '#d35400', '#c0392b', '#bdc3c7', '#7f8c8d'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    return colors[hash % colors.length];
  }

  // Helper method to get member name
  getMemberName(memberId: number): string {
    const user = this.users.find(u => u.id === memberId);
    return user ? user.name : 'Unknown User';
  }

  // Pagination methods
  updatePagination(): void {
    const totalItems = this.activeView === 'users' ? this.filteredUsers.length : this.filteredTeams.length;
    this.totalPages = Math.ceil(totalItems / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages);
  }

  getCurrentPageItems(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    if (this.activeView === 'users') {
      return this.filteredUsers.slice(startIndex, endIndex);
    } else {
      return this.filteredTeams.slice(startIndex, endIndex);
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  // Quick action to edit selected item
  editSelected(): void {
    if (this.activeView === 'users' && this.selectedUsers.length === 1) {
      const user = this.users.find(u => u.id === this.selectedUsers[0]);
      if (user) {
        this.openEditUserModal(user);
      }
    } else if (this.activeView === 'teams' && this.selectedTeams.length === 1) {
      const team = this.teams.find(t => t.id === this.selectedTeams[0]);
      if (team) {
        this.openEditTeamModal(team);
      }
    }
  }

  // Quick action to view details
  viewDetails(event: KeyboardEvent, item: any): void {
    event.stopPropagation();
    if (this.activeView === 'users') {
      this.onUserRowClick(item);
    } else {
      this.onTeamRowClick(item);
    }
  }

  // Add helper methods for pagination display
  getTotalItems(): number {
    return this.activeView === 'users' ? this.filteredUsers.length : this.filteredTeams.length;
  }

  getCurrentPageStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getCurrentPageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.getTotalItems());
  }
}
