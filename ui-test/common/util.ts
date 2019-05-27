import { Workbench, Notification, NotificationType, InputBox, ViewItem, WebDriver, until, By, TerminalView, VSBrowser } from "vscode-extension-tester";
import { nodeHasNewChildren, terminalHasNoChanges, inputHasError, notificationExists, inputHasQuickPicks, inputHasNewMessage } from "./conditions";
import { expect } from "chai";

export async function findNotification(message: string): Promise<Notification> {
    const center = await new Workbench().openNotificationsCenter();

    for (const item of await center.getNotifications(NotificationType.Info)) {
        const text = await item.getMessage();
        if (text.indexOf(message) > -1) {
            return item;
        }
    }
}

export async function setInputTextAndConfirm(text?: string, shouldWait: boolean = false) {
    const input = await new InputBox().wait(3000);
    const message = await input.getMessage();
    const holder = await input.getPlaceHolder();

    if (text) { await input.setText(text); }
    await input.confirm();

    if (shouldWait) {
        await input.getDriver().wait(() => { return inputHasNewMessage(input, message, holder); }, 3000);
    }
}

export async function setInputTextAndCheck(input: InputBox, text: string, error: string) {
    await input.setText(text);
    const message = await input.getDriver().wait(() => { return inputHasError(input); }, 2000);

    expect(message).has.string(error);
    await input.setText('validtext');
    await input.getDriver().wait(() => { return inputHasNewMessage(input, message); }, 2000);
}

export async function createProject(name: string, cluster: ViewItem, timeout: number = 5000) {
    const children = await cluster.getChildren();
    await new Workbench().executeCommand('openshift new project');
    await setInputTextAndConfirm(name);
    await cluster.getDriver().wait(() => { return nodeHasNewChildren(cluster, children); }, timeout);
}

export async function deleteProject(name: string, cluster: ViewItem) {
    const driver = await cluster.getDriver();
    const children = await cluster.getChildren();
    await new Workbench().executeCommand('openshift delete project');
    await setInputTextAndConfirm(name);
    const confirmation = await driver.wait(() => { return notificationExists('Do you want to delete Project'); }, 20000);
    await confirmation.takeAction('Yes');
    try {
        await driver.wait(() => { return nodeHasNewChildren(cluster, children); }, 20000);
    } catch (err) {
        // try again if the project disappears right as it is being looked up
        await driver.wait(() => { return nodeHasNewChildren(cluster, children); }, 2000);
    }
}

export async function createApplication(name: string, projectName: string, cluster: ViewItem, timeout: number = 5000) {
    const driver = await cluster.getDriver();
    const project = await cluster.findChildItem(projectName);
    const children = await project.getChildren();
    await new Workbench().executeCommand('openshift new application');
    await quickPick(projectName, true);
    await setInputTextAndConfirm(name);
    if (!await project.findChildItem(name)) {
        await driver.wait(() => { return nodeHasNewChildren(project, children); }, timeout);
    }
    return await project.findChildItem(name);
}

export async function createComponentFromGit(name: string, repo: string, appName: string, projectName: string, cluster: ViewItem, timeout: number = 20000) {
    const driver = cluster.getDriver();
    const project = await cluster.findChildItem(projectName);
    const application = await project.findChildItem(appName);
    const children = await application.getChildren();
    await new Workbench().executeCommand('openshift new component from git');
    await selectApplication(projectName, appName);
    await setInputTextAndConfirm(repo);
    await quickPick('master', true);
    await setInputTextAndConfirm(name);
    await quickPick('nodejs', true);
    await quickPick('latest');
    const notification = await driver.wait(() => { return notificationExists('Do you want to clone git repository for created Component?'); }, 5000);
    await notification.takeAction('No');
    if (!await application.findChildItem(name)) {
        await driver.wait(() => { return nodeHasNewChildren(application, children); }, timeout);
    }
    return await application.findChildItem(name);
}

export async function checkTerminalText(expectedText: string, timeout: number = 8000, period: number = 2000) {
    const driver = await VSBrowser.instance.driver;
    await (await new Workbench().openNotificationsCenter()).clearAllNotifications();
    await driver.wait(until.elementLocated(By.id('workbench.panel.terminal')));
    const terminalView = await new TerminalView().wait();
    const text = await driver.wait(() => { return terminalHasNoChanges(terminalView, period); }, timeout);
    expect(text).has.string(expectedText);
}

export async function quickPick(title: string, shouldWait: boolean = false) {
    const input = await new InputBox().wait(3000);
    const driver = input.getDriver();
    await driver.wait(() => { return inputHasQuickPicks(input); }, 5000);
    const message = await input.getMessage();
    const placeHolder = await input.getPlaceHolder();
    await input.selectQuickPick(title);

    if (shouldWait) {
        await driver.wait(() => { return inputHasNewMessage(input, message, placeHolder); }, 3000);
    }
}

export async function verifyNodeDeletion(nodeName: string, parent: ViewItem, type: string, timeout: number) {
    const driver = parent.getDriver();
    const initItems = await parent.getChildren();
    const confirmation = await driver.wait(() => {
        return notificationExists(`Do you want to delete ${type} '${nodeName}'?`);
    });
    await confirmation.takeAction('Yes');
    await driver.wait(() => { return notificationExists(`${type} '${nodeName}' successfully deleted`); }, (timeout > 3000) ? timeout - 2000 : 2000);
    let items: ViewItem[];
    try {
        items = await driver.wait(() => { return nodeHasNewChildren(parent, initItems); }, 2000);
    } catch (err) {
        // retry if the item got deleted right as it was being looked up
        items = await driver.wait(() => { return nodeHasNewChildren(parent, initItems); }, 2000);
    }
    const item = items.find((item) => { return item.getLabel() === nodeName; });
    expect(item).undefined;
}

export async function selectApplication(projectName: string, appName: string) {
    await quickPick(projectName, true);
    await quickPick(appName);
}