import { ViewSection, ViewItem, InputBox, SideBarView } from "vscode-extension-tester";
import { setInputTextAndConfirm } from "../common/util";
import { notificationsExist } from "../common/conditions";
import { expect } from 'chai';

export function projectTest(clusterUrl: string) {
    describe('OpenShift Project', () => {
        let explorer: ViewSection;
        let clusterNode: ViewItem;

        before(async () => {
            explorer = (await new SideBarView().getContent().getSections())[0];
            clusterNode = await explorer.findItem(clusterUrl);
        });

        it('New project can be created from cluster node', async function() {
            this.timeout(10000);
            const projectName = 'test-project';
            const menu = await clusterNode.openContextMenu();
            await menu.select('New Project');

            const input = new InputBox();
            setInputTextAndConfirm(input, projectName);

            await explorer.getDriver().wait(() => { return notificationsExist(); });
            await clusterNode.collapse();
            const labels = [];
            for (const item of await clusterNode.select()) {
                labels.push(item.getLabel());
            }

            expect(labels).contains(projectName);
        });
    });
}