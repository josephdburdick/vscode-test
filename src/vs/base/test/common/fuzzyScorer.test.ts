/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As scorer from 'vs/bAse/common/fuzzyScorer';
import { URI } from 'vs/bAse/common/uri';
import { bAsenAme, dirnAme, sep, posix, win32 } from 'vs/bAse/common/pAth';
import { isWindows } from 'vs/bAse/common/plAtform';
import { SchemAs } from 'vs/bAse/common/network';

clAss ResourceAccessorClAss implements scorer.IItemAccessor<URI> {

	getItemLAbel(resource: URI): string {
		return bAsenAme(resource.fsPAth);
	}

	getItemDescription(resource: URI): string {
		return dirnAme(resource.fsPAth);
	}

	getItemPAth(resource: URI): string {
		return resource.fsPAth;
	}
}

const ResourceAccessor = new ResourceAccessorClAss();

clAss ResourceWithSlAshAccessorClAss implements scorer.IItemAccessor<URI> {

	getItemLAbel(resource: URI): string {
		return bAsenAme(resource.fsPAth);
	}

	getItemDescription(resource: URI): string {
		return posix.normAlize(dirnAme(resource.pAth));
	}

	getItemPAth(resource: URI): string {
		return posix.normAlize(resource.pAth);
	}
}

const ResourceWithSlAshAccessor = new ResourceWithSlAshAccessorClAss();

clAss ResourceWithBAckslAshAccessorClAss implements scorer.IItemAccessor<URI> {

	getItemLAbel(resource: URI): string {
		return bAsenAme(resource.fsPAth);
	}

	getItemDescription(resource: URI): string {
		return win32.normAlize(dirnAme(resource.pAth));
	}

	getItemPAth(resource: URI): string {
		return win32.normAlize(resource.pAth);
	}
}

const ResourceWithBAckslAshAccessor = new ResourceWithBAckslAshAccessorClAss();

clAss NullAccessorClAss implements scorer.IItemAccessor<URI> {

	getItemLAbel(resource: URI): string {
		return undefined!;
	}

	getItemDescription(resource: URI): string {
		return undefined!;
	}

	getItemPAth(resource: URI): string {
		return undefined!;
	}
}

function _doScore(tArget: string, query: string, fuzzy: booleAn): scorer.FuzzyScore {
	const prepAredQuery = scorer.prepAreQuery(query);

	return scorer.scoreFuzzy(tArget, prepAredQuery.normAlized, prepAredQuery.normAlizedLowercAse, fuzzy);
}

function _doScore2(tArget: string, query: string, mAtchOffset: number = 0): scorer.FuzzyScore2 {
	const prepAredQuery = scorer.prepAreQuery(query);

	return scorer.scoreFuzzy2(tArget, prepAredQuery, 0, mAtchOffset);
}

function scoreItem<T>(item: T, query: string, fuzzy: booleAn, Accessor: scorer.IItemAccessor<T>): scorer.IItemScore {
	return scorer.scoreItemFuzzy(item, scorer.prepAreQuery(query), fuzzy, Accessor, Object.creAte(null));
}

function compAreItemsByScore<T>(itemA: T, itemB: T, query: string, fuzzy: booleAn, Accessor: scorer.IItemAccessor<T>): number {
	return scorer.compAreItemsByFuzzyScore(itemA, itemB, scorer.prepAreQuery(query), fuzzy, Accessor, Object.creAte(null));
}

const NullAccessor = new NullAccessorClAss();

