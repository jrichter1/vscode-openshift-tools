import { ViewItem, ViewSection, WebDriver, VSBrowser, InputBox, Workbench, DialogHandler, ActivityBar } from "vscode-extension-tester";
import { createProject, createApplication, deleteProject, quickPick, setInputTextAndConfirm, setTextAndCheck, checkTerminalText, verifyNodeDeletion, selectApplication } from "../common/util";
import { nodeHasNewChildren, notificationExists, inputHasQuickPicks, NAME_EXISTS } from "../common/conditions";
import * as path from 'path';
import { Archive } from '../../src/util/archive';
import { expect } from 'chai';

export function componentTest(clusterUrl: string) {
    describe('OpenShift Component', () => {
        let explorer: ViewSection;
        let clusterNode: ViewItem;
        let driver: WebDriver;
        let application: ViewItem;

        const resources = path.resolve('ui-test', 'resources');
        const projectZip = path.join(resources, 'nodejs-ex.zip');
        const testWar = path.join(resources, 'test.war');

        const projectName = 'component-test-project';
        const appName = 'component-test-app';
        const gitRepo = 'https://github.com/sclorg/nodejs-ex';
        const gitComponentName = 'git-component';
        const binaryComponentName = 'binary-component';
        const localComponentName = 'local-component';

        before(async function() {
            this.timeout(30000);
            driver = VSBrowser.instance.driver;
            const view = await new ActivityBar().getViewControl('OpenShift').openView();
            explorer = await view.getContent().getSection('openshift application explorer');
            clusterNode = await explorer.findItem(clusterUrl);
            await createProject(projectName, clusterNode, driver, 10000);
            application = await createApplication(appName, projectName, clusterNode, driver, 5000);
            await Archive.unzip(projectZip, resources);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode, driver);
        });

        it('New Component can be created from context menu', async function() {
            this.timeout(60000);
            const menu = await application.openContextMenu();
            await menu.select('New Component');

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
            await setInputTextAndConfirm(input, gitRepo);
            await driver.wait(() => { return inputHasQuickPicks(input); });
            expect(await input.getPlaceHolder()).has.string('Select git reference');
            await quickPick('HEAD', true);

            await createComponent(gitComponentName, 'nodejs');

            const notification = await driver.wait(() => { return notificationExists('Do you want to clone git repository for created Component?'); }, 5000);
            await notification.takeAction('No');

            await verifyComponent(gitComponentName, application, driver, initItems);
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
            await verifyComponent(localComponentName, application, driver, initItems);
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
            await verifyComponent(binaryComponentName, application, driver, initItems);
        });

        it('Duplicate component name is not allowed', async function() {
            this.timeout(60000);
            await new Workbench().executeCommand('openshift new component from local folder');

            const input = await new InputBox().wait();
            await selectApplication(projectName, appName);
            await quickPick('nodejs-ex', true);

            await setTextAndCheck(input, localComponentName, NAME_EXISTS);
            await input.cancel();
        });

        it('Component name is being validated', async function() {
            this.timeout(60000);
            await new Workbench().executeCommand('openshift new component from local folder');
            const invalidName = 'Not a valid Component name';
            const invalidLength = 'Component name should be between 2-63 characters';

            const input = await new InputBox().wait();
            await selectApplication(projectName, appName);
            await quickPick('nodejs-ex', true);

            await setTextAndCheck(input, '1comp', invalidName);
            await setTextAndCheck(input, 'a@p#p%', invalidName);
            await setTextAndCheck(input, 'Component', invalidName);
            await setTextAndCheck(input, 'c', invalidLength);
            await setTextAndCheck(input, 'this-component-is-definitely-going-to-be-longer-than-63-characters', invalidLength);
            await input.cancel();
        });

        it('Describe works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select('Describe');

            await checkTerminalText(`odo describe ${gitComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Describe works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift describe component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(`odo describe ${localComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Show Log works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select('Show Log');

            await checkTerminalText(`odo log ${gitComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Show Log works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift show component log');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(`odo log ${localComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Follow Log works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select('Follow Log');

            await checkTerminalText(`odo log ${gitComponentName} -f --app ${appName} --project ${projectName}`, driver);
        });

        it('Follow Log works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift follow component log');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(`odo log ${localComponentName} -f --app ${appName} --project ${projectName}`, driver);
        });

        it('Watch works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select('Watch');

            await checkTerminalText(`odo watch ${gitComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Watch works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift watch component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(`odo watch ${localComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Push works from context menu', async function() {
            this.timeout(30000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select('Push');

            await checkTerminalText(`odo push ${gitComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Push works from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift push component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName);

            await checkTerminalText(`odo push ${localComponentName} --app ${appName} --project ${projectName}`, driver);
        });

        it('Open in Browser is available from context menu', async function() {
            this.timeout(15000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            const items = (await menu.getItems()).map((item) => {
                return item.getLabel();
            });
            await menu.close();
            expect(items).contains('Open in Browser');
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
            await menu.select('Link Component');
            const input = await new InputBox().wait();
            expect(await input.getPlaceHolder()).equals('Select a Component to link');

            await quickPick(binaryComponentName);

            await driver.wait(() => {
                return notificationExists(`Component '${binaryComponentName}' successfully linked with Component '${gitComponentName}'`);
            }, 50000);
        });

        it('Linking components works from command palette', async function() {
            this.timeout(60000);
            new Workbench().executeCommand('openshift link component');
            await selectApplication(projectName, appName);
            await quickPick(gitComponentName, true);
            await quickPick(localComponentName);

            await driver.wait(() => {
                return notificationExists(`Component '${localComponentName}' successfully linked with Component '${gitComponentName}'`);
            }, 50000);
        });

        it('Component can be deleted from context menu', async function() {
            this.timeout(60000);
            const component = await application.findChildItem(gitComponentName);
            const menu = await component.openContextMenu();
            await menu.select('Delete');
            await verifyNodeDeletion(gitComponentName, application, 'Component', driver, 30000);
        });

        it('Component can be deleted from command palette', async function() {
            this.timeout(60000);
            new Workbench().executeCommand('openshift delete component');
            await selectApplication(projectName, appName);
            await quickPick(localComponentName, false);
            await verifyNodeDeletion(localComponentName, application, 'Component', driver, 30000);
        });
    });
}

async function createComponent(name: string, type: string, typeVersion: string = 'latest') {
    const input = await new InputBox().wait(3000);
    const driver = input.getDriver();
    expect(await input.getMessage()).has.string('Provide Component name');
    await setInputTextAndConfirm(input, name);

    await driver.wait(() => { return inputHasQuickPicks(input); }, 2000);
    expect(await input.getPlaceHolder()).equals('Component type');
    await quickPick(type, true);

    await driver.wait(() => { return inputHasQuickPicks(input); }, 2000);
    expect(await input.getPlaceHolder()).equals('Component type version');
    await quickPick(typeVersion);
}

async function verifyComponent(name: string, application: ViewItem, driver: WebDriver, initItems: ViewItem[], del: boolean = false) {
    const components = (await driver.wait(() => { return nodeHasNewChildren(application, initItems); }, 40000)).map((item) => {
        return item.getLabel();
    });
    if (del) {
        expect(components).not.contains(name);
    } else {
        expect(components).contains(name);
    }
}