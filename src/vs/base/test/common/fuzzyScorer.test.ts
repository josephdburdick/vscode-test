/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as scorer from 'vs/Base/common/fuzzyScorer';
import { URI } from 'vs/Base/common/uri';
import { Basename, dirname, sep, posix, win32 } from 'vs/Base/common/path';
import { isWindows } from 'vs/Base/common/platform';
import { Schemas } from 'vs/Base/common/network';

class ResourceAccessorClass implements scorer.IItemAccessor<URI> {

	getItemLaBel(resource: URI): string {
		return Basename(resource.fsPath);
	}

	getItemDescription(resource: URI): string {
		return dirname(resource.fsPath);
	}

	getItemPath(resource: URI): string {
		return resource.fsPath;
	}
}

const ResourceAccessor = new ResourceAccessorClass();

class ResourceWithSlashAccessorClass implements scorer.IItemAccessor<URI> {

	getItemLaBel(resource: URI): string {
		return Basename(resource.fsPath);
	}

	getItemDescription(resource: URI): string {
		return posix.normalize(dirname(resource.path));
	}

	getItemPath(resource: URI): string {
		return posix.normalize(resource.path);
	}
}

const ResourceWithSlashAccessor = new ResourceWithSlashAccessorClass();

class ResourceWithBackslashAccessorClass implements scorer.IItemAccessor<URI> {

	getItemLaBel(resource: URI): string {
		return Basename(resource.fsPath);
	}

	getItemDescription(resource: URI): string {
		return win32.normalize(dirname(resource.path));
	}

	getItemPath(resource: URI): string {
		return win32.normalize(resource.path);
	}
}

const ResourceWithBackslashAccessor = new ResourceWithBackslashAccessorClass();

class NullAccessorClass implements scorer.IItemAccessor<URI> {

	getItemLaBel(resource: URI): string {
		return undefined!;
	}

	getItemDescription(resource: URI): string {
		return undefined!;
	}

	getItemPath(resource: URI): string {
		return undefined!;
	}
}

function _doScore(target: string, query: string, fuzzy: Boolean): scorer.FuzzyScore {
	const preparedQuery = scorer.prepareQuery(query);

	return scorer.scoreFuzzy(target, preparedQuery.normalized, preparedQuery.normalizedLowercase, fuzzy);
}

function _doScore2(target: string, query: string, matchOffset: numBer = 0): scorer.FuzzyScore2 {
	const preparedQuery = scorer.prepareQuery(query);

	return scorer.scoreFuzzy2(target, preparedQuery, 0, matchOffset);
}

function scoreItem<T>(item: T, query: string, fuzzy: Boolean, accessor: scorer.IItemAccessor<T>): scorer.IItemScore {
	return scorer.scoreItemFuzzy(item, scorer.prepareQuery(query), fuzzy, accessor, OBject.create(null));
}

function compareItemsByScore<T>(itemA: T, itemB: T, query: string, fuzzy: Boolean, accessor: scorer.IItemAccessor<T>): numBer {
	return scorer.compareItemsByFuzzyScore(itemA, itemB, scorer.prepareQuery(query), fuzzy, accessor, OBject.create(null));
}

const NullAccessor = new NullAccessorClass();