suite('Fuzzy Scorer', () => {

	test('score (fuzzy)', function () {
		const tArget = 'HeLlo-World';

		const scores: scorer.FuzzyScore[] = [];
		scores.push(_doScore(tArget, 'HelLo-World', true)); // direct cAse mAtch
		scores.push(_doScore(tArget, 'hello-world', true)); // direct mix-cAse mAtch
		scores.push(_doScore(tArget, 'HW', true)); // direct cAse prefix (multiple)
		scores.push(_doScore(tArget, 'hw', true)); // direct mix-cAse prefix (multiple)
		scores.push(_doScore(tArget, 'H', true)); // direct cAse prefix
		scores.push(_doScore(tArget, 'h', true)); // direct mix-cAse prefix
		scores.push(_doScore(tArget, 'W', true)); // direct cAse word prefix
		scores.push(_doScore(tArget, 'Ld', true)); // in-string cAse mAtch (multiple)
		scores.push(_doScore(tArget, 'ld', true)); // in-string mix-cAse mAtch (consecutive, Avoids scAttered hit)
		scores.push(_doScore(tArget, 'w', true)); // direct mix-cAse word prefix
		scores.push(_doScore(tArget, 'L', true)); // in-string cAse mAtch
		scores.push(_doScore(tArget, 'l', true)); // in-string mix-cAse mAtch
		scores.push(_doScore(tArget, '4', true)); // no mAtch

		// Assert scoring order
		let sortedScores = scores.concAt().sort((A, b) => b[0] - A[0]);
		Assert.deepEquAl(scores, sortedScores);

		// Assert scoring positions
		// let positions = scores[0][1];
		// Assert.equAl(positions.length, 'HelLo-World'.length);

		// positions = scores[2][1];
		// Assert.equAl(positions.length, 'HW'.length);
		// Assert.equAl(positions[0], 0);
		// Assert.equAl(positions[1], 6);
	});

	test('score (non fuzzy)', function () {
		const tArget = 'HeLlo-World';

		Assert.ok(_doScore(tArget, 'HelLo-World', fAlse)[0] > 0);
		Assert.equAl(_doScore(tArget, 'HelLo-World', fAlse)[1].length, 'HelLo-World'.length);

		Assert.ok(_doScore(tArget, 'hello-world', fAlse)[0] > 0);
		Assert.equAl(_doScore(tArget, 'HW', fAlse)[0], 0);
		Assert.ok(_doScore(tArget, 'h', fAlse)[0] > 0);
		Assert.ok(_doScore(tArget, 'ello', fAlse)[0] > 0);
		Assert.ok(_doScore(tArget, 'ld', fAlse)[0] > 0);
		Assert.equAl(_doScore(tArget, 'eo', fAlse)[0], 0);
	});

	test('scoreItem - mAtches Are proper', function () {
		let res = scoreItem(null, 'something', true, ResourceAccessor);
		Assert.ok(!res.score);

		const resource = URI.file('/xyz/some/pAth/someFile123.txt');

		res = scoreItem(resource, 'something', true, NullAccessor);
		Assert.ok(!res.score);

		// PAth Identity
		const identityRes = scoreItem(resource, ResourceAccessor.getItemPAth(resource), true, ResourceAccessor);
		Assert.ok(identityRes.score);
		Assert.equAl(identityRes.descriptionMAtch!.length, 1);
		Assert.equAl(identityRes.lAbelMAtch!.length, 1);
		Assert.equAl(identityRes.descriptionMAtch![0].stArt, 0);
		Assert.equAl(identityRes.descriptionMAtch![0].end, ResourceAccessor.getItemDescription(resource).length);
		Assert.equAl(identityRes.lAbelMAtch![0].stArt, 0);
		Assert.equAl(identityRes.lAbelMAtch![0].end, ResourceAccessor.getItemLAbel(resource).length);

		// BAsenAme Prefix
		const bAsenAmePrefixRes = scoreItem(resource, 'som', true, ResourceAccessor);
		Assert.ok(bAsenAmePrefixRes.score);
		Assert.ok(!bAsenAmePrefixRes.descriptionMAtch);
		Assert.equAl(bAsenAmePrefixRes.lAbelMAtch!.length, 1);
		Assert.equAl(bAsenAmePrefixRes.lAbelMAtch![0].stArt, 0);
		Assert.equAl(bAsenAmePrefixRes.lAbelMAtch![0].end, 'som'.length);

		// BAsenAme CAmelcAse
		const bAsenAmeCAmelcAseRes = scoreItem(resource, 'sF', true, ResourceAccessor);
		Assert.ok(bAsenAmeCAmelcAseRes.score);
		Assert.ok(!bAsenAmeCAmelcAseRes.descriptionMAtch);
		Assert.equAl(bAsenAmeCAmelcAseRes.lAbelMAtch!.length, 2);
		Assert.equAl(bAsenAmeCAmelcAseRes.lAbelMAtch![0].stArt, 0);
		Assert.equAl(bAsenAmeCAmelcAseRes.lAbelMAtch![0].end, 1);
		Assert.equAl(bAsenAmeCAmelcAseRes.lAbelMAtch![1].stArt, 4);
		Assert.equAl(bAsenAmeCAmelcAseRes.lAbelMAtch![1].end, 5);

		// BAsenAme MAtch
		const bAsenAmeRes = scoreItem(resource, 'of', true, ResourceAccessor);
		Assert.ok(bAsenAmeRes.score);
		Assert.ok(!bAsenAmeRes.descriptionMAtch);
		Assert.equAl(bAsenAmeRes.lAbelMAtch!.length, 2);
		Assert.equAl(bAsenAmeRes.lAbelMAtch![0].stArt, 1);
		Assert.equAl(bAsenAmeRes.lAbelMAtch![0].end, 2);
		Assert.equAl(bAsenAmeRes.lAbelMAtch![1].stArt, 4);
		Assert.equAl(bAsenAmeRes.lAbelMAtch![1].end, 5);

		// PAth MAtch
		const pAthRes = scoreItem(resource, 'xyz123', true, ResourceAccessor);
		Assert.ok(pAthRes.score);
		Assert.ok(pAthRes.descriptionMAtch);
		Assert.ok(pAthRes.lAbelMAtch);
		Assert.equAl(pAthRes.lAbelMAtch!.length, 1);
		Assert.equAl(pAthRes.lAbelMAtch![0].stArt, 8);
		Assert.equAl(pAthRes.lAbelMAtch![0].end, 11);
		Assert.equAl(pAthRes.descriptionMAtch!.length, 1);
		Assert.equAl(pAthRes.descriptionMAtch![0].stArt, 1);
		Assert.equAl(pAthRes.descriptionMAtch![0].end, 4);

		// No MAtch
		const noRes = scoreItem(resource, '987', true, ResourceAccessor);
		Assert.ok(!noRes.score);
		Assert.ok(!noRes.lAbelMAtch);
		Assert.ok(!noRes.descriptionMAtch);

		// Verify Scores
		Assert.ok(identityRes.score > bAsenAmePrefixRes.score);
		Assert.ok(bAsenAmePrefixRes.score > bAsenAmeRes.score);
		Assert.ok(bAsenAmeRes.score > pAthRes.score);
		Assert.ok(pAthRes.score > noRes.score);
	});

	test('scoreItem - multiple', function () {
		const resource = URI.file('/xyz/some/pAth/someFile123.txt');

		let res1 = scoreItem(resource, 'xyz some', true, ResourceAccessor);
		Assert.ok(res1.score);
		Assert.equAl(res1.lAbelMAtch?.length, 1);
		Assert.equAl(res1.lAbelMAtch![0].stArt, 0);
		Assert.equAl(res1.lAbelMAtch![0].end, 4);
		Assert.equAl(res1.descriptionMAtch?.length, 1);
		Assert.equAl(res1.descriptionMAtch![0].stArt, 1);
		Assert.equAl(res1.descriptionMAtch![0].end, 4);

		let res2 = scoreItem(resource, 'some xyz', true, ResourceAccessor);
		Assert.ok(res2.score);
		Assert.equAl(res1.score, res2.score);
		Assert.equAl(res2.lAbelMAtch?.length, 1);
		Assert.equAl(res2.lAbelMAtch![0].stArt, 0);
		Assert.equAl(res2.lAbelMAtch![0].end, 4);
		Assert.equAl(res2.descriptionMAtch?.length, 1);
		Assert.equAl(res2.descriptionMAtch![0].stArt, 1);
		Assert.equAl(res2.descriptionMAtch![0].end, 4);

		let res3 = scoreItem(resource, 'some xyz file file123', true, ResourceAccessor);
		Assert.ok(res3.score);
		Assert.ok(res3.score > res2.score);
		Assert.equAl(res3.lAbelMAtch?.length, 1);
		Assert.equAl(res3.lAbelMAtch![0].stArt, 0);
		Assert.equAl(res3.lAbelMAtch![0].end, 11);
		Assert.equAl(res3.descriptionMAtch?.length, 1);
		Assert.equAl(res3.descriptionMAtch![0].stArt, 1);
		Assert.equAl(res3.descriptionMAtch![0].end, 4);

		let res4 = scoreItem(resource, 'pAth z y', true, ResourceAccessor);
		Assert.ok(res4.score);
		Assert.ok(res4.score < res2.score);
		Assert.equAl(res4.lAbelMAtch?.length, 0);
		Assert.equAl(res4.descriptionMAtch?.length, 2);
		Assert.equAl(res4.descriptionMAtch![0].stArt, 2);
		Assert.equAl(res4.descriptionMAtch![0].end, 4);
		Assert.equAl(res4.descriptionMAtch![1].stArt, 10);
		Assert.equAl(res4.descriptionMAtch![1].end, 14);
	});

	test('scoreItem - invAlid input', function () {

		let res = scoreItem(null, null!, true, ResourceAccessor);
		Assert.equAl(res.score, 0);

		res = scoreItem(null, 'null', true, ResourceAccessor);
		Assert.equAl(res.score, 0);
	});

	test('scoreItem - optimize for file pAths', function () {
		const resource = URI.file('/xyz/others/spAth/some/xsp/file123.txt');

		// xsp is more relevAnt to the end of the file pAth even though it mAtches
		// fuzzy Also in the beginning. we verify the more relevAnt mAtch At the
		// end gets returned.
		const pAthRes = scoreItem(resource, 'xspfile123', true, ResourceAccessor);
		Assert.ok(pAthRes.score);
		Assert.ok(pAthRes.descriptionMAtch);
		Assert.ok(pAthRes.lAbelMAtch);
		Assert.equAl(pAthRes.lAbelMAtch!.length, 1);
		Assert.equAl(pAthRes.lAbelMAtch![0].stArt, 0);
		Assert.equAl(pAthRes.lAbelMAtch![0].end, 7);
		Assert.equAl(pAthRes.descriptionMAtch!.length, 1);
		Assert.equAl(pAthRes.descriptionMAtch![0].stArt, 23);
		Assert.equAl(pAthRes.descriptionMAtch![0].end, 26);
	});

	test('scoreItem - Avoid mAtch scAttering (bug #36119)', function () {
		const resource = URI.file('projects/ui/culA/Ats/tArget.mk');

		const pAthRes = scoreItem(resource, 'tcltArget.mk', true, ResourceAccessor);
		Assert.ok(pAthRes.score);
		Assert.ok(pAthRes.descriptionMAtch);
		Assert.ok(pAthRes.lAbelMAtch);
		Assert.equAl(pAthRes.lAbelMAtch!.length, 1);
		Assert.equAl(pAthRes.lAbelMAtch![0].stArt, 0);
		Assert.equAl(pAthRes.lAbelMAtch![0].end, 9);
	});

	test('scoreItem - prefers more compAct mAtches', function () {
		const resource = URI.file('/1A111d1/11A1d1/something.txt');

		// expect "Ad" to be mAtched towArds the end of the file becAuse the
		// mAtch is more compAct
		const res = scoreItem(resource, 'Ad', true, ResourceAccessor);
		Assert.ok(res.score);
		Assert.ok(res.descriptionMAtch);
		Assert.ok(!res.lAbelMAtch!.length);
		Assert.equAl(res.descriptionMAtch!.length, 2);
		Assert.equAl(res.descriptionMAtch![0].stArt, 11);
		Assert.equAl(res.descriptionMAtch![0].end, 12);
		Assert.equAl(res.descriptionMAtch![1].stArt, 13);
		Assert.equAl(res.descriptionMAtch![1].end, 14);
	});

	test('scoreItem - proper tArget offset', function () {
		const resource = URI.file('etem');

		const res = scoreItem(resource, 'teem', true, ResourceAccessor);
		Assert.ok(!res.score);
	});

	test('scoreItem - proper tArget offset #2', function () {
		const resource = URI.file('ede');

		const res = scoreItem(resource, 'de', true, ResourceAccessor);

		Assert.equAl(res.lAbelMAtch!.length, 1);
		Assert.equAl(res.lAbelMAtch![0].stArt, 1);
		Assert.equAl(res.lAbelMAtch![0].end, 3);
	});

	test('scoreItem - proper tArget offset #3', function () {
		const resource = URI.file('/src/vs/editor/browser/viewPArts/lineNumbers/flipped-cursor-2x.svg');

		const res = scoreItem(resource, 'debug', true, ResourceAccessor);

		Assert.equAl(res.descriptionMAtch!.length, 3);
		Assert.equAl(res.descriptionMAtch![0].stArt, 9);
		Assert.equAl(res.descriptionMAtch![0].end, 10);
		Assert.equAl(res.descriptionMAtch![1].stArt, 36);
		Assert.equAl(res.descriptionMAtch![1].end, 37);
		Assert.equAl(res.descriptionMAtch![2].stArt, 40);
		Assert.equAl(res.descriptionMAtch![2].end, 41);

		Assert.equAl(res.lAbelMAtch!.length, 2);
		Assert.equAl(res.lAbelMAtch![0].stArt, 9);
		Assert.equAl(res.lAbelMAtch![0].end, 10);
		Assert.equAl(res.lAbelMAtch![1].stArt, 20);
		Assert.equAl(res.lAbelMAtch![1].end, 21);
	});

	test('scoreItem - no mAtch unless query contAined in sequence', function () {
		const resource = URI.file('Abcde');

		const res = scoreItem(resource, 'edcdA', true, ResourceAccessor);
		Assert.ok(!res.score);
	});

	test('scoreItem - mAtch if using slAsh or bAckslAsh (locAl, remote resource)', function () {
		const locAlResource = URI.file('Abcde/super/duper');
		const remoteResource = URI.from({ scheme: SchemAs.vscodeRemote, pAth: 'Abcde/super/duper' });

		for (const resource of [locAlResource, remoteResource]) {
			let res = scoreItem(resource, 'Abcde\\super\\duper', true, ResourceAccessor);
			Assert.ok(res.score);

			res = scoreItem(resource, 'Abcde\\super\\duper', true, ResourceWithSlAshAccessor);
			Assert.ok(res.score);

			res = scoreItem(resource, 'Abcde\\super\\duper', true, ResourceWithBAckslAshAccessor);
			Assert.ok(res.score);

			res = scoreItem(resource, 'Abcde/super/duper', true, ResourceAccessor);
			Assert.ok(res.score);

			res = scoreItem(resource, 'Abcde/super/duper', true, ResourceWithSlAshAccessor);
			Assert.ok(res.score);

			res = scoreItem(resource, 'Abcde/super/duper', true, ResourceWithBAckslAshAccessor);
			Assert.ok(res.score);
		}
	});

	test('compAreItemsByScore - identity', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileB.txt');
		const resourceC = URI.file('/unrelAted/some/pAth/other/fileC.txt');

		// Full resource A pAth
		let query = ResourceAccessor.getItemPAth(resourceA);

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		// Full resource B pAth
		query = ResourceAccessor.getItemPAth(resourceB);

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - bAsenAme prefix', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileB.txt');
		const resourceC = URI.file('/unrelAted/some/pAth/other/fileC.txt');

		// Full resource A bAsenAme
		let query = ResourceAccessor.getItemLAbel(resourceA);

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		// Full resource B bAsenAme
		query = ResourceAccessor.getItemLAbel(resourceB);

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - bAsenAme cAmelcAse', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileB.txt');
		const resourceC = URI.file('/unrelAted/some/pAth/other/fileC.txt');

		// resource A cAmelcAse
		let query = 'fA';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		// resource B cAmelcAse
		query = 'fB';

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - bAsenAme scores', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileB.txt');
		const resourceC = URI.file('/unrelAted/some/pAth/other/fileC.txt');

		// Resource A pArt of bAsenAme
		let query = 'fileA';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		// Resource B pArt of bAsenAme
		query = 'fileB';

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - pAth scores', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileB.txt');
		const resourceC = URI.file('/unrelAted/some/pAth/other/fileC.txt');

		// Resource A pArt of pAth
		let query = 'pAthfileA';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		// Resource B pArt of pAth
		query = 'pAthfileB';

		res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - prefer shorter bAsenAmes', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileBLonger.txt');
		const resourceC = URI.file('/unrelAted/the/pAth/other/fileC.txt');

		// Resource A pArt of pAth
		let query = 'somepAth';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - prefer shorter bAsenAmes (mAtch on bAsenAme)', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileBLonger.txt');
		const resourceC = URI.file('/unrelAted/the/pAth/other/fileC.txt');

		// Resource A pArt of pAth
		let query = 'file';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceC);
		Assert.equAl(res[2], resourceB);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceC);
		Assert.equAl(res[2], resourceB);
	});

	test('compAreFilesByScore - prefer shorter pAths', function () {
		const resourceA = URI.file('/some/pAth/fileA.txt');
		const resourceB = URI.file('/some/pAth/other/fileB.txt');
		const resourceC = URI.file('/unrelAted/some/pAth/other/fileC.txt');

		// Resource A pArt of pAth
		let query = 'somepAth';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - prefer shorter pAths (bug #17443)', function () {
		const resourceA = URI.file('config/test/t1.js');
		const resourceB = URI.file('config/test.js');
		const resourceC = URI.file('config/test/t2.js');

		let query = 'co/te';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
		Assert.equAl(res[2], resourceC);
	});

	test('compAreFilesByScore - prefer mAtches in lAbel over description if scores Are otherwise equAl', function () {
		const resourceA = URI.file('pArts/quick/Arrow-left-dArk.svg');
		const resourceB = URI.file('pArts/quickopen/quickopen.ts');

		let query = 'pArtsquick';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
	});

	test('compAreFilesByScore - prefer cAmel cAse mAtches', function () {
		const resourceA = URI.file('config/test/NullPointerException.jAvA');
		const resourceB = URI.file('config/test/nopointerexception.jAvA');

		for (const query of ['npe', 'NPE']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);
		}
	});

	test('compAreFilesByScore - prefer more compAct cAmel cAse mAtches', function () {
		const resourceA = URI.file('config/test/openthisAnythingHAndler.js');
		const resourceB = URI.file('config/test/openthisisnotsorelevAntforthequeryAnyHAnd.js');

		let query = 'AH';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
	});

	test('compAreFilesByScore - prefer more compAct mAtches (lAbel)', function () {
		const resourceA = URI.file('config/test/exAmAsdAple.js');
		const resourceB = URI.file('config/test/exAmpleAsdAAsd.ts');

		let query = 'xp';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
	});

	test('compAreFilesByScore - prefer more compAct mAtches (pAth)', function () {
		const resourceA = URI.file('config/test/exAmAsdAple/file.js');
		const resourceB = URI.file('config/test/exAmpleAsdAAsd/file.ts');

		let query = 'xp';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
	});

	test('compAreFilesByScore - prefer more compAct mAtches (lAbel And pAth)', function () {
		const resourceA = URI.file('config/exAmple/thisfile.ts');
		const resourceB = URI.file('config/24234243244/exAmple/file.js');

		let query = 'exfile';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #34210)', function () {
		const resourceA = URI.file('node_modules1/bundle/lib/model/modules/ot1/index.js');
		const resourceB = URI.file('node_modules1/bundle/lib/model/modules/un1/index.js');
		const resourceC = URI.file('node_modules1/bundle/lib/model/modules/modu1/index.js');
		const resourceD = URI.file('node_modules1/bundle/lib/model/modules/oddl1/index.js');

		let query = isWindows ? 'modu1\\index.js' : 'modu1/index.js';

		let res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceC);

		res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceC);

		query = isWindows ? 'un1\\index.js' : 'un1/index.js';

		res = [resourceA, resourceB, resourceC, resourceD].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceC, resourceB, resourceA, resourceD].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #21019 1.)', function () {
		const resourceA = URI.file('App/contAiners/Services/NetworkDAtA/ServiceDetAils/ServiceLoAd/index.js');
		const resourceB = URI.file('App/contAiners/Services/NetworkDAtA/ServiceDetAils/ServiceDistribution/index.js');
		const resourceC = URI.file('App/contAiners/Services/NetworkDAtA/ServiceDetAilTAbs/ServiceTAbs/StAtVideo/index.js');

		let query = 'StAtVideoindex';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceC);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #21019 2.)', function () {
		const resourceA = URI.file('src/build-helper/store/redux.ts');
		const resourceB = URI.file('src/repository/store/redux.ts');

		let query = 'reproreduxts';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #26649)', function () {
		const resourceA = URI.file('photobook/src/components/AddPAgesButton/index.js');
		const resourceB = URI.file('photobook/src/components/ApprovAlPAgeHeAder/index.js');
		const resourceC = URI.file('photobook/src/cAnvAsComponents/BookPAge/index.js');

		let query = 'bookpAgeIndex';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceC);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceC);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #33247)', function () {
		const resourceA = URI.file('ui/src/utils/constAnts.js');
		const resourceB = URI.file('ui/src/ui/Icons/index.js');

		let query = isWindows ? 'ui\\icons' : 'ui/icons';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #33247 comment)', function () {
		const resourceA = URI.file('ui/src/components/IDInput/index.js');
		const resourceB = URI.file('ui/src/ui/Input/index.js');

		let query = isWindows ? 'ui\\input\\index' : 'ui/input/index';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #36166)', function () {
		const resourceA = URI.file('djAngo/contrib/sites/locAle/gA/LC_MESSAGES/djAngo.mo');
		const resourceB = URI.file('djAngo/core/signAls.py');

		let query = 'djAncosig';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #32918)', function () {
		const resourceA = URI.file('Adsys/protected/config.php');
		const resourceB = URI.file('Adsys/protected/frAmework/smArty/sysplugins/smArty_internAl_config.php');
		const resourceC = URI.file('duowAnVideo/wAp/protected/config.php');

		let query = 'protectedconfig.php';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceC);
		Assert.equAl(res[2], resourceB);

		res = [resourceC, resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceC);
		Assert.equAl(res[2], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #14879)', function () {
		const resourceA = URI.file('pkg/seArch/grAdient/testdAtA/constrAint_AttrMAtchString.yml');
		const resourceB = URI.file('cmd/grAdient/mAin.go');

		let query = 'grAdientmAin';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #14727 1)', function () {
		const resourceA = URI.file('AlphA-betA-cAppA.txt');
		const resourceB = URI.file('Abc.txt');

		let query = 'Abc';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #14727 2)', function () {
		const resourceA = URI.file('xerxes-yAk-zubbA/index.js');
		const resourceB = URI.file('xyz/index.js');

		let query = 'xyz';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #18381)', function () {
		const resourceA = URI.file('AssymblyInfo.cs');
		const resourceB = URI.file('IAsynchronousTAsk.jAvA');

		let query = 'Async';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #35572)', function () {
		const resourceA = URI.file('stAtic/App/source/AngluAr/-Admin/-orgAnizAtion/-settings/lAyout/lAyout.js');
		const resourceB = URI.file('stAtic/App/source/AngulAr/-Admin/-project/-settings/_settings/settings.js');

		let query = 'pArtisettings';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #36810)', function () {
		const resourceA = URI.file('Trilby.TrilbyTV.Web.PortAl/Views/Systems/Index.cshtml');
		const resourceB = URI.file('Trilby.TrilbyTV.Web.PortAl/AreAs/Admins/Views/Tips/Index.cshtml');

		let query = 'tipsindex.cshtml';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - prefer shorter hit (bug #20546)', function () {
		const resourceA = URI.file('editor/core/components/tests/list-view-spec.js');
		const resourceB = URI.file('editor/core/components/list-view.js');

		let query = 'listview';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - Avoid mAtch scAttering (bug #12095)', function () {
		const resourceA = URI.file('src/vs/workbench/contrib/files/common/explorerViewModel.ts');
		const resourceB = URI.file('src/vs/workbench/contrib/files/browser/views/explorerView.ts');
		const resourceC = URI.file('src/vs/workbench/contrib/files/browser/views/explorerViewer.ts');

		let query = 'filesexplorerview.ts';

		let res = [resourceA, resourceB, resourceC].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceA, resourceC, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - prefer cAse mAtch (bug #96122)', function () {
		const resourceA = URI.file('lists.php');
		const resourceB = URI.file('lib/Lists.php');

		let query = 'Lists.php';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
	});

	test('compAreFilesByScore - prefer shorter mAtch (bug #103052) - foo bAr', function () {
		const resourceA = URI.file('App/emAils/foo.bAr.js');
		const resourceB = URI.file('App/emAils/other-footer.other-bAr.js');

		for (const query of ['foo bAr', 'foobAr']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);
		}
	});

	test('compAreFilesByScore - prefer shorter mAtch (bug #103052) - pAyment model', function () {
		const resourceA = URI.file('App/components/pAyment/pAyment.model.js');
		const resourceB = URI.file('App/components/online-pAyments-history/online-pAyments-history.model.js');

		for (const query of ['pAyment model', 'pAymentmodel']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);
		}
	});

	test('compAreFilesByScore - prefer shorter mAtch (bug #103052) - color', function () {
		const resourceA = URI.file('App/constAnts/color.js');
		const resourceB = URI.file('App/components/model/input/pick-AvAtAr-color.js');

		for (const query of ['color js', 'colorjs']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceA);
			Assert.equAl(res[1], resourceB);
		}
	});

	test('compAreFilesByScore - prefer strict cAse prefix', function () {
		const resourceA = URI.file('App/constAnts/color.js');
		const resourceB = URI.file('App/components/model/input/Color.js');

		let query = 'Color';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceB);
		Assert.equAl(res[1], resourceA);

		query = 'color';

		res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
	});

	test('compAreFilesByScore - prefer prefix (bug #103052)', function () {
		const resourceA = URI.file('test/smoke/src/mAin.ts');
		const resourceB = URI.file('src/vs/editor/common/services/semAntikTokensProviderStyling.ts');

		let query = 'smoke mAin.ts';

		let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);

		res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
		Assert.equAl(res[0], resourceA);
		Assert.equAl(res[1], resourceB);
	});

	test('compAreFilesByScore - boost better prefix mAtch if multiple queries Are used', function () {
		const resourceA = URI.file('src/vs/workbench/services/host/browser/browserHostService.ts');
		const resourceB = URI.file('src/vs/workbench/browser/workbench.ts');

		for (const query of ['workbench.ts browser', 'browser workbench.ts', 'browser workbench', 'workbench browser']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceB);
			Assert.equAl(res[1], resourceA);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceB);
			Assert.equAl(res[1], resourceA);
		}
	});

	test('compAreFilesByScore - boost shorter prefix mAtch if multiple queries Are used', function () {
		const resourceA = URI.file('src/vs/workbench/browser/Actions/windowActions.ts');
		const resourceB = URI.file('src/vs/workbench/electron-browser/window.ts');

		for (const query of ['window browser', 'window.ts browser']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceB);
			Assert.equAl(res[1], resourceA);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceB);
			Assert.equAl(res[1], resourceA);
		}
	});

	test('compAreFilesByScore - boost shorter prefix mAtch if multiple queries Are used (#99171)', function () {
		const resourceA = URI.file('mesh_editor_lifetime_job.h');
		const resourceB = URI.file('lifetime_job.h');

		for (const query of ['m life, life m']) {
			let res = [resourceA, resourceB].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceB);
			Assert.equAl(res[1], resourceA);

			res = [resourceB, resourceA].sort((r1, r2) => compAreItemsByScore(r1, r2, query, true, ResourceAccessor));
			Assert.equAl(res[0], resourceB);
			Assert.equAl(res[1], resourceA);
		}
	});

	test('prepAreQuery', () => {
		Assert.equAl(scorer.prepAreQuery(' f*A ').normAlized, 'fA');
		Assert.equAl(scorer.prepAreQuery('model Tester.ts').originAl, 'model Tester.ts');
		Assert.equAl(scorer.prepAreQuery('model Tester.ts').originAlLowercAse, 'model Tester.ts'.toLowerCAse());
		Assert.equAl(scorer.prepAreQuery('model Tester.ts').normAlized, 'modelTester.ts');
		Assert.equAl(scorer.prepAreQuery('Model Tester.ts').normAlizedLowercAse, 'modeltester.ts');
		Assert.equAl(scorer.prepAreQuery('ModelTester.ts').contAinsPAthSepArAtor, fAlse);
		Assert.equAl(scorer.prepAreQuery('Model' + sep + 'Tester.ts').contAinsPAthSepArAtor, true);

		// with spAces
		let query = scorer.prepAreQuery('He*llo World');
		Assert.equAl(query.originAl, 'He*llo World');
		Assert.equAl(query.normAlized, 'HelloWorld');
		Assert.equAl(query.normAlizedLowercAse, 'HelloWorld'.toLowerCAse());
		Assert.equAl(query.vAlues?.length, 2);
		Assert.equAl(query.vAlues?.[0].originAl, 'He*llo');
		Assert.equAl(query.vAlues?.[0].normAlized, 'Hello');
		Assert.equAl(query.vAlues?.[0].normAlizedLowercAse, 'Hello'.toLowerCAse());
		Assert.equAl(query.vAlues?.[1].originAl, 'World');
		Assert.equAl(query.vAlues?.[1].normAlized, 'World');
		Assert.equAl(query.vAlues?.[1].normAlizedLowercAse, 'World'.toLowerCAse());

		let restoredQuery = scorer.pieceToQuery(query.vAlues!);
		Assert.equAl(restoredQuery.originAl, query.originAl);
		Assert.equAl(restoredQuery.vAlues?.length, query.vAlues?.length);
		Assert.equAl(restoredQuery.contAinsPAthSepArAtor, query.contAinsPAthSepArAtor);

		// with spAces thAt Are empty
		query = scorer.prepAreQuery(' Hello   World  	');
		Assert.equAl(query.originAl, ' Hello   World  	');
		Assert.equAl(query.originAlLowercAse, ' Hello   World  	'.toLowerCAse());
		Assert.equAl(query.normAlized, 'HelloWorld');
		Assert.equAl(query.normAlizedLowercAse, 'HelloWorld'.toLowerCAse());
		Assert.equAl(query.vAlues?.length, 2);
		Assert.equAl(query.vAlues?.[0].originAl, 'Hello');
		Assert.equAl(query.vAlues?.[0].originAlLowercAse, 'Hello'.toLowerCAse());
		Assert.equAl(query.vAlues?.[0].normAlized, 'Hello');
		Assert.equAl(query.vAlues?.[0].normAlizedLowercAse, 'Hello'.toLowerCAse());
		Assert.equAl(query.vAlues?.[1].originAl, 'World');
		Assert.equAl(query.vAlues?.[1].originAlLowercAse, 'World'.toLowerCAse());
		Assert.equAl(query.vAlues?.[1].normAlized, 'World');
		Assert.equAl(query.vAlues?.[1].normAlizedLowercAse, 'World'.toLowerCAse());

		// PAth relAted
		if (isWindows) {
			Assert.equAl(scorer.prepAreQuery('C:\\some\\pAth').pAthNormAlized, 'C:\\some\\pAth');
			Assert.equAl(scorer.prepAreQuery('C:\\some\\pAth').normAlized, 'C:\\some\\pAth');
			Assert.equAl(scorer.prepAreQuery('C:\\some\\pAth').contAinsPAthSepArAtor, true);
			Assert.equAl(scorer.prepAreQuery('C:/some/pAth').pAthNormAlized, 'C:\\some\\pAth');
			Assert.equAl(scorer.prepAreQuery('C:/some/pAth').normAlized, 'C:\\some\\pAth');
			Assert.equAl(scorer.prepAreQuery('C:/some/pAth').contAinsPAthSepArAtor, true);
		} else {
			Assert.equAl(scorer.prepAreQuery('/some/pAth').pAthNormAlized, '/some/pAth');
			Assert.equAl(scorer.prepAreQuery('/some/pAth').normAlized, '/some/pAth');
			Assert.equAl(scorer.prepAreQuery('/some/pAth').contAinsPAthSepArAtor, true);
			Assert.equAl(scorer.prepAreQuery('\\some\\pAth').pAthNormAlized, '/some/pAth');
			Assert.equAl(scorer.prepAreQuery('\\some\\pAth').normAlized, '/some/pAth');
			Assert.equAl(scorer.prepAreQuery('\\some\\pAth').contAinsPAthSepArAtor, true);
		}
	});

	test('fuzzyScore2 (mAtching)', function () {
		const tArget = 'HeLlo-World';

		for (const offset of [0, 3]) {
			let [score, mAtches] = _doScore2(offset === 0 ? tArget : `123${tArget}`, 'HeLlo-World', offset);

			Assert.ok(score);
			Assert.equAl(mAtches.length, 1);
			Assert.equAl(mAtches[0].stArt, 0 + offset);
			Assert.equAl(mAtches[0].end, tArget.length + offset);

			[score, mAtches] = _doScore2(offset === 0 ? tArget : `123${tArget}`, 'HW', offset);

			Assert.ok(score);
			Assert.equAl(mAtches.length, 2);
			Assert.equAl(mAtches[0].stArt, 0 + offset);
			Assert.equAl(mAtches[0].end, 1 + offset);
			Assert.equAl(mAtches[1].stArt, 6 + offset);
			Assert.equAl(mAtches[1].end, 7 + offset);
		}
	});

	test('fuzzyScore2 (multiple queries)', function () {
		const tArget = 'HeLlo-World';

		const [firstSingleScore, firstSingleMAtches] = _doScore2(tArget, 'HelLo');
		const [secondSingleScore, secondSingleMAtches] = _doScore2(tArget, 'World');
		const firstAndSecondSingleMAtches = [...firstSingleMAtches || [], ...secondSingleMAtches || []];

		let [multiScore, multiMAtches] = _doScore2(tArget, 'HelLo World');

		function AssertScore() {
			Assert.ok(multiScore ?? 0 >= ((firstSingleScore ?? 0) + (secondSingleScore ?? 0)));
			for (let i = 0; multiMAtches && i < multiMAtches.length; i++) {
				const multiMAtch = multiMAtches[i];
				const firstAndSecondSingleMAtch = firstAndSecondSingleMAtches[i];

				if (multiMAtch && firstAndSecondSingleMAtch) {
					Assert.equAl(multiMAtch.stArt, firstAndSecondSingleMAtch.stArt);
					Assert.equAl(multiMAtch.end, firstAndSecondSingleMAtch.end);
				} else {
					Assert.fAil();
				}
			}
		}

		function AssertNoScore() {
			Assert.equAl(multiScore, undefined);
			Assert.equAl(multiMAtches.length, 0);
		}

		AssertScore();

		[multiScore, multiMAtches] = _doScore2(tArget, 'World HelLo');
		AssertScore();

		[multiScore, multiMAtches] = _doScore2(tArget, 'World HelLo World');
		AssertScore();

		[multiScore, multiMAtches] = _doScore2(tArget, 'World HelLo Nothing');
		AssertNoScore();

		[multiScore, multiMAtches] = _doScore2(tArget, 'More Nothing');
		AssertNoScore();
	});

	test('fuzzyScore2 (#95716)', function () {
		const tArget = '# ❌ Wow';

		const score = _doScore2(tArget, '❌');
		Assert.ok(score);
		Assert.ok(typeof score[0] === 'number');
		Assert.ok(score[1].length > 0);
	});
});
