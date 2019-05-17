import { ViewItem, SideBarView, WebDriver, VSBrowser, InputBox, Workbench } from "vscode-extension-tester";
import { createProject, checkTerminalText, deleteProject, setTextAndCheck } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren, notificationExists } from "../common/conditions";

export function applicationTest(clusterUrl: string) {
    let clusterNode: ViewItem;
    let driver: WebDriver;
    const projectName = 'app-test-project';
    const projectName1 = 'app-test-project1';
    const appName = 'test-application';

    describe('OpenShift Application', () => {
        before(async function() {
            this.timeout(20000);
            driver = VSBrowser.instance.driver;
            const explorer = await new SideBarView().getContent().getSection('openshift application explorer');
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
        });

        it('Application can be created from command pallette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, driver);
            await verifyAppCreation(appName, project, driver);
        });

        it('Describe works from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select('Describe');

            await checkTerminalText(`odo app describe ${appName} --project ${projectName}`, driver);
        });

        it('Describe works from command pallette', async function() {
            this.timeout(20000);
            await new Workbench().executeCommand('openshift describe application');
            await quickPick(projectName1, driver);
            await quickPick(appName, driver);

            await checkTerminalText(`odo app describe ${appName} --project ${projectName1}`, driver);
        });

        it('Application can be deleted from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select('Delete');
            await verifyAppDeletion(appName, project, driver);
        });

        it('Application can be deleted from command pallette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift delete application');
            await quickPick(projectName1, driver);
            await quickPick(appName, driver);
            await verifyAppDeletion(appName, project, driver);
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
        });
    });
}

async function verifyAppDeletion(appName: string, project: ViewItem, driver: WebDriver) {
    const confirmation = await driver.wait(() => {
        return notificationExists(`Do you want to delete Application '${appName}'?`);
    });
    await confirmation.takeAction('Yes');
    const apps = await driver.wait(() => { return nodeHasNewChildren(project); });
    const app = apps.find((item) => { return item.getLabel() === appName; });
    expect(app).undefined;
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

async function quickPick(title: string, driver: WebDriver) {
    const input = await new InputBox().wait();
    await input.selectQuickPick(title);
    await driver.sleep(500);
}