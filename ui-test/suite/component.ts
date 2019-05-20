import { ViewItem, SideBarView, ViewSection, WebDriver, VSBrowser } from "vscode-extension-tester";
import { createProject, createApplication, deleteProject } from "../common/util";

export function componentTest(clusterUrl: string) {
    describe('OpenShift Component', () => {
        let explorer: ViewSection;
        let clusterNode: ViewItem;
        let driver: WebDriver;
        const projectName = 'component-test-project';
        const appName = 'component-test-app';

        before(async function() {
            this.timeout(30000);
            driver = VSBrowser.instance.driver;
            explorer = await new SideBarView().getContent().getSection('openshift application explorer');
            clusterNode = await explorer.findItem(clusterUrl);
            await createProject(projectName, clusterNode, driver);
            await createApplication(appName, projectName, clusterNode, driver);
        });

        after(async function() {
            this.timeout(30000);
            await deleteProject(projectName, clusterNode, driver);
        });

        it('New Component can be created from context menu', async function() {
            this.timeout(60000);
        });
    });
}