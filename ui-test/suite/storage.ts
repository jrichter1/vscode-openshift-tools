import { ActivityBar, ViewItem, Workbench, Input, InputBox } from "vscode-extension-tester";
import { createProject, createApplication, createComponentFromGit, deleteProject, setInputTextAndConfirm, quickPick, findNotification, selectApplication, setInputTextAndCheck, verifyNodeDeletion, validateName } from "../common/util";
import { GIT_REPO, views, notifications, ItemType, validation, menus } from "../common/constants";
import { nodeHasNewChildren } from "../common/conditions";
import { expect } from 'chai';

export function storageTest(clusterUrl: string) {
    describe('OpenShift Storage', () => {
        let clusterNode: ViewItem;
        let component: ViewItem;

        const projectName = 'storage-test-project';
        const appName = 'storage-test-app';
        const componentName = 'storage-test-component';
        const storageSizes = ['1Gi', '1.5Gi', '2Gi'];

        const storageName = 'storage';
        const storageName1 = 'storage1';
        const mountPath = '/mnt';
        const mountPath1 = '/mount';

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

        it('New Storage can be created from context menu', async function() {
            this.timeout(30000);
            const items = await component.getChildren();
            const menu = await component.openContextMenu();
            await menu.select(menus.create(ItemType.storage));

            await createStorage(storageName, mountPath, storageSizes[0]);
            await verifyStorage(storageName, component, items);
        });

        it('New Storage can be created from command palette', async function() {
            this.timeout(30000);
            const items = await component.getChildren();
            await new Workbench().executeCommand('openshift new storage');
            await selectApplication(projectName, appName);
            await quickPick(componentName, true);

            await createStorage(storageName1, mountPath1, storageSizes[0]);
            await verifyStorage(storageName1, component, items);
        });

        it('Duplicate Storage name is not allowed', async function() {
            this.timeout(30000);
            const menu = await component.openContextMenu();
            await menu.select(menus.create(ItemType.storage));

            const input = await new InputBox().wait();
            await setInputTextAndCheck(input, storageName, validation.NAME_EXISTS);
            await input.cancel();
        });

        it('Storage name is being validated', async function() {
            this.timeout(30000);
            const menu = await component.openContextMenu();
            await menu.select(menus.create(ItemType.storage));

            await validateName(ItemType.storage);
        });

        it('Storage can be deleted from context menu', async function() {
            this.timeout(30000);
            const storage = await component.findChildItem(storageName);
            const menu = await storage.openContextMenu();
            await menu.select(menus.DELETE);

            await verifyNodeDeletion(storageName, component, ItemType.storage, 25000);
        });

        it('Storage can be deleted from command palette', async function() {
            this.timeout(30000);
            await new Workbench().executeCommand('openshift delete storage');
            await selectApplication(projectName, appName);
            await quickPick(componentName);
            await quickPick(storageName1);

            await verifyNodeDeletion(storageName1, component, ItemType.storage, 20000);
        });
    });
}

async function createStorage(name: string, mountPath: string, size: string) {
    await setInputTextAndConfirm(name, true);
    await setInputTextAndConfirm(mountPath);
    await quickPick(size);
}

async function verifyStorage(name: string, component: ViewItem, items: ViewItem[]) {
    const newItems = await component.getDriver().wait(() => { return nodeHasNewChildren(component, items); }, 20000);
    const labels = newItems.map((value) => { return value.getLabel(); });
    expect(labels).contains(name);
    const notification = await findNotification(notifications.storageCreated(name, await component.getLabel()));
    expect(notification).not.undefined;
}