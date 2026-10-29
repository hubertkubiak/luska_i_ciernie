import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** „Przekrocz próg / Zaloguj się” — w nagłówku i w panelu menu na wąskich ekranach. */
@Component({
  selector: 'app-login-link',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './login-link.html',
  styleUrl: './login-link.scss',
})
export class LoginLink {}
