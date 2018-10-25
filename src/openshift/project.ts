import { OpenShiftItem } from './openshiftItem';
import { OpenShiftObject } from '../odo';
import * as vscode from 'vscode';

export class Project extends OpenShiftItem {

    static async create(): Promise<string> {
        const projectName = await vscode.window.showInputBox({
            prompt: "Mention Project name",
            validateInput: (value: string) => {
                return Project.validateName(value);
            }
        });
        if (!projectName) return Promise.resolve(null);
        return Promise.resolve()
            .then(() => Project.odo.execute(`odo project create ${projectName.trim()}`))
            .then(() => {
                Project.explorer.refresh();
                return `Project '${projectName}' successfully created`;
            })
            .catch((error) => { return Promise.reject(`Failed to create project with error '${error}'`); });
    }

    static async del(context: OpenShiftObject): Promise<string> {
        const value = await vscode.window.showWarningMessage(`Are you sure you want to delete project '${context.getName()}'?`, 'Yes', 'Cancel');
        if (value === 'Yes') {
            return Promise.resolve()
                .then(() => Project.odo.execute(`odo project delete ${context.getName()} -f`))
                .then(() => {
                    Project.explorer.refresh();
                    return `Project '${context.getName()}' successfully deleted`;
                })
                .catch((err) => { return Promise.reject(`Failed to delete project with error '${err}'`); });
        }
        return Promise.resolve(null);
    }

    private static validateName(value: string) {
        const characterRegex = /[a-z0-9]([-a-z0-9]*[a-z0-9])?/;
        if (value.trim().length === 0) {
            return 'Empty project name';
        } else if (!characterRegex.test(value)) {
            return 'Project name should be alphanumeric';
        } else if (!(value.trim().length <= 63)) {
            return 'Project name is to long';
        }
    }
}