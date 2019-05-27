import { Workbench, NotificationType, SideBarView, TerminalView, InputBox, ViewItem, ViewSection, Input } from "vscode-extension-tester";

export const NAME_EXISTS = `This name is already used, please enter different name.`;

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

export async function whileNotificationExists(message: string) {
    return !(await notificationExists(message));
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

export async function nodeHasNewChildren(node: ViewItem, startChildren?: ViewItem[]) {
    try {
        if (!startChildren) {
            startChildren = await node.getChildren();
        }
        await node.getDriver().sleep(1000);
        const endChildren = await node.getChildren();
        if (startChildren.length === endChildren.length) {
            return null;
        }
        return endChildren;
    } catch (err) {
        await node.getDriver().sleep(500);
        return await node.getChildren();
    }
}

export async function inputHasQuickPicks(input: Input) {
    const picks = await input.getQuickPicks();
    if (picks.length > 0) {
        return picks;
    }
    return null;
}

export async function inputHasNewMessage(input: InputBox, message: string, placeholder?: string) {
    const currentMessage = await input.getMessage();
    if (currentMessage && (currentMessage !== message)) {
        return true;
    }
    if (placeholder) {
        const currentHolder = await input.getPlaceHolder();
        return (placeholder !== currentHolder) && currentHolder;
    }
    return false;
}

export async function viewHasItems(view: ViewSection) {
    const items = await view.getVisibleItems();
    if (items.length > 0) {
        return items;
    }
    return null;
}