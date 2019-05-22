import { ViewItem, WebDriver, VSBrowser, InputBox, Workbench, ActivityBar } from "vscode-extension-tester";
import { createProject, checkTerminalText, deleteProject, setTextAndCheck, quickPick, findNotification, verifyNodeDeletion } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren, notificationExists, NAME_EXISTS } from "../common/conditions";

export function applicationTest(clusterUrl: string) {
    let clusterNode: ViewItem;
    let driver: WebDriver;
    const projectName = 'app-test-project';
    const projectName1 = 'app-test-project1';
    const appName = 'test-application';
    const appName1 = 'test-application1';

    describe('OpenShift Application', () => {
        before(async function() {
            this.timeout(20000);
            driver = VSBrowser.instance.driver;
            const view = await new ActivityBar().getViewControl('OpenShift').openView();
            const explorer = await view.getContent().getSection('openshift application explorer');
            clusterNode = await explorer.findItem(clusterUrl);

            await createProject(projectName, clusterNode, driver);
            await createProject(projectName1, clusterNode, driver);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode, driver);
            await deleteProject(projectName1, clusterNode, driver);
        });

        it('Application can be created from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const menu = await project.openContextMenu();
            await menu.select('New Application');
            await verifyAppCreation(appName, project, driver);

            const notification = findNotification(`Application '${appName}' successfully created`);
            expect(notification).not.undefined;
        });

        it('Application can be created from command palette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, driver);
            await verifyAppCreation(appName1, project, driver);

            const notification = findNotification(`Application '${appName1}' successfully created`);
            expect(notification).not.undefined;
        });

        it('Duplicate application name is not allowed', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, driver);

            const input = await new InputBox().wait();
            await setTextAndCheck(input, appName1, NAME_EXISTS);
            await input.cancel();
        });

        it('Describe works from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select('Describe');

            await checkTerminalText(`odo app describe ${appName} --project ${projectName}`, driver);
        });

        it('Describe works from command palette', async function() {
            this.timeout(20000);
            await new Workbench().executeCommand('openshift describe application');
            await quickPick(projectName1, driver);
            await quickPick(appName1, driver);

            await checkTerminalText(`odo app describe ${appName1} --project ${projectName1}`, driver);
        });

        it('Application can be deleted from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select('Delete');
            await verifyNodeDeletion(appName, project, 'Application', driver, 15000);
        });

        it('Application can be deleted from command palette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift delete application');
            await quickPick(projectName1, driver);
            await quickPick(appName1, driver);
            await verifyNodeDeletion(appName1, project, 'Application', driver, 15000);
        });

        it('Application name is being validated', async function() {
            this.timeout(20000);
            const invalidName = 'Not a valid Application name';
            const invalidLength = 'Application name should be between 2-63 characters';
            new Workbench().executeCommand('openshift new application');
            await quickPick(projectName, driver);

            const input = await new InputBox().wait();
            await setTextAndCheck(input, '1app', invalidName);
            await setTextAndCheck(input, 'a@p#p%', invalidName);
            await setTextAndCheck(input, 'App', invalidName);
            await setTextAndCheck(input, 'a', invalidLength);
            await setTextAndCheck(input, 'this-application-is-definitely-going-to-be-longer-than-63-characters', invalidLength);
            await input.cancel();
        });
    });
}

async function verifyAppCreation(appName: string, project: ViewItem, driver: WebDriver) {
    const input = await new InputBox().wait();
    expect(await input.getMessage()).has.string('Provide Application name');
    await input.setText(appName);
    await input.confirm();
    const apps = await driver.wait(() => { return nodeHasNewChildren(project); }, 5000);

    const names = [];
    for (const app of apps) {
        names.push(app.getLabel());
    }
    expect(names).contains(appName);
}