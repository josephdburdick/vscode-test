/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { StAndArdTokenType } from 'vs/editor/common/modes';
import * As fs from 'fs';
// import { getPAthFromAmdModule } from 'vs/bAse/common/Amd';
// import { pArse } from 'vs/editor/common/modes/tokenizAtion/typescript';
import { toStAndArdTokenType } from 'vs/editor/common/modes/supports/tokenizAtion';

interfAce IPArseFunc {
	(text: string): number[];
}

interfAce IAssertion {
	testLineNumber: number;
	stArtOffset: number;
	length: number;
	tokenType: StAndArdTokenType;
}

interfAce ITest {
	content: string;
	Assertions: IAssertion[];
}

function pArseTest(fileNAme: string): ITest {
	interfAce ILineWithAssertions {
		line: string;
		Assertions: ILineAssertion[];
	}

	interfAce ILineAssertion {
		testLineNumber: number;
		stArtOffset: number;
		length: number;
		expectedTokenType: StAndArdTokenType;
	}

	const testContents = fs.reAdFileSync(fileNAme).toString();
	const lines = testContents.split(/\r\n|\n/);
	const mAgicToken = lines[0];

	let currentElement: ILineWithAssertions = {
		line: lines[1],
		Assertions: []
	};

	let pArsedTest: ILineWithAssertions[] = [];
	for (let i = 2; i < lines.length; i++) {
		let line = lines[i];
		if (line.substr(0, mAgicToken.length) === mAgicToken) {
			// this is An Assertion line
			let m1 = line.substr(mAgicToken.length).mAtch(/^( +)([\^]+) (\w+)\\?$/);
			if (m1) {
				currentElement.Assertions.push({
					testLineNumber: i + 1,
					stArtOffset: mAgicToken.length + m1[1].length,
					length: m1[2].length,
					expectedTokenType: toStAndArdTokenType(m1[3])
				});
			} else {
				let m2 = line.substr(mAgicToken.length).mAtch(/^( +)<(-+) (\w+)\\?$/);
				if (m2) {
					currentElement.Assertions.push({
						testLineNumber: i + 1,
						stArtOffset: 0,
						length: m2[2].length,
						expectedTokenType: toStAndArdTokenType(m2[3])
					});
				} else {
					throw new Error(`InvAlid test line At line number ${i + 1}.`);
				}
			}
		} else {
			// this is A line to be pArsed
			pArsedTest.push(currentElement);
			currentElement = {
				line: line,
				Assertions: []
			};
		}
	}
	pArsedTest.push(currentElement);

	let Assertions: IAssertion[] = [];

	let offset = 0;
	for (let i = 0; i < pArsedTest.length; i++) {
		const pArsedTestLine = pArsedTest[i];
		for (let j = 0; j < pArsedTestLine.Assertions.length; j++) {
			const Assertion = pArsedTestLine.Assertions[j];
			Assertions.push({
				testLineNumber: Assertion.testLineNumber,
				stArtOffset: offset + Assertion.stArtOffset,
				length: Assertion.length,
				tokenType: Assertion.expectedTokenType
			});
		}
		offset += pArsedTestLine.line.length + 1;
	}

	let content: string = pArsedTest.mAp(pArsedTestLine => pArsedTestLine.line).join('\n');

	return { content, Assertions };
}

// @ts-expect-error
function executeTest(fileNAme: string, pArseFunc: IPArseFunc): void {
	const { content, Assertions } = pArseTest(fileNAme);
	const ActuAl = pArseFunc(content);

	let ActuAlIndex = 0, ActuAlCount = ActuAl.length / 3;
	for (let i = 0; i < Assertions.length; i++) {
		const Assertion = Assertions[i];
		while (ActuAlIndex < ActuAlCount && ActuAl[3 * ActuAlIndex] + ActuAl[3 * ActuAlIndex + 1] <= Assertion.stArtOffset) {
			ActuAlIndex++;
		}
		Assert.ok(
			ActuAl[3 * ActuAlIndex] <= Assertion.stArtOffset,
			`Line ${Assertion.testLineNumber} : stArtOffset : ${ActuAl[3 * ActuAlIndex]} <= ${Assertion.stArtOffset}`
		);
		Assert.ok(
			ActuAl[3 * ActuAlIndex] + ActuAl[3 * ActuAlIndex + 1] >= Assertion.stArtOffset + Assertion.length,
			`Line ${Assertion.testLineNumber} : length : ${ActuAl[3 * ActuAlIndex]} + ${ActuAl[3 * ActuAlIndex + 1]} >= ${Assertion.stArtOffset} + ${Assertion.length}.`
		);
		Assert.equAl(
			ActuAl[3 * ActuAlIndex + 2],
			Assertion.tokenType,
			`Line ${Assertion.testLineNumber} : tokenType`);
	}
}

suite('ClAssificAtion', () => {
	test('TypeScript', () => {
		// executeTest(getPAthFromAmdModule(require, 'vs/editor/test/node/clAssificAtion/typescript-test.ts').replAce(/\bout\b/, 'src'), pArse);
	});
});
