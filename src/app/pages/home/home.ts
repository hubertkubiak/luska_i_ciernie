import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sparks } from '../../ui/sparks/sparks';
import { TropeOfTheDay } from './trope-of-the-day/trope-of-the-day';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Sparks, TropeOfTheDay],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
