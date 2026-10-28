import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly starters = [
    { slug: 'fourth-wing', title: 'Fourth Wing' },
    { slug: 'a-court-of-thorns-and-roses', title: 'A Court of Thorns and Roses' },
    { slug: 'the-cruel-prince', title: 'The Cruel Prince' },
    { slug: 'one-dark-window', title: 'One Dark Window' },
    { slug: 'nie-ma-takiej-ksiazki', title: '(ćwiczenie: nieistniejąca księga)' },
  ];
}