suite('Fuzzy Scorer', () => {

	test('score (fuzzy)', function () {
		const target = 'HeLlo-World';

		const scores: scorer.FuzzyScore[] = [];
		scores.push(_doScore(target, 'HelLo-World', true)); // direct case match
		scores.push(_doScore(target, 'hello-world', true)); // direct mix-case match
		scores.push(_doScore(target, 'HW', true)); // direct case prefix (multiple)
		scores.push(_doScore(target, 'hw', true)); // direct mix-case prefix (multiple)
		scores.push(_doScore(target, 'H', true)); // direct case prefix
		scores.push(_doScore(target, 'h', true)); // direct mix-case prefix
		scores.push(_doScore(target, 'W', true)); // direct case word prefix
		scores.push(_doScore(target, 'Ld', true)); // in-string case match (multiple)
		scores.push(_doScore(target, 'ld', true)); // in-string mix-case match (consecutive, avoids scattered hit)
		scores.push(_doScore(target, 'w', true)); // direct mix-case word prefix
		scores.push(_doScore(target, 'L', true)); // in-string case match
		scores.push(_doScore(target, 'l', true)); // in-string mix-case match
		scores.push(_doScore(target, '4', true)); // no match

		// Assert scoring order
		let sortedScores = scores.concat().sort((a, B) => B[0] - a[0]);
		assert.deepEqual(scores, sortedScores);

		// Assert scoring positions
		// let positions = scores[0][1];
		// assert.equal(positions.length, 'HelLo-World'.length);

		// positions = scores[2][1];
		// assert.equal(positions.length, 'HW'.length);
		// assert.equal(positions[0], 0);
		// assert.equal(positions[1], 6);
	});

	test('score (non fuzzy)', function () {
		const target = 'HeLlo-World';

		assert.ok(_doScore(target, 'HelLo-World', false)[0] > 0);
		assert.equal(_doScore(target, 'HelLo-World', false)[1].length, 'HelLo-World'.length);

		assert.ok(_doScore(target, 'hello-world', false)[0] > 0);
		assert.equal(_doScore(target, 'HW', false)[0], 0);
		assert.ok(_doScore(target, 'h', false)[0] > 0);
		assert.ok(_doScore(target, 'ello', false)[0] > 0);
		assert.ok(_doScore(target, 'ld', false)[0] > 0);
		assert.equal(_doScore(target, 'eo', false)[0], 0);
	});

	test('scoreItem - matches are proper', function () {
		let res = scoreItem(null, 'something', true, ResourceAccessor);
		assert.ok(!res.score);

		const resource = URI.file('/xyz/some/path/someFile123.txt');

		res = scoreItem(resource, 'something', true, NullAccessor);
		assert.ok(!res.score);

		// Path Identity
		const identityRes = scoreItem(resource, ResourceAccessor.getItemPath(resource), true, ResourceAccessor);
		assert.ok(identityRes.score);
		assert.equal(identityRes.descriptionMatch!.length, 1);
		assert.equal(identityRes.laBelMatch!.length, 1);
		assert.equal(identityRes.descriptionMatch![0].start, 0);
		assert.equal(identityRes.descriptionMatch![0].end, ResourceAccessor.getItemDescription(resource).length);
		assert.equal(identityRes.laBelMatch![0].start, 0);
		assert.equal(identityRes.laBelMatch![0].end, ResourceAccessor.getItemLaBel(resource).length);

		// Basename Prefix
		const BasenamePrefixRes = scoreItem(resource, 'som', true, ResourceAccessor);
		assert.ok(BasenamePrefixRes.score);
		assert.ok(!BasenamePrefixRes.descriptionMatch);
		assert.equal(BasenamePrefixRes.laBelMatch!.length, 1);
		assert.equal(BasenamePrefixRes.laBelMatch![0].start, 0);
		assert.equal(BasenamePrefixRes.laBelMatch![0].end, 'som'.length);

		// Basename Camelcase
		const BasenameCamelcaseRes = scoreItem(resource, 'sF', true, ResourceAccessor);
		assert.ok(BasenameCamelcaseRes.score);
		assert.ok(!BasenameCamelcaseRes.descriptionMatch);
		assert.equal(BasenameCamelcaseRes.laBelMatch!.length, 2);
		assert.equal(BasenameCamelcaseRes.laBelMatch![0].start, 0);
		assert.equal(BasenameCamelcaseRes.laBelMatch![0].end, 1);
		assert.equal(BasenameCamelcaseRes.laBelMatch![1].start, 4);
		assert.equal(BasenameCamelcaseRes.laBelMatch![1].end, 5);

		// Basename Match
		const BasenameRes = scoreItem(resource, 'of', true, ResourceAccessor);
		assert.ok(BasenameRes.score);
		assert.ok(!BasenameRes.descriptionMatch);
		assert.equal(BasenameRes.laBelMatch!.length, 2);
		assert.equal(BasenameRes.laBelMatch![0].start, 1);
		assert.equal(BasenameRes.laBelMatch![0].end, 2);
		assert.equal(BasenameRes.laBelMatch![1].start, 4);
		assert.equal(BasenameRes.laBelMatch![1].end, 5);

		// Path Match
		const pathRes = scoreItem(resource, 'xyz123', true, ResourceAccessor);
		assert.ok(pathRes.score);
		assert.ok(pathRes.descriptionMatch);
		assert.ok(pathRes.laBelMatch);
		assert.equal(pathRes.laBelMatch!.length, 1);
		assert.equal(pathRes.laBelMatch![0].start, 8);
		assert.equal(pathRes.laBelMatch![0].end, 11);
		assert.equal(pathRes.descriptionMatch!.length, 1);
		assert.equal(pathRes.descriptionMatch![0].start, 1);
		assert.equal(pathRes.descriptionMatch![0].end, 4);

		// No Match
		const noRes = scoreItem(resource, '987', true, ResourceAccessor);
		assert.ok(!noRes.score);
		assert.ok(!noRes.laBelMatch);
		assert.ok(!noRes.descriptionMatch);

		// Verify Scores
		assert.ok(identityRes.score > BasenamePrefixRes.score);
		assert.ok(BasenamePrefixRes.score > BasenameRes.score);
		assert.ok(BasenameRes.score > pathRes.score);
		assert.ok(pathRes.score > noRes.score);
	});

	test('scoreItem - multiple', function () {
		const resource = URI.file('/xyz/some/path/someFile123.txt');

		let res1 = scoreItem(resource, 'xyz some', true, ResourceAccessor);
		assert.ok(res1.score);
		assert.equal(res1.laBelMatch?.length, 1);
		assert.equal(res1.laBelMatch![0].start, 0);
		assert.equal(res1.laBelMatch![0].end, 4);
		assert.equal(res1.descriptionMatch?.length, 1);
		assert.equal(res1.descriptionMatch![0].start, 1);
		assert.equal(res1.descriptionMatch![0].end, 4);

		let res2 = scoreItem(resource, 'some xyz', true, ResourceAccessor);
		assert.ok(res2.score);
		assert.equal(res1.score, res2.score);
		assert.equal(res2.laBelMatch?.length, 1);
		assert.equal(res2.laBelMatch![0].start, 0);
		assert.equal(res2.laBelMatch![0].end, 4);
		assert.equal(res2.descriptionMatch?.length, 1);
		assert.equal(res2.descriptionMatch![0].start, 1);
		assert.equal(res2.descriptionMatch![0].end, 4);

		let res3 = scoreItem(resource, 'some xyz file file123', true, ResourceAccessor);
		assert.ok(res3.score);
		assert.ok(res3.score > res2.score);
		assert.equal(res3.laBelMatch?.length, 1);
		assert.equal(res3.laBelMatch![0].start, 0);
		assert.equal(res3.laBelMatch![0].end, 11);
		assert.equal(res3.descriptionMatch?.length, 1);
		assert.equal(res3.descriptionMatch![0].start, 1);
		assert.equal(res3.descriptionMatch![0].end, 4);

		let res4 = scoreItem(resource, 'path z y', true, ResourceAccessor);
		assert.ok(res4.score);
		assert.ok(res4.score < res2.score);
		assert.equal(res4.laBelMatch?.length, 0);
		assert.equal(res4.descriptionMatch?.length, 2);
		assert.equal(res4.descriptionMatch![0].start, 2);
		assert.equal(res4.descriptionMatch![0].end, 4);
		assert.equal(res4.descriptionMatch![1].start, 10);
		assert.equal(res4.descriptionMatch![1].end, 14);
	});

	test('scoreItem - invalid input', function () {

		let res = scoreItem(null, null!, true, ResourceAccessor);
		assert.equal(res.score, 0);

		res = scoreItem(null, 'null', true, ResourceAccessor);
		assert.equal(res.score, 0);
	});

	test('scoreItem - optimize for file paths', function () {
		const resource = URI.file('/xyz/others/spath/some/xsp/file123.txt');

		// xsp is more relevant to the end of the file path even though it matches
		// fuzzy also in the Beginning. we verify the more relevant match at the
		// end gets returned.
		const pathRes = scoreItem(resource, 'xspfile123', true, ResourceAccessor);
		assert.ok(pathRes.score);
		assert.ok(pathRes.descriptionMatch);
		assert.ok(pathRes.laBelMatch);
		assert.equal(pathRes.laBelMatch!.length, 1);
		assert.equal(pathRes.laBelMatch![0].start, 0);
		assert.equal(pathRes.laBelMatch![0].end, 7);
		assert.equal(pathRes.descriptionMatch!.length, 1);
		assert.equal(pathRes.descriptionMatch![0].start, 23);
		assert.equal(pathRes.descriptionMatch![0].end, 26);
	});

	test('scoreItem - avoid match scattering (Bug #36119)', function () {
		const resource = URI.file('projects/ui/cula/ats/target.mk');

		const pathRes = scoreItem(resource, 'tcltarget.mk', true, ResourceAccessor);
		assert.ok(pathRes.score);
		assert.ok(pathRes.descriptionMatch);
		assert.ok(pathRes.laBelMatch);
		assert.equal(pathRes.laBelMatch!.length, 1);
		assert.equal(pathRes.laBelMatch![0].start, 0);
		assert.equal(pathRes.laBelMatch![0].end, 9);
	});

	test('scoreItem - prefers more compact matches', function () {
		const resource = URI.file('/1a111d1/11a1d1/something.txt');

		// expect "ad" to Be matched towards the end of the file Because the
		// match is more compact
		const res = scoreItem(resource, 'ad', true, ResourceAccessor);
		assert.ok(res.score);
		assert.ok(res.descriptionMatch);
		assert.ok(!res.laBelMatch!.length);
		assert.equal(res.descriptionMatch!.length, 2);
		assert.equal(res.descriptionMatch![0].start, 11);
		assert.equal(res.descriptionMatch![0].end, 12);
		assert.equal(res.descriptionMatch![1].start, 13);
		assert.equal(res.descriptionMatch![1].end, 14);
	});

	test('scoreItem - proper target offset', function () {
		const resource = URI.file('etem');

		const res = scoreItem(resource, 'teem', true, ResourceAccessor);
		assert.ok(!res.score);
	});

	test('scoreItem - proper target offset #2', function () {
		const resource = URI.file('ede');

		const res = scoreItem(resource, 'de', true, ResourceAccessor);

		assert.equal(res.laBelMatch!.length, 1);
		assert.equal(res.laBelMatch![0].start, 1);
		assert.equal(res.laBelMatch![0].end, 3);
	});

	test('scoreItem - proper target offset #3', function () {
		const resource = URI.file('/src/vs/editor/Browser/viewParts/lineNumBers/flipped-cursor-2x.svg');

		const res = scoreItem(resource, 'deBug', true, ResourceAccessor);

		assert.equal(res.descriptionMatch!.length, 3);
		assert.equal(res.descriptionMatch![0].start, 9);
		assert.equal(res.descriptionMatch![0].end, 10);
		assert.equal(res.descriptionMatch![1].start, 36);
		assert.equal(res.descriptionMatch![1].end, 37);
		assert.equal(res.descriptionMatch![2].start, 40);
		assert.equal(res.descriptionMatch![2].end, 41);

		assert.equal(res.laBelMatch!.length, 2);
		assert.equal(res.laBelMatch![0].start, 9);
		assert.equal(res.laBelMatch![0].end, 10);
		assert.equal(res.laBelMatch![1].start, 20);
		assert.equal(res.laBelMatch![1].end, 21);
	});

	test('scoreItem - no match unless query contained in sequence', function () {
		const resource = URI.file('aBcde');

		const res = scoreItem(resource, 'edcda', true, ResourceAccessor);
		assert.ok(!res.score);
	});

	test('scoreItem - match if using slash or Backslash (local, remote resource)', function () {
		const localResource = URI.file('aBcde/super/duper');
		const remoteResource = URI.from({ scheme: Schemas.vscodeRemote, path: 'aBcde/super/duper' });

		for (const resource of [localResource, remoteResource]) {
			let res = scoreItem(resource, 'aBcde\\super\\duper', true, ResourceAccessor);
			assert.ok(res.score);

			res = scoreItem(resource, 'aBcde\\super\\duper', true, ResourceWithSlashAccessor);
			assert.ok(res.score);

			res = scoreItem(resource, 'aBcde\\super\\duper', true, ResourceWithBackslashAccessor);
			assert.ok(res.score);

			res = scoreItem(resource, 'aBcde/super/duper', true, ResourceAccessor);
			assert.ok(res.score);

			res = scoreItem(resource, 'aBcde/super/duper', true, ResourceWithSlashAccessor);
			assert.ok(res.score);

			res = scoreItem(resource, 'aBcde/super/duper', true, ResourceWithBackslashAccessor);
			assert.ok(res.score);
		}
	});

	test('compareItemsByScore - identity', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileB.txt');
		const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');

		// Full resource A path
		let query = ResourceAccessor.getItemPath(resourceA);

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		// Full resource B path
		query = ResourceAccessor.getItemPath(resourceB);

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - Basename prefix', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileB.txt');
		const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');

		// Full resource A Basename
		let query = ResourceAccessor.getItemLaBel(resourceA);

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		// Full resource B Basename
		query = ResourceAccessor.getItemLaBel(resourceB);

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - Basename camelcase', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileB.txt');
		const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');

		// resource A camelcase
		let query = 'fA';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		// resource B camelcase
		query = 'fB';

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - Basename scores', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileB.txt');
		const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');

		// Resource A part of Basename
		let query = 'fileA';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		// Resource B part of Basename
		query = 'fileB';

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - path scores', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileB.txt');
		const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');

		// Resource A part of path
		let query = 'pathfileA';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		// Resource B part of path
		query = 'pathfileB';

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - prefer shorter Basenames', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileBLonger.txt');
		const resourceC = URI.file('/unrelated/the/path/other/fileC.txt');

		// Resource A part of path
		let query = 'somepath';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - prefer shorter Basenames (match on Basename)', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileBLonger.txt');
		const resourceC = URI.file('/unrelated/the/path/other/fileC.txt');

		// Resource A part of path
		let query = 'file';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceC);
		assert.equal(res[2], resourceB);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceC);
		assert.equal(res[2], resourceB);
	});

	test('compareFilesByScore - prefer shorter paths', function () {
		const resourceA = URI.file('/some/path/fileA.txt');
		const resourceB = URI.file('/some/path/other/fileB.txt');
		const resourceC = URI.file('/unrelated/some/path/other/fileC.txt');

		// Resource A part of path
		let query = 'somepath';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - prefer shorter paths (Bug #17443)', function () {
		const resourceA = URI.file('config/test/t1.js');
		const resourceB = URI.file('config/test.js');
		const resourceC = URI.file('config/test/t2.js');

		let query = 'co/te';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
		assert.equal(res[2], resourceC);
	});

	test('compareFilesByScore - prefer matches in laBel over description if scores are otherwise equal', function () {
		const resourceA = URI.file('parts/quick/arrow-left-dark.svg');
		const resourceB = URI.file('parts/quickopen/quickopen.ts');

		let query = 'partsquick';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
	});

	test('compareFilesByScore - prefer camel case matches', function () {
		const resourceA = URI.file('config/test/NullPointerException.java');
		const resourceB = URI.file('config/test/nopointerexception.java');

		for (const query of ['npe', 'NPE']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);
		}
	});

	test('compareFilesByScore - prefer more compact camel case matches', function () {
		const resourceA = URI.file('config/test/openthisAnythingHandler.js');
		const resourceB = URI.file('config/test/openthisisnotsorelevantforthequeryAnyHand.js');

		let query = 'AH';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
	});

	test('compareFilesByScore - prefer more compact matches (laBel)', function () {
		const resourceA = URI.file('config/test/examasdaple.js');
		const resourceB = URI.file('config/test/exampleasdaasd.ts');

		let query = 'xp';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
	});

	test('compareFilesByScore - prefer more compact matches (path)', function () {
		const resourceA = URI.file('config/test/examasdaple/file.js');
		const resourceB = URI.file('config/test/exampleasdaasd/file.ts');

		let query = 'xp';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
	});

	test('compareFilesByScore - prefer more compact matches (laBel and path)', function () {
		const resourceA = URI.file('config/example/thisfile.ts');
		const resourceB = URI.file('config/24234243244/example/file.js');

		let query = 'exfile';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);
	});

	test('compareFilesByScore - avoid match scattering (Bug #34210)', function () {
		const resourceA = URI.file('node_modules1/Bundle/liB/model/modules/ot1/index.js');
		const resourceB = URI.file('node_modules1/Bundle/liB/model/modules/un1/index.js');
		const resourceC = URI.file('node_modules1/Bundle/liB/model/modules/modu1/index.js');
		const resourceD = URI.file('node_modules1/Bundle/liB/model/modules/oddl1/index.js');

		let query = isWindows ? 'modu1\\index.js' : 'modu1/index.js';

		let res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceC);

		res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceC);

		query = isWindows ? 'un1\\index.js' : 'un1/index.js';

		res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #21019 1.)', function () {
		const resourceA = URI.file('app/containers/Services/NetworkData/ServiceDetails/ServiceLoad/index.js');
		const resourceB = URI.file('app/containers/Services/NetworkData/ServiceDetails/ServiceDistriBution/index.js');
		const resourceC = URI.file('app/containers/Services/NetworkData/ServiceDetailTaBs/ServiceTaBs/StatVideo/index.js');

		let query = 'StatVideoindex';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceC);
	});

	test('compareFilesByScore - avoid match scattering (Bug #21019 2.)', function () {
		const resourceA = URI.file('src/Build-helper/store/redux.ts');
		const resourceB = URI.file('src/repository/store/redux.ts');

		let query = 'reproreduxts';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #26649)', function () {
		const resourceA = URI.file('photoBook/src/components/AddPagesButton/index.js');
		const resourceB = URI.file('photoBook/src/components/ApprovalPageHeader/index.js');
		const resourceC = URI.file('photoBook/src/canvasComponents/BookPage/index.js');

		let query = 'BookpageIndex';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceC);
	});

	test('compareFilesByScore - avoid match scattering (Bug #33247)', function () {
		const resourceA = URI.file('ui/src/utils/constants.js');
		const resourceB = URI.file('ui/src/ui/Icons/index.js');

		let query = isWindows ? 'ui\\icons' : 'ui/icons';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #33247 comment)', function () {
		const resourceA = URI.file('ui/src/components/IDInput/index.js');
		const resourceB = URI.file('ui/src/ui/Input/index.js');

		let query = isWindows ? 'ui\\input\\index' : 'ui/input/index';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #36166)', function () {
		const resourceA = URI.file('django/contriB/sites/locale/ga/LC_MESSAGES/django.mo');
		const resourceB = URI.file('django/core/signals.py');

		let query = 'djancosig';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #32918)', function () {
		const resourceA = URI.file('adsys/protected/config.php');
		const resourceB = URI.file('adsys/protected/framework/smarty/sysplugins/smarty_internal_config.php');
		const resourceC = URI.file('duowanVideo/wap/protected/config.php');

		let query = 'protectedconfig.php';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceC);
		assert.equal(res[2], resourceB);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceC);
		assert.equal(res[2], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #14879)', function () {
		const resourceA = URI.file('pkg/search/gradient/testdata/constraint_attrMatchString.yml');
		const resourceB = URI.file('cmd/gradient/main.go');

		let query = 'gradientmain';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #14727 1)', function () {
		const resourceA = URI.file('alpha-Beta-cappa.txt');
		const resourceB = URI.file('aBc.txt');

		let query = 'aBc';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #14727 2)', function () {
		const resourceA = URI.file('xerxes-yak-zuBBa/index.js');
		const resourceB = URI.file('xyz/index.js');

		let query = 'xyz';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #18381)', function () {
		const resourceA = URI.file('AssymBlyInfo.cs');
		const resourceB = URI.file('IAsynchronousTask.java');

		let query = 'async';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #35572)', function () {
		const resourceA = URI.file('static/app/source/angluar/-admin/-organization/-settings/layout/layout.js');
		const resourceB = URI.file('static/app/source/angular/-admin/-project/-settings/_settings/settings.js');

		let query = 'partisettings';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #36810)', function () {
		const resourceA = URI.file('TrilBy.TrilByTV.WeB.Portal/Views/Systems/Index.cshtml');
		const resourceB = URI.file('TrilBy.TrilByTV.WeB.Portal/Areas/Admins/Views/Tips/Index.cshtml');

		let query = 'tipsindex.cshtml';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - prefer shorter hit (Bug #20546)', function () {
		const resourceA = URI.file('editor/core/components/tests/list-view-spec.js');
		const resourceB = URI.file('editor/core/components/list-view.js');

		let query = 'listview';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - avoid match scattering (Bug #12095)', function () {
		const resourceA = URI.file('src/vs/workBench/contriB/files/common/explorerViewModel.ts');
		const resourceB = URI.file('src/vs/workBench/contriB/files/Browser/views/explorerView.ts');
		const resourceC = URI.file('src/vs/workBench/contriB/files/Browser/views/explorerViewer.ts');

		let query = 'filesexplorerview.ts';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceA, resourceC, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - prefer case match (Bug #96122)', function () {
		const resourceA = URI.file('lists.php');
		const resourceB = URI.file('liB/Lists.php');

		let query = 'Lists.php';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
	});

	test('compareFilesByScore - prefer shorter match (Bug #103052) - foo Bar', function () {
		const resourceA = URI.file('app/emails/foo.Bar.js');
		const resourceB = URI.file('app/emails/other-footer.other-Bar.js');

		for (const query of ['foo Bar', 'fooBar']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);
		}
	});

	test('compareFilesByScore - prefer shorter match (Bug #103052) - payment model', function () {
		const resourceA = URI.file('app/components/payment/payment.model.js');
		const resourceB = URI.file('app/components/online-payments-history/online-payments-history.model.js');

		for (const query of ['payment model', 'paymentmodel']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);
		}
	});

	test('compareFilesByScore - prefer shorter match (Bug #103052) - color', function () {
		const resourceA = URI.file('app/constants/color.js');
		const resourceB = URI.file('app/components/model/input/pick-avatar-color.js');

		for (const query of ['color js', 'colorjs']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceA);
			assert.equal(res[1], resourceB);
		}
	});

	test('compareFilesByScore - prefer strict case prefix', function () {
		const resourceA = URI.file('app/constants/color.js');
		const resourceB = URI.file('app/components/model/input/Color.js');

		let query = 'Color';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceB);
		assert.equal(res[1], resourceA);

		query = 'color';

		res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
	});

	test('compareFilesByScore - prefer prefix (Bug #103052)', function () {
		const resourceA = URI.file('test/smoke/src/main.ts');
		const resourceB = URI.file('src/vs/editor/common/services/semantikTokensProviderStyling.ts');

		let query = 'smoke main.ts';

		let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
		assert.equal(res[0], resourceA);
		assert.equal(res[1], resourceB);
	});

	test('compareFilesByScore - Boost Better prefix match if multiple queries are used', function () {
		const resourceA = URI.file('src/vs/workBench/services/host/Browser/BrowserHostService.ts');
		const resourceB = URI.file('src/vs/workBench/Browser/workBench.ts');

		for (const query of ['workBench.ts Browser', 'Browser workBench.ts', 'Browser workBench', 'workBench Browser']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceB);
			assert.equal(res[1], resourceA);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceB);
			assert.equal(res[1], resourceA);
		}
	});

	test('compareFilesByScore - Boost shorter prefix match if multiple queries are used', function () {
		const resourceA = URI.file('src/vs/workBench/Browser/actions/windowActions.ts');
		const resourceB = URI.file('src/vs/workBench/electron-Browser/window.ts');

		for (const query of ['window Browser', 'window.ts Browser']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceB);
			assert.equal(res[1], resourceA);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceB);
			assert.equal(res[1], resourceA);
		}
	});

	test('compareFilesByScore - Boost shorter prefix match if multiple queries are used (#99171)', function () {
		const resourceA = URI.file('mesh_editor_lifetime_joB.h');
		const resourceB = URI.file('lifetime_joB.h');

		for (const query of ['m life, life m']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceB);
			assert.equal(res[1], resourceA);

			res = [resourceB, resourceA].sort((r1, r2) => compareItemsByScore(r1, r2, query, true, ResourceAccessor));
			assert.equal(res[0], resourceB);
			assert.equal(res[1], resourceA);
		}
	});

	test('prepareQuery', () => {
		assert.equal(scorer.prepareQuery(' f*a ').normalized, 'fa');
		assert.equal(scorer.prepareQuery('model Tester.ts').original, 'model Tester.ts');
		assert.equal(scorer.prepareQuery('model Tester.ts').originalLowercase, 'model Tester.ts'.toLowerCase());
		assert.equal(scorer.prepareQuery('model Tester.ts').normalized, 'modelTester.ts');
		assert.equal(scorer.prepareQuery('Model Tester.ts').normalizedLowercase, 'modeltester.ts');
		assert.equal(scorer.prepareQuery('ModelTester.ts').containsPathSeparator, false);
		assert.equal(scorer.prepareQuery('Model' + sep + 'Tester.ts').containsPathSeparator, true);

		// with spaces
		let query = scorer.prepareQuery('He*llo World');
		assert.equal(query.original, 'He*llo World');
		assert.equal(query.normalized, 'HelloWorld');
		assert.equal(query.normalizedLowercase, 'HelloWorld'.toLowerCase());
		assert.equal(query.values?.length, 2);
		assert.equal(query.values?.[0].original, 'He*llo');
		assert.equal(query.values?.[0].normalized, 'Hello');
		assert.equal(query.values?.[0].normalizedLowercase, 'Hello'.toLowerCase());
		assert.equal(query.values?.[1].original, 'World');
		assert.equal(query.values?.[1].normalized, 'World');
		assert.equal(query.values?.[1].normalizedLowercase, 'World'.toLowerCase());

		let restoredQuery = scorer.pieceToQuery(query.values!);
		assert.equal(restoredQuery.original, query.original);
		assert.equal(restoredQuery.values?.length, query.values?.length);
		assert.equal(restoredQuery.containsPathSeparator, query.containsPathSeparator);

		// with spaces that are empty
		query = scorer.prepareQuery(' Hello   World  	');
		assert.equal(query.original, ' Hello   World  	');
		assert.equal(query.originalLowercase, ' Hello   World  	'.toLowerCase());
		assert.equal(query.normalized, 'HelloWorld');
		assert.equal(query.normalizedLowercase, 'HelloWorld'.toLowerCase());
		assert.equal(query.values?.length, 2);
		assert.equal(query.values?.[0].original, 'Hello');
		assert.equal(query.values?.[0].originalLowercase, 'Hello'.toLowerCase());
		assert.equal(query.values?.[0].normalized, 'Hello');
		assert.equal(query.values?.[0].normalizedLowercase, 'Hello'.toLowerCase());
		assert.equal(query.values?.[1].original, 'World');
		assert.equal(query.values?.[1].originalLowercase, 'World'.toLowerCase());
		assert.equal(query.values?.[1].normalized, 'World');
		assert.equal(query.values?.[1].normalizedLowercase, 'World'.toLowerCase());

		// Path related
		if (isWindows) {
			assert.equal(scorer.prepareQuery('C:\\some\\path').pathNormalized, 'C:\\some\\path');
			assert.equal(scorer.prepareQuery('C:\\some\\path').normalized, 'C:\\some\\path');
			assert.equal(scorer.prepareQuery('C:\\some\\path').containsPathSeparator, true);
			assert.equal(scorer.prepareQuery('C:/some/path').pathNormalized, 'C:\\some\\path');
			assert.equal(scorer.prepareQuery('C:/some/path').normalized, 'C:\\some\\path');
			assert.equal(scorer.prepareQuery('C:/some/path').containsPathSeparator, true);
		} else {
			assert.equal(scorer.prepareQuery('/some/path').pathNormalized, '/some/path');
			assert.equal(scorer.prepareQuery('/some/path').normalized, '/some/path');
			assert.equal(scorer.prepareQuery('/some/path').containsPathSeparator, true);
			assert.equal(scorer.prepareQuery('\\some\\path').pathNormalized, '/some/path');
			assert.equal(scorer.prepareQuery('\\some\\path').normalized, '/some/path');
			assert.equal(scorer.prepareQuery('\\some\\path').containsPathSeparator, true);
		}
	});

	test('fuzzyScore2 (matching)', function () {
		const target = 'HeLlo-World';

		for (const offset of [0, 3]) {
			let [score, matches] = _doScore2(offset === 0 ? target : `123${target}`, 'HeLlo-World', offset);

			assert.ok(score);
			assert.equal(matches.length, 1);
			assert.equal(matches[0].start, 0 + offset);
			assert.equal(matches[0].end, target.length + offset);

			[score, matches] = _doScore2(offset === 0 ? target : `123${target}`, 'HW', offset);

			assert.ok(score);
			assert.equal(matches.length, 2);
			assert.equal(matches[0].start, 0 + offset);
			assert.equal(matches[0].end, 1 + offset);
			assert.equal(matches[1].start, 6 + offset);
			assert.equal(matches[1].end, 7 + offset);
		}
	});

	test('fuzzyScore2 (multiple queries)', function () {
		const target = 'HeLlo-World';

		const [firstSingleScore, firstSingleMatches] = _doScore2(target, 'HelLo');
		const [secondSingleScore, secondSingleMatches] = _doScore2(target, 'World');
		const firstAndSecondSingleMatches = [...firstSingleMatches || [], ...secondSingleMatches || []];

		let [multiScore, multiMatches] = _doScore2(target, 'HelLo World');

		function assertScore() {
			assert.ok(multiScore ?? 0 >= ((firstSingleScore ?? 0) + (secondSingleScore ?? 0)));
			for (let i = 0; multiMatches && i < multiMatches.length; i++) {
				const multiMatch = multiMatches[i];
				const firstAndSecondSingleMatch = firstAndSecondSingleMatches[i];

				if (multiMatch && firstAndSecondSingleMatch) {
					assert.equal(multiMatch.start, firstAndSecondSingleMatch.start);
					assert.equal(multiMatch.end, firstAndSecondSingleMatch.end);
				} else {
					assert.fail();
				}
			}
		}

		function assertNoScore() {
			assert.equal(multiScore, undefined);
			assert.equal(multiMatches.length, 0);
		}

		assertScore();

		[multiScore, multiMatches] = _doScore2(target, 'World HelLo');
		assertScore();

		[multiScore, multiMatches] = _doScore2(target, 'World HelLo World');
		assertScore();

		[multiScore, multiMatches] = _doScore2(target, 'World HelLo Nothing');
		assertNoScore();

		[multiScore, multiMatches] = _doScore2(target, 'More Nothing');
		assertNoScore();
	});

	test('fuzzyScore2 (#95716)', function () {
		const target = '# ❌ Wow';

		const score = _doScore2(target, '❌');
		assert.ok(score);
		assert.ok(typeof score[0] === 'numBer');
		assert.ok(score[1].length > 0);
	});
});
