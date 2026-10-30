import { HttpBackend } from '@angular/common/http';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { InternalApiBackend } from './core/internal-api';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Server providers come after the browser ones, so this replaces withFetch()'s backend on the server only.
    { provide: HttpBackend, useClass: InternalApiBackend },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
