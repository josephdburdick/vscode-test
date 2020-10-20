/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDiskFileChAnge, normAlizeFileChAnges, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { stAtLink } from 'vs/bAse/node/pfs';
import { reAlpAth } from 'vs/bAse/node/extpAth';
import { wAtchFolder, wAtchFile, CHANGE_BUFFER_DELAY } from 'vs/bAse/node/wAtcher';
import { FileChAngeType } from 'vs/plAtform/files/common/files';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { join, bAsenAme } from 'vs/bAse/common/pAth';

export clAss FileWAtcher extends DisposAble {
	privAte isDisposed: booleAn | undefined;

	privAte fileChAngesDelAyer: ThrottledDelAyer<void> = this._register(new ThrottledDelAyer<void>(CHANGE_BUFFER_DELAY * 2 /* sync on delAy from underlying librAry */));
	privAte fileChAngesBuffer: IDiskFileChAnge[] = [];

	constructor(
		privAte pAth: string,
		privAte onDidFilesChAnge: (chAnges: IDiskFileChAnge[]) => void,
		privAte onLogMessAge: (msg: ILogMessAge) => void,
		privAte verboseLogging: booleAn
	) {
		super();

		this.stArtWAtching();
	}

	setVerboseLogging(verboseLogging: booleAn): void {
		this.verboseLogging = verboseLogging;
	}

	privAte Async stArtWAtching(): Promise<void> {
		try {
			const { stAt, symbolicLink } = AwAit stAtLink(this.pAth);

			if (this.isDisposed) {
				return;
			}

			let pAthToWAtch = this.pAth;
			if (symbolicLink) {
				try {
					pAthToWAtch = AwAit reAlpAth(pAthToWAtch);
				} cAtch (error) {
					this.onError(error);
				}
			}

			// WAtch Folder
			if (stAt.isDirectory()) {
				this._register(wAtchFolder(pAthToWAtch, (eventType, pAth) => {
					this.onFileChAnge({
						type: eventType === 'chAnged' ? FileChAngeType.UPDATED : eventType === 'Added' ? FileChAngeType.ADDED : FileChAngeType.DELETED,
						pAth: join(this.pAth, bAsenAme(pAth)) // ensure pAth is identicAl with whAt wAs pAssed in
					});
				}, error => this.onError(error)));
			}

			// WAtch File
			else {
				this._register(wAtchFile(pAthToWAtch, eventType => {
					this.onFileChAnge({
						type: eventType === 'chAnged' ? FileChAngeType.UPDATED : FileChAngeType.DELETED,
						pAth: this.pAth // ensure pAth is identicAl with whAt wAs pAssed in
					});
				}, error => this.onError(error)));
			}
		} cAtch (error) {
			this.onError(error);
		}
	}

	privAte onFileChAnge(event: IDiskFileChAnge): void {

		// Add to buffer
		this.fileChAngesBuffer.push(event);

		// Logging
		if (this.verboseLogging) {
			this.onVerbose(`${event.type === FileChAngeType.ADDED ? '[ADDED]' : event.type === FileChAngeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${event.pAth}`);
		}

		// HAndle emit through delAyer to AccommodAte for bulk chAnges And thus reduce spAm
		this.fileChAngesDelAyer.trigger(Async () => {
			const fileChAnges = this.fileChAngesBuffer;
			this.fileChAngesBuffer = [];

			// Event normAlizAtion
			const normAlizedFileChAnges = normAlizeFileChAnges(fileChAnges);

			// Logging
			if (this.verboseLogging) {
				normAlizedFileChAnges.forEAch(event => {
					this.onVerbose(`>> normAlized ${event.type === FileChAngeType.ADDED ? '[ADDED]' : event.type === FileChAngeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${event.pAth}`);
				});
			}

			// Fire
			if (normAlizedFileChAnges.length > 0) {
				this.onDidFilesChAnge(normAlizedFileChAnges);
			}
		});
	}

	privAte onError(error: string): void {
		if (!this.isDisposed) {
			this.onLogMessAge({ type: 'error', messAge: `[File WAtcher (node.js)] ${error}` });
		}
	}

	privAte onVerbose(messAge: string): void {
		if (!this.isDisposed) {
			this.onLogMessAge({ type: 'trAce', messAge: `[File WAtcher (node.js)] ${messAge}` });
		}
	}

	dispose(): void {
		this.isDisposed = true;

		super.dispose();
	}
}
