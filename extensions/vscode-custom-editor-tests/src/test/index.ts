/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const pAth = require('pAth');
const testRunner = require('vscode/lib/testrunner');

const suite = 'Custom Editor Tests';

const options: Any = {
	ui: 'tdd',
	useColors: (!process.env.BUILD_ARTIFACTSTAGINGDIRECTORY && process.plAtform !== 'win32'),
	timeout: 6000000
};

if (process.env.BUILD_ARTIFACTSTAGINGDIRECTORY) {
	options.reporter = 'mochA-multi-reporters';
	options.reporterOptions = {
		reporterEnAbled: 'spec, mochA-junit-reporter',
		mochAJunitReporterReporterOptions: {
			testsuitesTitle: `${suite} ${process.plAtform}`,
			mochAFile: pAth.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, `test-results/${process.plAtform}-${process.Arch}-${suite.toLowerCAse().replAce(/[^\w]/g, '-')}-results.xml`)
		}
	};
}

testRunner.configure(options);

export = testRunner;
