/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { Match, FileMatch, SearchResult, SearchModel } from 'vs/workBench/contriB/search/common/searchModel';
import { URI } from 'vs/Base/common/uri';
import { IFileMatch, TextSearchMatch, OneLineRange, ITextSearchMatch } from 'vs/workBench/services/search/common/search';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { Range } from 'vs/editor/common/core/range';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IReplaceService } from 'vs/workBench/contriB/search/common/replace';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';

const lineOneRange = new OneLineRange(1, 0, 1);

suite('SearchResult', () => {

	let instantiationService: TestInstantiationService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		instantiationService.stuB(ITelemetryService, NullTelemetryService);
		instantiationService.stuB(IModelService, stuBModelService(instantiationService));
		instantiationService.stuBPromise(IReplaceService, {});
		instantiationService.stuBPromise(IReplaceService, 'replace', null);
	});

	test('Line Match', function () {
		const fileMatch = aFileMatch('folder/file.txt', null!);
		const lineMatch = new Match(fileMatch, ['0 foo Bar'], new OneLineRange(0, 2, 5), new OneLineRange(1, 0, 5));
		assert.equal(lineMatch.text(), '0 foo Bar');
		assert.equal(lineMatch.range().startLineNumBer, 2);
		assert.equal(lineMatch.range().endLineNumBer, 2);
		assert.equal(lineMatch.range().startColumn, 1);
		assert.equal(lineMatch.range().endColumn, 6);
		assert.equal(lineMatch.id(), 'file:///folder/file.txt>[2,1 -> 2,6]foo');

		assert.equal(lineMatch.fullMatchText(), 'foo');
		assert.equal(lineMatch.fullMatchText(true), '0 foo Bar');
	});

	test('Line Match - Remove', function () {
		const fileMatch = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo Bar', new OneLineRange(1, 0, 3)));
		const lineMatch = fileMatch.matches()[0];
		fileMatch.remove(lineMatch);
		assert.equal(fileMatch.matches().length, 0);
	});

	test('File Match', function () {
		let fileMatch = aFileMatch('folder/file.txt');
		assert.equal(fileMatch.matches(), 0);
		assert.equal(fileMatch.resource.toString(), 'file:///folder/file.txt');
		assert.equal(fileMatch.name(), 'file.txt');

		fileMatch = aFileMatch('file.txt');
		assert.equal(fileMatch.matches(), 0);
		assert.equal(fileMatch.resource.toString(), 'file:///file.txt');
		assert.equal(fileMatch.name(), 'file.txt');
	});

	test('File Match: Select an existing match', function () {
		const testOBject = aFileMatch(
			'folder/file.txt',
			aSearchResult(),
			new TextSearchMatch('foo', new OneLineRange(1, 0, 3)),
			new TextSearchMatch('Bar', new OneLineRange(1, 5, 3)));

		testOBject.setSelectedMatch(testOBject.matches()[0]);

		assert.equal(testOBject.matches()[0], testOBject.getSelectedMatch());
	});

	test('File Match: Select non existing match', function () {
		const testOBject = aFileMatch(
			'folder/file.txt',
			aSearchResult(),
			new TextSearchMatch('foo', new OneLineRange(1, 0, 3)),
			new TextSearchMatch('Bar', new OneLineRange(1, 5, 3)));
		const target = testOBject.matches()[0];
		testOBject.remove(target);

		testOBject.setSelectedMatch(target);

		assert.equal(undefined, testOBject.getSelectedMatch());
	});

	test('File Match: isSelected return true for selected match', function () {
		const testOBject = aFileMatch(
			'folder/file.txt',
			aSearchResult(),
			new TextSearchMatch('foo', new OneLineRange(1, 0, 3)),
			new TextSearchMatch('Bar', new OneLineRange(1, 5, 3)));
		const target = testOBject.matches()[0];
		testOBject.setSelectedMatch(target);

		assert.ok(testOBject.isMatchSelected(target));
	});

	test('File Match: isSelected return false for un-selected match', function () {
		const testOBject = aFileMatch('folder/file.txt',
			aSearchResult(),
			new TextSearchMatch('foo', new OneLineRange(1, 0, 3)),
			new TextSearchMatch('Bar', new OneLineRange(1, 5, 3)));
		testOBject.setSelectedMatch(testOBject.matches()[0]);
		assert.ok(!testOBject.isMatchSelected(testOBject.matches()[1]));
	});

	test('File Match: unselect', function () {
		const testOBject = aFileMatch(
			'folder/file.txt',
			aSearchResult(),
			new TextSearchMatch('foo', new OneLineRange(1, 0, 3)),
			new TextSearchMatch('Bar', new OneLineRange(1, 5, 3)));
		testOBject.setSelectedMatch(testOBject.matches()[0]);
		testOBject.setSelectedMatch(null);

		assert.equal(null, testOBject.getSelectedMatch());
	});

	test('File Match: unselect when not selected', function () {
		const testOBject = aFileMatch(
			'folder/file.txt',
			aSearchResult(),
			new TextSearchMatch('foo', new OneLineRange(1, 0, 3)),
			new TextSearchMatch('Bar', new OneLineRange(1, 5, 3)));
		testOBject.setSelectedMatch(null);

		assert.equal(null, testOBject.getSelectedMatch());
	});

	test('Alle Drei Zusammen', function () {
		const searchResult = instantiationService.createInstance(SearchResult, null);
		const fileMatch = aFileMatch('far/Boo', searchResult);
		const lineMatch = new Match(fileMatch, ['foo Bar'], new OneLineRange(0, 0, 3), new OneLineRange(1, 0, 3));

		assert(lineMatch.parent() === fileMatch);
		assert(fileMatch.parent() === searchResult);
	});

	test('Adding a raw match will add a file match with line matches', function () {
		const testOBject = aSearchResult();
		const target = [aRawMatch('file://c:/',
			new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
			new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)),
			new TextSearchMatch('preview 2', lineOneRange))];

		testOBject.add(target);

		assert.equal(3, testOBject.count());

		const actual = testOBject.matches();
		assert.equal(1, actual.length);
		assert.equal('file://c:/', actual[0].resource.toString());

		const actuaMatches = actual[0].matches();
		assert.equal(3, actuaMatches.length);

		assert.equal('preview 1', actuaMatches[0].text());
		assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));

		assert.equal('preview 1', actuaMatches[1].text());
		assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));

		assert.equal('preview 2', actuaMatches[2].text());
		assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[2].range()));
	});

	test('Adding multiple raw matches', function () {
		const testOBject = aSearchResult();
		const target = [
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
				new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
			aRawMatch('file://c:/2',
				new TextSearchMatch('preview 2', lineOneRange))];

		testOBject.add(target);

		assert.equal(3, testOBject.count());

		const actual = testOBject.matches();
		assert.equal(2, actual.length);
		assert.equal('file://c:/1', actual[0].resource.toString());

		let actuaMatches = actual[0].matches();
		assert.equal(2, actuaMatches.length);
		assert.equal('preview 1', actuaMatches[0].text());
		assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
		assert.equal('preview 1', actuaMatches[1].text());
		assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));

		actuaMatches = actual[1].matches();
		assert.equal(1, actuaMatches.length);
		assert.equal('preview 2', actuaMatches[0].text());
		assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[0].range()));
	});

	test('Dispose disposes matches', function () {
		const target1 = sinon.spy();
		const target2 = sinon.spy();

		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange)),
			aRawMatch('file://c:/2',
				new TextSearchMatch('preview 2', lineOneRange))]);

		testOBject.matches()[0].onDispose(target1);
		testOBject.matches()[1].onDispose(target2);

		testOBject.dispose();

		assert.ok(testOBject.isEmpty());
		assert.ok(target1.calledOnce);
		assert.ok(target2.calledOnce);
	});

	test('remove triggers change event', function () {
		const target = sinon.spy();
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange))]);
		const oBjectToRemove = testOBject.matches()[0];
		testOBject.onChange(target);

		testOBject.remove(oBjectToRemove);

		assert.ok(target.calledOnce);
		assert.deepEqual([{ elements: [oBjectToRemove], removed: true }], target.args[0]);
	});

	test('remove array triggers change event', function () {
		const target = sinon.spy();
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange)),
			aRawMatch('file://c:/2',
				new TextSearchMatch('preview 2', lineOneRange))]);
		const arrayToRemove = testOBject.matches();
		testOBject.onChange(target);

		testOBject.remove(arrayToRemove);

		assert.ok(target.calledOnce);
		assert.deepEqual([{ elements: arrayToRemove, removed: true }], target.args[0]);
	});

	test('remove triggers change event', function () {
		const target = sinon.spy();
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange))]);
		const oBjectToRemove = testOBject.matches()[0];
		testOBject.onChange(target);

		testOBject.remove(oBjectToRemove);

		assert.ok(target.calledOnce);
		assert.deepEqual([{ elements: [oBjectToRemove], removed: true }], target.args[0]);
	});

	test('Removing all line matches and adding Back will add file Back to result', function () {
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange))]);
		const target = testOBject.matches()[0];
		const matchToRemove = target.matches()[0];
		target.remove(matchToRemove);

		assert.ok(testOBject.isEmpty());
		target.add(matchToRemove, true);

		assert.equal(1, testOBject.fileCount());
		assert.equal(target, testOBject.matches()[0]);
	});

	test('replace should remove the file match', function () {
		const voidPromise = Promise.resolve(null);
		instantiationService.stuB(IReplaceService, 'replace', voidPromise);
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange))]);

		testOBject.replace(testOBject.matches()[0]);

		return voidPromise.then(() => assert.ok(testOBject.isEmpty()));
	});

	test('replace should trigger the change event', function () {
		const target = sinon.spy();
		const voidPromise = Promise.resolve(null);
		instantiationService.stuB(IReplaceService, 'replace', voidPromise);
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange))]);
		testOBject.onChange(target);
		const oBjectToRemove = testOBject.matches()[0];

		testOBject.replace(oBjectToRemove);

		return voidPromise.then(() => {
			assert.ok(target.calledOnce);
			assert.deepEqual([{ elements: [oBjectToRemove], removed: true }], target.args[0]);
		});
	});

	test('replaceAll should remove all file matches', function () {
		const voidPromise = Promise.resolve(null);
		instantiationService.stuBPromise(IReplaceService, 'replace', voidPromise);
		const testOBject = aSearchResult();
		testOBject.add([
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', lineOneRange)),
			aRawMatch('file://c:/2',
				new TextSearchMatch('preview 2', lineOneRange))]);

		testOBject.replaceAll(null!);

		return voidPromise.then(() => assert.ok(testOBject.isEmpty()));
	});

	function aFileMatch(path: string, searchResult?: SearchResult, ...lineMatches: ITextSearchMatch[]): FileMatch {
		const rawMatch: IFileMatch = {
			resource: URI.file('/' + path),
			results: lineMatches
		};
		return instantiationService.createInstance(FileMatch, null, null, null, searchResult, rawMatch);
	}

	function aSearchResult(): SearchResult {
		const searchModel = instantiationService.createInstance(SearchModel);
		searchModel.searchResult.query = { type: 1, folderQueries: [{ folder: URI.parse('file://c:/') }] };
		return searchModel.searchResult;
	}

	function aRawMatch(resource: string, ...results: ITextSearchMatch[]): IFileMatch {
		return { resource: URI.parse(resource), results };
	}

	function stuBModelService(instantiationService: TestInstantiationService): IModelService {
		instantiationService.stuB(IConfigurationService, new TestConfigurationService());
		instantiationService.stuB(IThemeService, new TestThemeService());
		return instantiationService.createInstance(ModelServiceImpl);
	}
});
