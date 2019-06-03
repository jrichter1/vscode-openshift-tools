import { ViewItem, ActivityBar, InputBox, Workbench } from "vscode-extension-tester";
import { views, GIT_REPO, notifications, validation, ItemType, menus } from "../common/constants";
import { createProject, createApplication, createComponentFromGit, deleteProject, setInputTextAndConfirm, findNotification, selectApplication, quickPick, setInputTextAndCheck, validateName, verifyNodeDeletion } from "../common/util";
import { expect } from 'chai';
import { nodeHasNewChildren } from "../common/conditions";

export function urlTest(clusterUrl: string) {
    describe('Component URL', () => {
        let clusterNode: ViewItem;
        let component: ViewItem;

        const projectName = 'url-test-project';
        const appName = 'url-test-app';
        const componentName = 'url-test-component';

        const urlName = 'route';
        const urlName1 = 'route1';

        before(async function() {
            this.timeout(60000);
            const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
            const explorer = await view.getContent().getSection(views.VIEW_TITLE);
            clusterNode = await explorer.findItem(clusterUrl);
            await createProject(projectName, clusterNode, 15000);
            await createApplication(appName, projectName, clusterNode, 10000);
            component = await createComponentFromGit(componentName, GIT_REPO, appName, projectName, clusterNode, 25000);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode);
        });

        it('New URL can be created for a component from context menu', async function() {
            this.timeout(30000);
            const items = await component.getChildren();
            const menu = await component.openContextMenu();
            await menu.select(menus.create(ItemType.url));

            await createUrl(urlName);
            await verifyUrl(urlName, component, items);
        });

        it('New URL can be created for a component from command palette', async function() {
            this.timeout(30000);
            const items = await component.getChildren();
            await new Workbench().executeCommand('openshift new url');
            await selectApplication(projectName, appName);
            await quickPick(componentName, true);

            await createUrl(urlName1);
            await verifyUrl(urlName1, component, items);
        });

        it('Duplicate URL name is not allowed', async function() {
            this.timeout(30000);
            const menu = await component.openContextMenu();
            await menu.select(menus.create(ItemType.url));

            const input = await new InputBox().wait();
            await setInputTextAndCheck(input, urlName, validation.NAME_EXISTS);
            await input.cancel();
        });

        it('URL name is being validated', async function() {
            this.timeout(30000);
            const menu = await component.openContextMenu();
            await menu.select(menus.create(ItemType.url));

            await validateName(ItemType.url);
        });

        it('Open in browser is available for URL item', async function() {
            this.timeout(30000);
            const routes = await component.getChildren();

            for (const route of routes) {
                const button = await route.getActionButton('Open URL');
                expect(button).not.undefined;
            }
        });

        it('URL can be deleted from context menu', async function() {
            this.timeout(30000);
            const url = await component.findChildItem(urlName);
            const menu = await url.openContextMenu();
            await menu.select(menus.DELETE);

            await verifyNodeDeletion(urlName, component, ItemType.url, 20000);
        });

        it('URL can be deleted from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift delete url');
            await selectApplication(projectName, appName);
            await quickPick(componentName);
            await quickPick(urlName1);

            await verifyNodeDeletion(urlName1, component, ItemType.url, 20000);
        });
    });
}

async function createUrl(name: string) {
    const input = await new InputBox().wait();
    expect(await input.getMessage()).has.string('Provide URL name');
    await setInputTextAndConfirm(name);
}

async function verifyUrl(name: string, component: ViewItem, items: ViewItem[]) {
    const newItems = await component.getDriver().wait(() => { return nodeHasNewChildren(component, items); }, 20000);
    const labels = newItems.map((value) => { return value.getLabel(); });
    expect(labels).contains(name);
    const notification = await findNotification(notifications.urlCreated(name, await component.getLabel()));
    expect(notification).not.undefined;
}