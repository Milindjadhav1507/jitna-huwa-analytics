import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-footer',
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent  {
  currentYear: number = new Date().getFullYear();
  languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'mr', name: 'मराठी' }
  ];
  showComponent: boolean = true;
  currentUrl: any;

  onLanguageChange(langCode: string) {
    console.log('Language changed to:', langCode);
    // Implement language change logic here
  }



  constructor(private router: Router) {

    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Hide topbar only on login page
      this.showComponent = !event.url.includes('/login') && !event.url.includes('/register') && !event.url.includes('/forget-password') && !event.url.includes('/dashboard') && !event.url.includes('/excel-preview');
      this.currentUrl = event.url;
    });
  }

  ngOnInit() {
    // Check current route on component initialization
    this.showComponent = !this.router.url.includes('/login');
  }

}