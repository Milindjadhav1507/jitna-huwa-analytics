import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  firstName: string = '';
  lastName: string = '';
  mobile: string = '';
  termsAccepted: boolean = false;

  onSubmit() {
    if (this.termsAccepted) {
      console.log('Registration details:', {
        firstName: this.firstName,
        lastName: this.lastName,
        mobile: this.mobile
      });
    } else {
      console.log('Please accept terms and conditions');
    }
  }
}
