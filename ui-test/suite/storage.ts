import { ActivityBar, ViewItem } from "vscode-extension-tester";
import { createProject, createApplication, createComponentFromGit, deleteProject } from "../common/util";
import { GIT_REPO, views } from "../common/constants";

export function storageTest(clusterUrl: string) {
    let clusterNode: ViewItem;
    let application: ViewItem;
    let component: ViewItem;

    const projectName = 'storage-test-project';
    const appName = 'storage-test-app';
    const componentName = 'storage-test-component';

    before(async function() {
        this.timeout(50000);
        const view = await new ActivityBar().getViewControl(views.CONTAINER_TITLE).openView();
        const explorer = await view.getContent().getSection(views.VIEW_TITLE);
        clusterNode = await explorer.findItem(clusterUrl);
        await createProject(projectName, clusterNode, 15000);
        application = await createApplication(appName, projectName, clusterNode, 10000);
        component = await createComponentFromGit(componentName, GIT_REPO, appName, projectName, clusterNode, 25000);
    });

    after(async function() {
        this.timeout(30000);
        await deleteProject(projectName, clusterNode);
    });
}