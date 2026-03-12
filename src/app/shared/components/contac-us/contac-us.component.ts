import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contac-us',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contac-us.component.html',
  styleUrls: ['./contac-us.component.css']
})
export class ContacUsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
