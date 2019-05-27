import { ViewSection, ViewItem, InputBox, Workbench, WebDriver, VSBrowser, ActivityBar } from "vscode-extension-tester";
import { setInputTextAndConfirm, findNotification, setTextAndCheck, verifyNodeDeletion } from "../common/util";
import { nodeHasNewChildren, NAME_EXISTS } from "../common/conditions";
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
            const view = await new ActivityBar().getViewControl('OpenShift').openView();
            explorer = await view.getContent().getSection('openshift application explorer');
            clusterNode = await explorer.findItem(clusterUrl);
        });

        it('New project can be created from cluster node', async function() {
            this.timeout(20000);
            const menu = await clusterNode.openContextMenu();
            await menu.select('New Project');

            await handleNewProject(projectName, clusterNode, driver);
            const notification = await findNotification(`Project '${projectName}' successfully created`);
            expect(notification).not.undefined;
        });

        it('New project can be created from command palette', async function() {
            this.timeout(20000);
            await new Workbench().executeCommand('openshift new project');

            await handleNewProject(projectName1, clusterNode, driver);
            const notification = await findNotification(`Project '${projectName1}' successfully created`);
            expect(notification).not.undefined;
        });

        it('Duplicate project name is not allowed', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift new project');

            const input = await new InputBox().wait(3000);
            await setTextAndCheck(input, projectName, NAME_EXISTS);
            await input.cancel();
        });

        it('Project can be deleted via context menu', async function() {
            this.timeout(30000);
            const project = await clusterNode.findChildItem(projectName);
            await project.openContextMenu().then((menu) => { menu.select('Delete'); });
            await verifyNodeDeletion(projectName, clusterNode, 'Project', driver, 20000);
        });

        it('Project can be deleted via command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift delete project');
            const input = await new InputBox().wait(3000);
            await input.selectQuickPick(projectName1);
            await verifyNodeDeletion(projectName1, clusterNode, 'Project', driver, 20000);
        });

        it('Project name is being validated', async function() {
            this.timeout(15000);
            const invalidName = 'Not a valid Project name';
            const invalidLength = 'Project name should be between 2-63 characters';
            await new Workbench().executeCommand('openshift new project');

            const input = await new InputBox().wait(3000);
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
    const input = await new InputBox().wait(3000);
    expect(await input.getMessage()).has.string('Provide Project name');
    setInputTextAndConfirm(input, projectName);

    await driver.wait(() => { return nodeHasNewChildren(clusterNode); }, 15000);
    const labels = [];
    for (const item of await clusterNode.getChildren()) {
        labels.push(item.getLabel());
    }

    expect(labels).contains(projectName);
}