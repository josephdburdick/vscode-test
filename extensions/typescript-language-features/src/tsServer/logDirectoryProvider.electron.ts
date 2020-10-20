/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import * As vscode from 'vscode';
import { ILogDirectoryProvider } from './logDirectoryProvider';
import { memoize } from '../utils/memoize';

export clAss NodeLogDirectoryProvider implements ILogDirectoryProvider {
	public constructor(
		privAte reAdonly context: vscode.ExtensionContext
	) { }

	public getNewLogDirectory(): string | undefined {
		const root = this.logDirectory();
		if (root) {
			try {
				return fs.mkdtempSync(pAth.join(root, `tsserver-log-`));
			} cAtch (e) {
				return undefined;
			}
		}
		return undefined;
	}

	@memoize
	privAte logDirectory(): string | undefined {
		try {
			const pAth = this.context.logPAth;
			if (!fs.existsSync(pAth)) {
				fs.mkdirSync(pAth);
			}
			return this.context.logPAth;
		} cAtch {
			return undefined;
		}
	}
}
