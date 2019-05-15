import { ViewSection, ViewItem, InputBox, SideBarView, Workbench, WebDriver, VSBrowser } from "vscode-extension-tester";
import { setInputTextAndConfirm, findNotification } from "../common/util";
import { notificationsExist, notificationExists } from "../common/conditions";
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
    });
}

async function handleNewProject(projectName: string,  clusterNode: ViewItem, driver: WebDriver) {
    const input = await new InputBox().wait();
    expect(await input.getMessage()).has.string('Provide Project name');
    setInputTextAndConfirm(input, projectName);

    await driver.wait(() => { return notificationsExist(); }, 5000);
    const labels = [];
    await driver.sleep(2000);
    for (const item of await clusterNode.getChildren()) {
        labels.push(item.getLabel());
    }

    expect(labels).contains(projectName);
}

async function handleDeleteProject(projectName: string, clusterNode: ViewItem, driver: WebDriver) {
    const notification = await driver.wait(() => { return notificationExists('Do you want to delete Project'); }, 20000);
    await notification.takeAction('Yes');
    await findNotification('Deleting Project');
    await driver.wait(() => { return notificationExists(`Project '${projectName}' successfully deleted`); }, 20000);

    const labels = [];
    await driver.sleep(1000);
    for (const item of await clusterNode.getChildren()) {
        labels.push(item.getLabel());
    }

    expect(labels).not.to.contain(projectName);
}