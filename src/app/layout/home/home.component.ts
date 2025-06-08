import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-home', // Make sure this selector is used where you want the component
  standalone: true,
  imports: [CommonModule,RouterOutlet,  RouterLink,RouterLinkActive],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] // Use .css if you generated with CSS
})
export class HomeComponent implements OnInit {

  // Property to track sidebar visibility.
  // Set initial state based on desired default (true = visible, false = hidden/active class applied)
  // Considering desktop-first: start visible.
  isSidebarVisible: boolean = true;

  // Property for the dynamic year in the footer
  currentYear: number = new Date().getFullYear();

  activeRoute: string = 'getting-started';

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Check initial screen width on load to set default state for mobile
    this.checkScreenWidth(window.innerWidth);
    // Navigate to getting-started by default
    this.router.navigate(['/home/getting-started']);
  }

  // Method to toggle the sidebar state
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  // Optional: Listen to window resize to potentially adjust sidebar state
  // e.g., Ensure it's hidden if resizing down to mobile view while it was open
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const target = event.target as Window;
    this.checkScreenWidth(target.innerWidth);
  }

  // Helper function to check screen width and set initial/responsive state
  private checkScreenWidth(width: number): void {
    // Bootstrap's 'md' breakpoint is typically 768px
    // If screen is small (mobile), default to hidden unless explicitly toggled
    if (width < 768) {
       // If you want the sidebar to *always* start hidden on mobile load/resize:
       // this.isSidebarVisible = false;

       // Or, if you want it to remember its state unless screen size forces a change
       // (This implementation doesn't automatically hide it on resize down, only sets initial state)
       // No change here, rely on initial ngOnInit check or CSS media queries for default hiding
    } else {
      // On larger screens, ensure it's visible by default (or respects toggled state)
      // If you want it to *always* open when resizing *up* to desktop:
      // this.isSidebarVisible = true;
      // Usually, you let the user's toggle action persist.
    }
     // Note: The primary control is the CSS media query which hides it below 'md'
     // The TS logic mainly handles the *toggle* action.
     // Initial state on mobile is handled by CSS (`margin-left: -270px;`).
     // The `isSidebarVisible` flag controls the *removal* of the `.active` class (making it visible).
  }

  isRouteActive(route: string): boolean {
    return this.activeRoute === route;
  }

  setActiveRoute(route: string): void {
    this.activeRoute = route;
  }

}