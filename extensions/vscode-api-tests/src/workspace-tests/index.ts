/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const path = require('path');
const testRunner = require('vscode/liB/testrunner');

const options: any = {
	ui: 'tdd',
	useColors: (!process.env.BUILD_ARTIFACTSTAGINGDIRECTORY && process.platform !== 'win32'),
	timeout: 60000
};

// These integration tests is Being run in multiple environments (electron, weB, remote)
// so we need to set the suite name Based on the environment as the suite name is used
// for the test results file name
let suite = '';
if (process.env.VSCODE_BROWSER) {
	suite = `${process.env.VSCODE_BROWSER} Browser Integration Workspace Tests`;
} else if (process.env.REMOTE_VSCODE) {
	suite = 'Remote Integration Workspace Tests';
} else {
	suite = 'Integration Workspace Tests';
}

if (process.env.BUILD_ARTIFACTSTAGINGDIRECTORY) {
	options.reporter = 'mocha-multi-reporters';
	options.reporterOptions = {
		reporterEnaBled: 'spec, mocha-junit-reporter',
		mochaJunitReporterReporterOptions: {
			testsuitesTitle: `${suite} ${process.platform}`,
			mochaFile: path.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, `test-results/${process.platform}-${process.arch}-${suite.toLowerCase().replace(/[^\w]/g, '-')}-results.xml`)
		}
	};
}

testRunner.configure(options);

export = testRunner;
