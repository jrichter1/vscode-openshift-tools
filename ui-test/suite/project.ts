import { ViewSection, ViewItem, InputBox, Workbench, ActivityBar } from "vscode-extension-tester";
import { setInputTextAndConfirm, findNotification, setInputTextAndCheck, verifyNodeDeletion, validateName } from "../common/util";
import { nodeHasNewChildren } from "../common/conditions";
import { expect } from 'chai';
import { validation, views, ItemType, notifications, menus } from "../common/constants";

export function projectTest(clusterUrl: string) {
    describe('OpenShift Project', () => {
        let explorer: ViewSection;
        let clusterNode: ViewItem;

        const projectName = 'test-project';
        const projectName1 = 'test-project1';

        before(async () => {
            const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            explorer = await view.getContent().getSection(views.VIEW_TITLE);
            clusterNode = await explorer.findItem(clusterUrl);
        });

        it('New project can be created from context menu', async function() {
            this.timeout(20000);
            const menu = await clusterNode.openContextMenu();
            await menu.select(menus.create(ItemType.project));

            await handleNewProject(projectName, clusterNode);
            const notification = await findNotification(notifications.itemCreated(ItemType.project, projectName));
            expect(notification).not.undefined;
        });

        it('New project can be created from command palette', async function() {
            this.timeout(20000);
            await new Workbench().executeCommand('openshift new project');

            await handleNewProject(projectName1, clusterNode);
            const notification = await findNotification(notifications.itemCreated(ItemType.project, projectName1));
            expect(notification).not.undefined;
        });

        it('Duplicate project name is not allowed', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift new project');

            const input = await new InputBox().wait(3000);
            await setInputTextAndCheck(input, projectName, validation.NAME_EXISTS);
            await input.cancel();
        });

        it('Project can be deleted via context menu', async function() {
            this.timeout(30000);
            const project = await clusterNode.findChildItem(projectName);
            await project.openContextMenu().then((menu) => { menu.select(menus.DELETE); });
            await verifyNodeDeletion(projectName, clusterNode, ItemType.project, 20000);
        });

        it('Project can be deleted via command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift delete project');
            const input = await new InputBox().wait(3000);
            await input.selectQuickPick(projectName1);
            await verifyNodeDeletion(projectName1, clusterNode, ItemType.project, 20000);
        });

        it('Project name is being validated', async function() {
            this.timeout(15000);
            await new Workbench().executeCommand('openshift new project');

            await validateName(ItemType.project);
        });
    });
}

async function handleNewProject(projectName: string,  clusterNode: ViewItem) {
    const input = await new InputBox().wait(3000);
    expect(await input.getMessage()).has.string('Provide Project name');
    await setInputTextAndConfirm(projectName);

    await clusterNode.getDriver().wait(() => { return nodeHasNewChildren(clusterNode); }, 15000);
    const labels = [];
    for (const item of await clusterNode.getChildren()) {
        labels.push(item.getLabel());
    }

    expect(labels).contains(projectName);
}