/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as odo from '../src/odo';
import  { ICli, CliExitData } from '../src/cli';
import * as assert from 'assert';

suite("odo integration tests", () => {

    function create(stdout: string) {
        return {
            execute : (cmd: string, env: any): Promise<CliExitData> => {
                return Promise.resolve({
                    error: undefined,
                    stderr: '',
                    stdout
                });
            }
        };
    }

    suite('odo commands', () => {
        test('odo-getVersion() returns version number with expected output', async () => {
            const odoVersionCli: ICli = create([
               'odo v0.0.13 (65b5bed8)',
               'Unable to connect to OpenShift cluster, is it down?'
            ].join('\n'));
            const result: string = await odo.create(odoVersionCli).getOdoVersion();
            assert(result === '0.0.13');
        });

        test('odo-getVersion() returns version 0.0.0 for unexpected output', async () => {
            const odoVersionCli: ICli = create([
               'odounexpected v0.0.13 (65b5bed8)',
               'Unable to connect to OpenShift cluster, is it down?'
            ].join('\n'));
            const result: string = await odo.create(odoVersionCli).getOdoVersion();
            assert(result === '0.0.0');
        });
    });

    suite("odo catalog integration", () => {
        const http = 'httpd';
        const nodejs = 'nodejs';
        const python = 'python';

        const odoCatalogCli: ICli = create([
            `NAME            PROJECT                 TAGS`,
            `${nodejs}       openshift               1.0`,
            `${python}       openshift               1.0,2.0`,
            `${http}         openshift               2.2,2.3,latest`
        ].join('\n'));
        let result: string[];

        suiteSetup(async () => {
            result = await odo.create(odoCatalogCli).getComponentTypes();
        });

        test("Odo->getComponentTypes() returns correct number of component types", () => {
            assert(result.length === 3);
        });

        test("Odo->getComponentTypes() returns correct component type names", () => {
            const resultArray = result.filter((element: string) => {
                return element === http || element === nodejs || element === python;
            });
            assert(resultArray.length === 3);
        });

        test("Odo->getComponentTypeVersions() returns correct number of tags for component type", () => {
            return Promise.all([
                odo.create(odoCatalogCli).getComponentTypeVersions(nodejs).then((result)=> {
                    assert(result.length === 1);
                }),
                odo.create(odoCatalogCli).getComponentTypeVersions(python).then((result)=> {
                    assert(result.length === 2);
                }),
                odo.create(odoCatalogCli).getComponentTypeVersions(http).then((result)=> {
                    assert(result.length === 3);
                })
            ]);
        });
    });

    suite("odo service integration", () => {
        const svc1 = 'svc1';
        const svc2 = 'svc2';
        const svc3 = 'svc3';

        const odoProjCli: ICli = create([
            `NAME      PLANS`,
            `${svc1}   default,free,paid`,
            `${svc2}   default,free`,
            `${svc3}   default`
        ].join('\n'));

        test("Odo->getServiceTemplates() returns correct number of services", async () => {
            const result: string[] = await odo.create(odoProjCli).getServiceTemplates();
            assert(result.length === 3);
            assert(result[0] === svc1);
            assert(result[1] === svc2);
            assert(result[2] === svc3);
        });

        test("Odo->getServiceTemplatePlans(service) returns correct number of plans fro service", async () => {
            const result: string[] = await odo.create(odoProjCli).getServiceTemplatePlans(svc1);
            assert(result.length === 3);
            assert(result[0] === 'default');
            assert(result[1] === 'free');
            assert(result[2] === 'paid');
        });
    });

});