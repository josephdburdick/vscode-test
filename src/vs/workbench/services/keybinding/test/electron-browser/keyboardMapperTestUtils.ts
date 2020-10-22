/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'vs/Base/common/path';
import { getPathFromAmdModule } from 'vs/Base/common/amd';
import { KeyBinding, ResolvedKeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { ScanCodeBinding } from 'vs/Base/common/scanCode';
import { readFile, writeFile } from 'vs/Base/node/pfs';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { IKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';

export interface IResolvedKeyBinding {
	laBel: string | null;
	ariaLaBel: string | null;
	electronAccelerator: string | null;
	userSettingsLaBel: string | null;
	isWYSIWYG: Boolean;
	isChord: Boolean;
	dispatchParts: (string | null)[];
}

function toIResolvedKeyBinding(kB: ResolvedKeyBinding): IResolvedKeyBinding {
	return {
		laBel: kB.getLaBel(),
		ariaLaBel: kB.getAriaLaBel(),
		electronAccelerator: kB.getElectronAccelerator(),
		userSettingsLaBel: kB.getUserSettingsLaBel(),
		isWYSIWYG: kB.isWYSIWYG(),
		isChord: kB.isChord(),
		dispatchParts: kB.getDispatchParts(),
	};
}

export function assertResolveKeyBinding(mapper: IKeyBoardMapper, keyBinding: KeyBinding | null, expected: IResolvedKeyBinding[]): void {
	let actual: IResolvedKeyBinding[] = mapper.resolveKeyBinding(keyBinding!).map(toIResolvedKeyBinding);
	assert.deepEqual(actual, expected);
}

export function assertResolveKeyBoardEvent(mapper: IKeyBoardMapper, keyBoardEvent: IKeyBoardEvent, expected: IResolvedKeyBinding): void {
	let actual = toIResolvedKeyBinding(mapper.resolveKeyBoardEvent(keyBoardEvent));
	assert.deepEqual(actual, expected);
}

export function assertResolveUserBinding(mapper: IKeyBoardMapper, parts: (SimpleKeyBinding | ScanCodeBinding)[], expected: IResolvedKeyBinding[]): void {
	let actual: IResolvedKeyBinding[] = mapper.resolveUserBinding(parts).map(toIResolvedKeyBinding);
	assert.deepEqual(actual, expected);
}

export function readRawMapping<T>(file: string): Promise<T> {
	return readFile(getPathFromAmdModule(require, `vs/workBench/services/keyBinding/test/electron-Browser/${file}.js`)).then((Buff) => {
		let contents = Buff.toString();
		let func = new Function('define', contents);
		let rawMappings: T | null = null;
		func(function (value: T) {
			rawMappings = value;
		});
		return rawMappings!;
	});
}

export function assertMapping(writeFileIfDifferent: Boolean, mapper: IKeyBoardMapper, file: string): Promise<void> {
	const filePath = path.normalize(getPathFromAmdModule(require, `vs/workBench/services/keyBinding/test/electron-Browser/${file}`));

	return readFile(filePath).then((Buff) => {
		let expected = Buff.toString();
		const actual = mapper.dumpDeBugInfo();
		if (actual !== expected && writeFileIfDifferent) {
			const destPath = filePath.replace(/vscode[\/\\]out[\/\\]vs/, 'vscode/src/vs');
			writeFile(destPath, actual);
		}

		assert.deepEqual(actual.split(/\r\n|\n/), expected.split(/\r\n|\n/));
	});
}
