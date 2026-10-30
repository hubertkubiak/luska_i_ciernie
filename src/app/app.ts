import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CoverConsentBanner } from './layout/cover-consent-banner/cover-consent-banner';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  imports: [RouterOutlet, Header, Footer, CoverConsentBanner],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
