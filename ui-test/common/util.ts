import { Workbench, Notification, NotificationType, Input, InputBox, ViewItem, WebDriver, until, By, TerminalView, StatusBar } from "vscode-extension-tester";
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

export async function setInputTextAndConfirm(input: Input, text?: string) {
    if (text) { await input.setText(text); }
    await input.confirm();
    await input.getDriver().sleep(800);
}

export async function setTextAndCheck(input: InputBox, text: string, error: string) {
    await input.setText(text);
    const message = await input.getDriver().wait(() => { return inputHasError(input); }, 2000);

    expect(message).has.string(error);
    await input.setText('validtext');
    await input.getDriver().sleep(800);
}

export async function createProject(name: string, cluster: ViewItem, driver: WebDriver, timeout: number = 5000) {
    const children = await cluster.getChildren();
    await new Workbench().executeCommand('openshift new project');
    const input = await new InputBox().wait(3000);
    await input.setText(name);
    await input.confirm();
    await driver.wait(() => { return nodeHasNewChildren(cluster, children); }, timeout);
}

export async function deleteProject(name: string, cluster: ViewItem, driver: WebDriver) {
    const children = await cluster.getChildren();
    await new Workbench().executeCommand('openshift delete project');
    const input = await new InputBox().wait(3000);
    await input.setText(name);
    await input.confirm();
    const confirmation = await driver.wait(() => { return notificationExists('Do you want to delete Project'); }, 20000);
    await confirmation.takeAction('Yes');
    await driver.wait(() => { return nodeHasNewChildren(cluster, children); }, 20000);
}

export async function createApplication(name: string, projectName: string, cluster: ViewItem, driver: WebDriver, timeout: number = 5000) {
    const project = await cluster.findChildItem(projectName);
    const children = await project.getChildren();
    await new Workbench().executeCommand('openshift new application');
    const input = await new InputBox().wait(3000);
    await input.selectQuickPick(projectName);
    await driver.sleep(800);
    await input.setText(name);
    await input.confirm();
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
    const input = await new InputBox().wait(3000);
    await selectApplication(input, projectName, appName);
    await setInputTextAndConfirm(input, repo);
    await quickPick('master', true);
    await setInputTextAndConfirm(input, name);
    await quickPick('nodejs', true);
    await quickPick('latest');
    const notification = await driver.wait(() => { return notificationExists('Do you want to clone git repository for created Component?'); }, 5000);
    await notification.takeAction('No');
    if (!await application.findChildItem(name)) {
        await driver.wait(() => { return nodeHasNewChildren(application, children); }, timeout);
    }
    return await application.findChildItem(name);
}

export async function checkTerminalText(expectedText: string, driver: WebDriver, timeout: number = 8000, period: number = 2000) {
    await new StatusBar().closeNotificationsCenter();
    await driver.wait(until.elementLocated(By.id('workbench.panel.terminal')));
    const terminalView = await new TerminalView().wait();
    const text = await driver.wait(() => { return terminalHasNoChanges(terminalView, period); }, timeout);
    expect(text).has.string(expectedText);
}

export async function quickPick(title: string, shouldWait: boolean = false) {
    const input = await new InputBox().wait(3000);
    const driver = input.getDriver();
    await driver.wait(() => { return inputHasQuickPicks(input); }, 5000);
    await input.selectQuickPick(title);

    if (shouldWait) {
        const message = await input.getMessage();
        const placeHolder = await input.getPlaceHolder();
        await driver.wait(() => { return inputHasNewMessage(input, message, placeHolder); }, 3000);
    }
}

export async function verifyNodeDeletion(nodeName: string, parent: ViewItem, type: string, driver: WebDriver, timeout: number) {
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

export async function selectApplication(input: InputBox, projectName: string, appName: string) {
    const driver = input.getDriver();
    await quickPick(projectName, driver);
    await quickPick(appName, driver);
}