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
export class Home {
  protected readonly starters = [
    { slug: 'fourth-wing', title: 'Fourth Wing' },
    { slug: 'a-court-of-thorns-and-roses', title: 'A Court of Thorns and Roses' },
    { slug: 'the-cruel-prince', title: 'The Cruel Prince' },
    { slug: 'one-dark-window', title: 'One Dark Window' },
    { slug: 'nie-ma-takiej-ksiazki', title: '(ćwiczenie: nieistniejąca księga → 404)' },
    { slug: 'okrutny-ksiaze', title: '(ćwiczenie: stary adres → 301)' },
  ];
}
