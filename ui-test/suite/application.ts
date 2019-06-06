import { ViewItem, InputBox, Workbench, ActivityBar } from "vscode-extension-tester";
import { createProject, checkTerminalText, deleteProject, setInputTextAndCheck, quickPick, findNotification, verifyNodeDeletion, validateName } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren } from "../common/conditions";
import { views, validation, ItemType, notifications, odoCommands, menus } from "../common/constants";

export function applicationTest(clusterUrl: string) {
    let clusterNode: ViewItem;
    const projectName = 'app-test-project';
    const projectName1 = 'app-test-project1';
    const appName = 'test-application';
    const appName1 = 'test-application1';

    describe('OpenShift Application', () => {
        before(async function() {
            this.timeout(20000);
            const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            const explorer = await view.getContent().getSection(views.VIEW_TITLE);
            clusterNode = await explorer.findItem(clusterUrl);

            await createProject(projectName, clusterNode);
            await createProject(projectName1, clusterNode);
        });

        after(async function() {
            this.timeout(60000);
            await deleteProject(projectName, clusterNode);
            await deleteProject(projectName1, clusterNode);
        });

        it('Application can be created from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const menu = await project.openContextMenu();
            await menu.select(menus.create(ItemType.application));
            await verifyAppCreation(appName, project);

            const notification = findNotification(notifications.itemCreated(ItemType.application, appName));
            expect(notification).not.undefined;
        });

        it('Application can be created from command palette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, true);
            await verifyAppCreation(appName1, project);

            const notification = findNotification(notifications.itemCreated(ItemType.application, appName1));
            expect(notification).not.undefined;
        });

        it('Duplicate application name is not allowed', async function() {
            this.timeout(10000);
            await new Workbench().executeCommand('openshift new application');
            await quickPick(projectName1, true);

            const input = await new InputBox().wait();
            await setInputTextAndCheck(input, appName1, validation.NAME_EXISTS);
            await input.cancel();
        });

        it('Describe works from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select(menus.DESCRIBE);

            await checkTerminalText(odoCommands.describeApplication(projectName, appName));
        });

        it('Describe works from command palette', async function() {
            this.timeout(20000);
            await new Workbench().executeCommand('openshift describe application');
            await quickPick(projectName1, true);
            await quickPick(appName1);

            await checkTerminalText(odoCommands.describeApplication(projectName1, appName1));
        });

        it('Application can be deleted from context menu', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName);
            const application = await project.findChildItem(appName);
            const menu = await application.openContextMenu();
            await menu.select(menus.DELETE);
            await verifyNodeDeletion(appName, project, ItemType.application, 15000);
        });

        it('Application can be deleted from command palette', async function() {
            this.timeout(20000);
            const project = await clusterNode.findChildItem(projectName1);
            await new Workbench().executeCommand('openshift delete application');
            await quickPick(projectName1, true);
            await quickPick(appName1);
            await verifyNodeDeletion(appName1, project, ItemType.application, 15000);
        });

        it('Application name is being validated', async function() {
            this.timeout(20000);
            new Workbench().executeCommand('openshift new application');
            await quickPick(projectName, true);

            await validateName(ItemType.application);
        });
    });
}

async function verifyAppCreation(appName: string, project: ViewItem) {
    const input = await new InputBox().wait();
    expect(await input.getMessage()).has.string('Provide Application name');
    await input.setText(appName);
    await input.confirm();
    const apps = await project.getDriver().wait(() => { return nodeHasNewChildren(project); }, 6000);

    const names = [];
    for (const app of apps) {
        names.push(app.getLabel());
    }
    expect(names).contains(appName);
}