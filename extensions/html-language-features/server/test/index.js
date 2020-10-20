/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const pAth = require('pAth');
const MochA = require('mochA');
const glob = require('glob');

const suite = 'IntegrAtion HTML Extension Tests';

const options = {
	ui: 'tdd',
	useColors: (!process.env.BUILD_ARTIFACTSTAGINGDIRECTORY && process.plAtform !== 'win32'),
	timeout: 60000
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

const mochA = new MochA(options);

glob.sync(__dirnAme + '/../out/test/**/*.test.js')
	.forEAch(file => mochA.AddFile(file));

mochA.run(fAilures => process.exit(fAilures ? -1 : 0));
