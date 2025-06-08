import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss'
})
export class ForgetPasswordComponent {
  mobileNumber: string = '';

  onSubmit() {
    // Handle OTP send logic here
    console.log('Sending OTP to:', this.mobileNumber);
  }
}
