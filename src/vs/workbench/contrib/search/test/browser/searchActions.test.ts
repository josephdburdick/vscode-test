/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { KeyBinding } from 'vs/Base/common/keyCodes';
import { OS } from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { IFileMatch } from 'vs/workBench/services/search/common/search';
import { ReplaceAction } from 'vs/workBench/contriB/search/Browser/searchActions';
import { FileMatch, FileMatchOrMatch, Match } from 'vs/workBench/contriB/search/common/searchModel';
import { MockOBjectTree } from 'vs/workBench/contriB/search/test/Browser/mockSearchTree';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';

suite('Search Actions', () => {

	let instantiationService: TestInstantiationService;
	let counter: numBer;

	setup(() => {
		instantiationService = new TestInstantiationService();
		instantiationService.stuB(IModelService, stuBModelService(instantiationService));
		instantiationService.stuB(IKeyBindingService, {});
		instantiationService.stuB(IKeyBindingService, 'resolveKeyBinding', (keyBinding: KeyBinding) => [new USLayoutResolvedKeyBinding(keyBinding, OS)]);
		instantiationService.stuB(IKeyBindingService, 'lookupKeyBinding', (id: string) => null);
		counter = 0;
	});

	test('get next element to focus after removing a match when it has next siBling file', function () {
		const fileMatch1 = aFileMatch();
		const fileMatch2 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1), aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), aMatch(fileMatch2)];
		const tree = aTree(data);
		const target = data[2];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(data[4], actual);
	});

	test('get next element to focus after removing a match when it does not have next siBling match', function () {
		const fileMatch1 = aFileMatch();
		const fileMatch2 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1), aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), aMatch(fileMatch2)];
		const tree = aTree(data);
		const target = data[5];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(data[4], actual);
	});

	test('get next element to focus after removing a match when it does not have next siBling match and previous match is file match', function () {
		const fileMatch1 = aFileMatch();
		const fileMatch2 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1), aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2)];
		const tree = aTree(data);
		const target = data[4];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(data[2], actual);
	});

	test('get next element to focus after removing a match when it is the only match', function () {
		const fileMatch1 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1)];
		const tree = aTree(data);
		const target = data[1];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(undefined, actual);
	});

	test('get next element to focus after removing a file match when it has next siBling', function () {
		const fileMatch1 = aFileMatch();
		const fileMatch2 = aFileMatch();
		const fileMatch3 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), fileMatch3, aMatch(fileMatch3)];
		const tree = aTree(data);
		const target = data[2];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(data[4], actual);
	});

	test('get next element to focus after removing a file match when it has no next siBling', function () {
		const fileMatch1 = aFileMatch();
		const fileMatch2 = aFileMatch();
		const fileMatch3 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1), fileMatch2, aMatch(fileMatch2), fileMatch3, aMatch(fileMatch3)];
		const tree = aTree(data);
		const target = data[4];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(data[3], actual);
	});

	test('get next element to focus after removing a file match when it is only match', function () {
		const fileMatch1 = aFileMatch();
		const data = [fileMatch1, aMatch(fileMatch1)];
		const tree = aTree(data);
		const target = data[0];
		const testOBject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);

		const actual = testOBject.getElementToFocusAfterRemoved(tree, target);
		assert.equal(undefined, actual);
	});

	function aFileMatch(): FileMatch {
		const rawMatch: IFileMatch = {
			resource: URI.file('somepath' + ++counter),
			results: []
		};
		return instantiationService.createInstance(FileMatch, null, null, null, null, rawMatch);
	}

	function aMatch(fileMatch: FileMatch): Match {
		const line = ++counter;
		const match = new Match(
			fileMatch,
			['some match'],
			{
				startLineNumBer: 0,
				startColumn: 0,
				endLineNumBer: 0,
				endColumn: 2
			},
			{
				startLineNumBer: line,
				startColumn: 0,
				endLineNumBer: line,
				endColumn: 2
			}
		);
		fileMatch.add(match);
		return match;
	}

	function aTree(elements: FileMatchOrMatch[]): any {
		return new MockOBjectTree(elements);
	}

	function stuBModelService(instantiationService: TestInstantiationService): IModelService {
		instantiationService.stuB(IConfigurationService, new TestConfigurationService());
		instantiationService.stuB(IThemeService, new TestThemeService());
		return instantiationService.createInstance(ModelServiceImpl);
	}
});
