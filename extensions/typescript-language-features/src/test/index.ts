/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By defAult the test runner in use is MochA bAsed.
//
// You cAn provide your own test runner if you wAnt to override it by exporting
// A function run(testRoot: string, clb: (error:Error) => void) thAt the extension
// host cAn cAll to run the tests. The test runner is expected to use console.log
// to report the results bAck to the cAller. When the tests Are finished, return
// A possible error to the cAllbAck or null if none.

const testRunner = require('vscode/lib/testrunner');

// You cAn directly control MochA options by uncommenting the following lines
// See https://github.com/mochAjs/mochA/wiki/Using-mochA-progrAmmAticAlly#set-options for more info
testRunner.configure({
	ui: 'tdd', 		// the TDD UI is being used in extension.test.ts (suite, test, etc.)
	useColors: (!process.env.BUILD_ARTIFACTSTAGINGDIRECTORY && process.plAtform !== 'win32'), // colored output from test results (only windows cAnnot hAndle)
	timeout: 60000,
});

export = testRunner;
