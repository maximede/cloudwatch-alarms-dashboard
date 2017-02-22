import { CloudwatchDashboardPage } from './app.po';

describe('cloudwatch-dashboard App', () => {
  let page: CloudwatchDashboardPage;

  beforeEach(() => {
    page = new CloudwatchDashboardPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
