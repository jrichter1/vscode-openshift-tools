import { ViewItem, VSBrowser, WebDriver, SideBarView, ViewSection, TerminalView, Workbench, OutputView, until, By } from "vscode-extension-tester";
import { expect } from 'chai';
import { terminalHasNoChanges } from "../common/conditions";

export function clusterTest(clusterUrl: string) {
    describe('OpenShift Cluster Node', () => {
        let driver: WebDriver;
        let explorer: ViewSection;
        let clusterNode: ViewItem;

        before(async () => {
            driver = VSBrowser.instance.driver;
            explorer = (await new SideBarView().getContent().getSections())[0];
            clusterNode = await explorer.findItem(clusterUrl);
        });

        it('List Catalog Components works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select('List Catalog Components');
            await checkTerminalText('odo catalog list components', driver);
        });

        it('List Catalog Components works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift catalog components');
            await checkTerminalText('odo catalog list components', driver);
        });

        it('List Catalog Services works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select('List Catalog Services');
            await checkTerminalText('odo catalog list services', driver);
        });

        it('List Catalog Services works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift catalog services');
            await checkTerminalText('odo catalog list services', driver);
        });

        it('About works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select('About');
            await checkTerminalText('odo version', driver);
        });

        it('Show Output Channel works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift show output');

            await driver.wait(until.elementLocated(By.id('workbench.panel.output')));
            const outputView = await new OutputView().wait();
            expect(await outputView.getCurrentChannel()).equals('OpenShift');
        });

        it('About works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift about');
            await checkTerminalText('odo version', driver);
        });

        it('Show Output Channel works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select('Show Output Channel');

            await driver.wait(until.elementLocated(By.id('workbench.panel.output')));
            const outputView = await new OutputView().wait();
            expect(await outputView.getCurrentChannel()).equals('OpenShift');
        });

        it('Open Console is available', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            const items = (await menu.getItems()).map((value) => {
                return value.getLabel();
            });
            expect(items).contains('Open Console');
            await menu.close();

            const prompt = await new Workbench().openCommandPrompt();
            await prompt.setText('>openshift open console');
            const commands = await prompt.getQuickPicks();

            expect(commands.length).equals(1);
            expect(await commands[0].getText()).equals('OpenShift: Open Console for Current Cluster');
        });
    });
}

async function checkTerminalText(expectedText: string, driver: WebDriver) {
    await driver.wait(until.elementLocated(By.id('workbench.panel.terminal')));
    const terminalView = await new TerminalView().wait();
    const text = await driver.wait(() => { return terminalHasNoChanges(terminalView, 1000); }, 5000);
    expect(text).has.string(expectedText);
}