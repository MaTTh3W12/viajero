import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../service/notification.service';
import { AuthService } from '../../../service/auth.service';

@Component({
  selector: 'app-contac-us',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './contac-us.component.html',
  styleUrls: ['./contac-us.component.css']
})
export class ContacUsComponent implements OnInit {
  contactName = '';
  contactEmail = '';
  contactMessage = '';
  sendingContact = false;
  contactSuccess = false;
  contactError = '';

  constructor(
    private notificationService: NotificationService,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
  }

  onContactSubmit(): void {
    if (!this.contactName.trim() || !this.contactEmail.trim() || !this.contactMessage.trim()) {
      this.contactError = 'Por favor completa todos los campos.';
      return;
    }

    const token = this.auth.token;
    if (!token) {
      this.contactError = 'Debes iniciar sesión para enviar un mensaje.';
      return;
    }

    this.sendingContact = true;
    this.contactError = '';
    this.contactSuccess = false;

    this.notificationService
      .sendNotification(
        token,
        this.contactEmail,
        'Nueva consulta',
        'contact-message',
        { name: this.contactName, message: this.contactMessage }
      )
      .subscribe({
        next: () => {
          this.sendingContact = false;
          this.contactSuccess = true;
          this.contactName = '';
          this.contactEmail = '';
          this.contactMessage = '';
        },
        error: () => {
          this.sendingContact = false;
          this.contactError = 'No se pudo enviar el mensaje. Intenta de nuevo.';
        },
      });
  }
}
