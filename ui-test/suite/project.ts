import { ViewSection, ViewItem, InputBox, SideBarView, Workbench, WebDriver, VSBrowser } from "vscode-extension-tester";
import { setInputTextAndConfirm, findNotification } from "../common/util";
import { notificationExists, inputHasError, nodeHasNewChildren } from "../common/conditions";
import { expect } from 'chai';

export function projectTest(clusterUrl: string) {
    describe('OpenShift Project', () => {
        let driver: WebDriver;
        let explorer: ViewSection;
        let clusterNode: ViewItem;

        const projectName = 'test-project';
        const projectName1 = 'test-project1';

        before(async () => {
            driver = VSBrowser.instance.driver;
            explorer = (await new SideBarView().getContent().getSections())[0];
            clusterNode = await explorer.findItem(clusterUrl);
        });

        it('New project can be created from cluster node', async function() {
            this.timeout(10000);
            const menu = await clusterNode.openContextMenu();
            await menu.select('New Project');

            await handleNewProject(projectName, clusterNode, driver);
        });

        it('New project can be created from command palette', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift new project');

            await handleNewProject(projectName1, clusterNode, driver);
        });

        it('Project can be deleted via context menu', async function() {
            this.timeout(30000);
            const project = (await clusterNode.getChildren()).find((value) => {
                return value.getLabel() === projectName;
            });
            await project.openContextMenu().then((menu) => { menu.select('Delete'); });
            await handleDeleteProject(projectName, clusterNode, driver);
        });

        it('Project can be deleted via command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift delete project');
            const input = await new InputBox().wait();
            await input.selectQuickPick(projectName1);
            await handleDeleteProject(projectName1, clusterNode, driver);
        });

        it('Project name is being validated', async function() {
            this.timeout(15000);
            const invalidName = 'Not a valid Project name';
            const invalidLength = 'Project name should be between 2-63 characters';
            await new Workbench().executeCommand('openshift new project');

            const input = await new InputBox().wait();
            await setTextAndCheck(input, '1project', invalidName);
            await setTextAndCheck(input, 'Project', invalidName);
            await setTextAndCheck(input, '-$@project', invalidName);
            await setTextAndCheck(input, 'p', invalidLength);
            await setTextAndCheck(input, 'this-project-is-definitely-going-to-be-longer-than-63-characters', invalidLength);
            await input.cancel();
        });
    });
}

async function handleNewProject(projectName: string,  clusterNode: ViewItem, driver: WebDriver) {
    const input = await new InputBox().wait();
    expect(await input.getMessage()).has.string('Provide Project name');
    setInputTextAndConfirm(input, projectName);

    await driver.wait(() => { return nodeHasNewChildren(clusterNode); }, 15000);
    const labels = [];
    for (const item of await clusterNode.getChildren()) {
        labels.push(item.getLabel());
    }

    expect(labels).contains(projectName);
}

async function handleDeleteProject(projectName: string, clusterNode: ViewItem, driver: WebDriver) {
    const notification = await driver.wait(() => { return notificationExists('Do you want to delete Project'); }, 20000);
    await notification.takeAction('Yes');
    await findNotification('Deleting Project');
    await driver.wait(() => { return nodeHasNewChildren(clusterNode); }, 20000);

    const labels = [];
    for (const item of await clusterNode.getChildren()) {
        labels.push(item.getLabel());
    }

    expect(labels).not.to.contain(projectName);
}

async function setTextAndCheck(input: InputBox, text: string, error: string) {
    await input.setText(text);
    const message = await input.getDriver().wait(() => { return inputHasError(input); }, 2000);

    expect(message).has.string(error);
    await input.setText('valid-project');
    await input.getDriver().sleep(500);
}