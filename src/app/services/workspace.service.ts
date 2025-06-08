import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private selectedWorkspaceSubject = new BehaviorSubject<string>('');
  selectedWorkspace$ = this.selectedWorkspaceSubject.asObservable();

  constructor() {
    // Initialize from localStorage if available
    const savedWorkspace = localStorage.getItem('selectedWorkspace');
    if (savedWorkspace) {
      this.selectedWorkspaceSubject.next(savedWorkspace);
    }
  }

  setSelectedWorkspace(workspace: string) {
    this.selectedWorkspaceSubject.next(workspace);
    localStorage.setItem('selectedWorkspace', workspace);
  }

  getSelectedWorkspace(): string {
    return this.selectedWorkspaceSubject.value;
  }
}
