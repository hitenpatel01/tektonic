import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AllCommunityModule, ModuleRegistry, provideGlobalGridOptions, themeBalham } from 'ag-grid-community';

const DARK_THEME = themeBalham.withParams({
  accentColor: '#3b82f6',
  backgroundColor: '#13131a',
  borderColor: '#2a2a3e',
  browserColorScheme: 'dark',
  cellHorizontalPaddingScale: 0.6,
  chromeBackgroundColor: '#1a1a26',
  columnHoverColor: 'transparent',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
  fontSize: 10,
  foregroundColor: '#e2e2f0',
  headerBackgroundColor: '#1a1a26',
  oddRowBackgroundColor: '#1a1a26',
  rowHoverColor: '#252535',
  selectedRowBackgroundColor: '#1e2d4a',
  wrapperBorderRadius: 0,
});

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({ theme: DARK_THEME, rowHeight: 20, headerHeight: 24 });

bootstrapApplication(App, appConfig).catch(err => console.error(err));
