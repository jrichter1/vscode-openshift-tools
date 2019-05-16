import { Workbench, NotificationType, SideBarView, TerminalView, InputBox, ViewItem } from "vscode-extension-tester";

export async function notificationExists(message: string) {
    try {
        const center = await new Workbench().openNotificationsCenter();
        const notifications = await center.getNotifications(NotificationType.Any);

        for (const item of notifications) {
            const text = await item.getMessage();
            if (text.indexOf(message) > -1) {
                return item;
            }
        }
        return null;
    } catch (err) {
        return null;
    }
}

export async function viewHasNoProgress(view: SideBarView) {
    const content = view.getContent();
    return !await content.hasProgress();
}

export async function terminalHasNoChanges(view: TerminalView, timePeriod: number) {
    const startText = await view.getText();
    await view.getDriver().sleep(timePeriod);
    const endText = await view.getText();
    if (startText === endText) {
        return endText;
    }
    return null;
}

export async function inputHasError(input: InputBox) {
    if (await input.hasError()) {
        return await input.getMessage();
    }
    return null;
}

export async function nodeHasNewChildren(node: ViewItem) {
    try {
        const startChildren = await node.getChildren();
        await node.getDriver().sleep(1000);
        const endChildren = await node.getChildren();
        if (startChildren.length === endChildren.length) {
            return null;
        }
        return endChildren;
    } catch (err) {
        return await node.getChildren();
    }
}