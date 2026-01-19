import { Component } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';

@Component({
  selector: 'app-messages',
  imports: [
    TopbarComponent
  ],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css',
})
export class MessagesComponent {

}
