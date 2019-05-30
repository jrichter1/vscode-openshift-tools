import { ViewItem, VSBrowser, WebDriver, ViewSection, Workbench, OutputView, until, By, ActivityBar } from "vscode-extension-tester";
import { expect } from 'chai';
import { checkTerminalText } from "../common/util";
import { views, odoCommands, menus } from "../common/constants";

export function clusterTest(clusterUrl: string) {
    describe('OpenShift Cluster Node', () => {
        let driver: WebDriver;
        let explorer: ViewSection;
        let clusterNode: ViewItem;

        before(async () => {
            driver = VSBrowser.instance.driver;
            const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            explorer = await view.getContent().getSection(views.VIEW_TITLE);
            clusterNode = await explorer.findItem(clusterUrl);
        });

        it('List Catalog Components works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select(menus.CATALOG_COMPONENTS);
            await checkTerminalText(odoCommands.listCatalogComponents());
        });

        it('List Catalog Components works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift catalog components');
            await checkTerminalText(odoCommands.listCatalogComponents());
        });

        it('List Catalog Services works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select(menus.CATALOG_SERVICES);
            await checkTerminalText(odoCommands.listCatalogServices());
        });

        it('List Catalog Services works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift catalog services');
            await checkTerminalText(odoCommands.listCatalogServices());
        });

        it('About works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select(menus.ABOUT);
            await checkTerminalText(odoCommands.printOdoVersion());
        });

        it('Show Output Channel works from command palette', async function() {
            this.timeout(10000);
            const workbench = await new Workbench();
            await workbench.executeCommand('openshift show output');
            await (await workbench.openNotificationsCenter()).clearAllNotifications();

            await driver.wait(until.elementLocated(By.id('workbench.panel.output')));
            const outputView = await new OutputView().wait();
            expect(await outputView.getCurrentChannel()).equals(views.CONTAINER_TITLE);
        });

        it('About works from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift about');
            await checkTerminalText(odoCommands.printOdoVersion());
        });

        it('Show Output Channel works from context menu', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select(menus.SHOW_OUTPUT);
            await (await new Workbench().openNotificationsCenter()).clearAllNotifications();

            await driver.wait(until.elementLocated(By.id('workbench.panel.output')));
            const outputView = await new OutputView().wait();
            expect(await outputView.getCurrentChannel()).equals(views.CONTAINER_TITLE);
        });

        it('Open Console is available', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            const items = (await menu.getItems()).map((value) => {
                return value.getLabel();
            });
            expect(items).contains(menus.OPEN_CONSOLE);
            await menu.close();

            const prompt = await new Workbench().openCommandPrompt();
            await prompt.setText('>openshift open console');
            const commands = await prompt.getQuickPicks();

            expect(commands.length).equals(1);
            expect(await commands[0].getText()).equals('OpenShift: Open Console for Current Cluster');
        });
    });
}