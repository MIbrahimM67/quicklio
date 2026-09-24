import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./qa',
  timeout:30000,
  expect:{timeout:8000},
  fullyParallel:false,
  retries:0,
  reporter:[['line'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:8000',
    headless:true,
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
    video:'off'
  },
  webServer:{
    command:'python3 -m http.server 8000 --bind 127.0.0.1',
    url:'http://127.0.0.1:8000',
    reuseExistingServer:true,
    timeout:15000
  },
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}}
  ]
});
