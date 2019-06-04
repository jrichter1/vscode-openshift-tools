import { ViewItem, ViewSection, WebDriver, VSBrowser, InputBox, Workbench, DialogHandler, ActivityBar } from "vscode-extension-tester";
import { createProject, createApplication, deleteProject, quickPick, setInputTextAndConfirm, setInputTextAndCheck, checkTerminalText, verifyNodeDeletion, selectApplication, findNotification, validateName } from "../common/util";
import { nodeHasNewChildren, notificationExists, inputHasQuickPicks } from "../common/conditions";
import * as path from 'path';
import { expect } from 'chai';
import { validation, GIT_REPO, views, ItemType, notifications, odoCommands, menus } from "../common/constants";

export function componentTest(clusterUrl: string) {
    describe('OpenShift Component', () => {
        let explorer: ViewSection;
        let clusterNode: ViewItem;
        let driver: WebDriver;
        let application: ViewItem;

        const resources = path.resolve('ui-test', 'resources');
        const testWar = path.join(resources, 'test.war');

        const projectName = 'component-test-project';
        const appName = 'component-test-app';
        const gitComponentName = 'git-component';
        const binaryComponentName = 'binary-component';
        const localComponentName = 'local-component';

        before(async function() {
            this.timeout(30000);
            driver = VSBrowser.instance.driver;
            const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            explorer = await view.getContent().getSection(views.VIEW_TITLE);
            clusterNode = await explorer.findItem(clusterUrl);
            await createProject(projectName, clusterNode, 10000);
            application = await createApplication(appName, projectName, clusterNode, 5000);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode);
        });

        it('New Component can be created from context menu', async function() {
            this.timeout(60000);
            const menu = await application.openContextMenu();
            await menu.select(menus.create(ItemType.component));

            const input = await new InputBox().wait();
            const labels = [];
            const quickPicks = await input.getQuickPicks();
            for (const item of quickPicks) {
                labels.push(await item.getText());
            }
            expect(labels).contains('Git Repository');
            expect(labels).contains('Binary File');
            expect(labels).contains('Workspace Directory');
        });

        it('New component can be created from Git Repository', async function() {
            this.timeout(60000);
            const initItems = await application.getChildren();
            await new Workbench().executeCommand('openshift new component from git repository');

            const input = await new InputBox().wait();
            await selectApplication(projectName, appName);

            expect(await input.getMessage()).has.string('Git repository URI');
            await setInputTextAndConfirm(GIT_REPO);
            await driver.wait(() => { return inputHasQuickPicks(input); });
            expect(await input.getPlaceHolder()).has.string('Select git reference');
            await quickPick('HEAD', true);

            await createComponent(gitComponentName, 'nodejs');

            const notification = await driver.wait(() => { return notificationExists(notifications.CLONE_REPO); }, 5000);
            await notification.takeAction('No');

            await verifyComponent(gitComponentName, application, initItems);
        });

        it('New component can be created from a workspace folder', async function() {
            this.timeout(60000);
            const initItems = await application.getChildren();
            await new Workbench().executeCommand('openshift new component from local folder');

            const input = await new InputBox().wait();
            await selectApplication(projectName, appName);

            expect(await input.getPlaceHolder()).equals('Select the target workspace folder');
            await quickPick('nodejs-ex', true);

            await createComponent(localComponentName, 'nodejs');
            await verifyComponent(localComponentName, application, initItems);
        });

        it('New component can be created from a binary file', async function() {
            this.timeout(60000);
            const initItems = await application.getChildren();
            await new Workbench().executeCommand('openshift new component from binary');

            await selectApplication(projectName, appName);

            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(testWar);
            await dialog.confirm();

            await createComponent(binaryComponentName, 'wildfly');
            await verifyComponent(binaryComponentName, application, initItems);
        });

        it('Duplicate component name is not allowed', async function() {
            this.timeout(60000);
            await new Workbench().executeCommand('openshift new component from local folder');

            const input = await new InputBox().wait();
            await selectApplication(projectName, appName);
            await quickPick('nodejs-ex', true);

            await setInputTextAndCheck(input, localComponentName, validation.NAME_EXISTS);
            await input.cancel();
        });

        it('Component name is being validated', async function() {
            this.timeout(60000);
            await new Workbench().executeCommand('openshift new component from local folder');

            await selectApplication(projectName, appName);
            await quickPick('nodejs-ex', true);

            await validateName(ItemType.component);
        });

        it('Describe works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.DESCRIBE);

            await checkTerminalText(odoCommands.describeComponent(projectName, appName, gitComponentName));
        });

        it('Describe works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift describe component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(odoCommands.describeComponent(projectName, appName, localComponentName));
        });

        it('Show Log works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.SHOW_LOG);

            await checkTerminalText(odoCommands.showLog(projectName, appName, gitComponentName));
        });

        it('Show Log works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift show component log');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(odoCommands.showLog(projectName, appName, localComponentName));
        });

        it('Follow Log works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.FOLLOW_LOG);

            await checkTerminalText(odoCommands.showLogAndFollow(projectName, appName, gitComponentName));
        });

        it('Follow Log works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift follow component log');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(odoCommands.showLogAndFollow(projectName, appName, localComponentName));
        });

        it('Watch works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.WATCH);

            await checkTerminalText(odoCommands.watchComponent(projectName, appName, gitComponentName));
        });

        it('Watch works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift watch component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(odoCommands.watchComponent(projectName, appName, localComponentName));
        });

        it('Push works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.PUSH);

            await checkTerminalText(odoCommands.pushComponent(projectName, appName, gitComponentName));
        });

        it('Push works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift push component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(odoCommands.pushComponent(projectName, appName, localComponentName));
        });

        it('Open in Browser is available from context menu', async function() {
            this.timeout(15000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            const items = (await menu.getItems()).map((item) => {
                return item.getLabel();
            });
            await menu.close();
            expect(items).contains(menus.OPEN);
        });

        it('Open in Browser is available from command palette', async function() {
            this.timeout(15000);
            const input = await new Workbench().openCommandPrompt();
            await input.setText('>openshift open component in browser');

            const items = await driver.wait(inputHasQuickPicks(input), 5000);
            const labels = [];
            for (const item of items) {
                labels.push(await item.getText());
            }
            await input.cancel();
            expect(labels).contains('OpenShift: Open Component in Browser');
        });

        it('Linking components works from context menu', async function() {
            this.timeout(60000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.link(ItemType.component));
            const input = await new InputBox().wait();
            expect(await input.getPlaceHolder()).equals('Select a Component to link');

            await quickPick(binaryComponentName);

            await driver.wait(() => {
                return notificationExists(notifications.itemsLinked(binaryComponentName, ItemType.component, gitComponentName));
            }, 50000);
        });

        it('Linking components works from command palette', async function() {
            this.timeout(60000);
            new Workbench().executeCommand('openshift link component');
            await selectApplication(projectName, appName);
            await quickPick(gitComponentName, true);
            await quickPick(localComponentName);

            await driver.wait(() => {
                return notificationExists(notifications.itemsLinked(localComponentName, ItemType.component, gitComponentName));
            }, 50000);
        });

        it('Component can be deleted from context menu', async function() {
            this.timeout(60000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select(menus.DELETE);
            await verifyNodeDeletion(gitComponentName, application, ItemType.component, 30000);
        });

        it('Component can be deleted from command palette', async function() {
            this.timeout(60000);
            new Workbench().executeCommand('openshift delete component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName, false);
            await verifyNodeDeletion(localComponentName, application, ItemType.component, 30000);
        });
    });
}

async function createComponent(name: string, type: string, typeVersion: string = 'latest') {
    const input = await new InputBox().wait();
    const driver = input.getDriver();
    expect(await input.getMessage()).has.string('Provide Component name');
    await setInputTextAndConfirm(name);

    await driver.wait(() => { return inputHasQuickPicks(input); }, 6000);
    expect(await input.getPlaceHolder()).equals('Component type');
    await quickPick(type, true);

    await driver.wait(() => { return inputHasQuickPicks(input); }, 6000);
    expect(await input.getPlaceHolder()).equals('Component type version');
    await quickPick(typeVersion);
}

async function verifyComponent(name: string, application: ViewItem, initItems: ViewItem[]) {
    const components = (await application.getDriver().wait(() => { return nodeHasNewChildren(application, initItems); }, 40000)).map((item) => {
        return item.getLabel();
    });
    expect(components).contains(name);
    const notification = findNotification(notifications.itemCreated(ItemType.component, name));
    expect(notification).not.undefined;
}