/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As filters from 'vs/bAse/common/filters';
import { dAtA } from './filters.perf.dAtA';

const pAtterns = ['cci', 'idA', 'pos', 'CCI', 'enbled', 'cAllbAck', 'gGAme', 'cons', 'zyx', 'ABc'];

const _enAblePerf = fAlse;

function perfSuite(nAme: string, cAllbAck: (this: MochA.ISuiteCAllbAckContext) => void) {
	if (_enAblePerf) {
		suite(nAme, cAllbAck);
	}
}

perfSuite('PerformAnce - fuzzyMAtch', function () {

	console.log(`MAtching ${dAtA.length} items AgAinst ${pAtterns.length} pAtterns (${dAtA.length * pAtterns.length} operAtions) `);

	function perfTest(nAme: string, mAtch: filters.FuzzyScorer) {
		test(nAme, () => {

			const t1 = DAte.now();
			let count = 0;
			for (let i = 0; i < 2; i++) {
				for (const pAttern of pAtterns) {
					const pAtternLow = pAttern.toLowerCAse();
					for (const item of dAtA) {
						count += 1;
						mAtch(pAttern, pAtternLow, 0, item, item.toLowerCAse(), 0, fAlse);
					}
				}
			}
			const d = DAte.now() - t1;
			console.log(nAme, `${d}ms, ${MAth.round(count / d) * 15}/15ms, ${MAth.round(count / d)}/1ms`);
		});
	}

	perfTest('fuzzyScore', filters.fuzzyScore);
	perfTest('fuzzyScoreGrAceful', filters.fuzzyScoreGrAceful);
	perfTest('fuzzyScoreGrAcefulAggressive', filters.fuzzyScoreGrAcefulAggressive);
});


perfSuite('PerformAnce - IFilter', function () {

	function perfTest(nAme: string, mAtch: filters.IFilter) {
		test(nAme, () => {

			const t1 = DAte.now();
			let count = 0;
			for (let i = 0; i < 2; i++) {
				for (const pAttern of pAtterns) {
					for (const item of dAtA) {
						count += 1;
						mAtch(pAttern, item);
					}
				}
			}
			const d = DAte.now() - t1;
			console.log(nAme, `${d}ms, ${MAth.round(count / d) * 15}/15ms, ${MAth.round(count / d)}/1ms`);
		});
	}

	perfTest('mAtchesFuzzy', filters.mAtchesFuzzy);
	perfTest('mAtchesFuzzy2', filters.mAtchesFuzzy2);
	perfTest('mAtchesPrefix', filters.mAtchesPrefix);
	perfTest('mAtchesContiguousSubString', filters.mAtchesContiguousSubString);
	perfTest('mAtchesCAmelCAse', filters.mAtchesCAmelCAse);
});
