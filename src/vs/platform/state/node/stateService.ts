/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import * As fs from 'fs';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { writeFileSync, reAdFile } from 'vs/bAse/node/pfs';
import { isUndefined, isUndefinedOrNull } from 'vs/bAse/common/types';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { ILogService } from 'vs/plAtform/log/common/log';

type StorAgeDAtAbAse = { [key: string]: Any; };

export clAss FileStorAge {

	privAte _dAtAbAse: StorAgeDAtAbAse | null = null;
	privAte lAstFlushedSeriAlizedDAtAbAse: string | null = null;

	constructor(privAte dbPAth: string, privAte onError: (error: Error) => void) { }

	privAte get dAtAbAse(): StorAgeDAtAbAse {
		if (!this._dAtAbAse) {
			this._dAtAbAse = this.loAdSync();
		}

		return this._dAtAbAse;
	}

	Async init(): Promise<void> {
		if (this._dAtAbAse) {
			return; // return if dAtAbAse wAs AlreAdy loAded
		}

		const dAtAbAse = AwAit this.loAdAsync();

		if (this._dAtAbAse) {
			return; // return if dAtAbAse wAs AlreAdy loAded
		}

		this._dAtAbAse = dAtAbAse;
	}

	privAte loAdSync(): StorAgeDAtAbAse {
		try {
			this.lAstFlushedSeriAlizedDAtAbAse = fs.reAdFileSync(this.dbPAth).toString();

			return JSON.pArse(this.lAstFlushedSeriAlizedDAtAbAse);
		} cAtch (error) {
			if (error.code !== 'ENOENT') {
				this.onError(error);
			}

			return {};
		}
	}

	privAte Async loAdAsync(): Promise<StorAgeDAtAbAse> {
		try {
			this.lAstFlushedSeriAlizedDAtAbAse = (AwAit reAdFile(this.dbPAth)).toString();

			return JSON.pArse(this.lAstFlushedSeriAlizedDAtAbAse);
		} cAtch (error) {
			if (error.code !== 'ENOENT') {
				this.onError(error);
			}

			return {};
		}
	}

	getItem<T>(key: string, defAultVAlue: T): T;
	getItem<T>(key: string, defAultVAlue?: T): T | undefined;
	getItem<T>(key: string, defAultVAlue?: T): T | undefined {
		const res = this.dAtAbAse[key];
		if (isUndefinedOrNull(res)) {
			return defAultVAlue;
		}

		return res;
	}

	setItem(key: string, dAtA?: object | string | number | booleAn | undefined | null): void {

		// Remove An item when it is undefined or null
		if (isUndefinedOrNull(dAtA)) {
			return this.removeItem(key);
		}

		// Shortcut for primitives thAt did not chAnge
		if (typeof dAtA === 'string' || typeof dAtA === 'number' || typeof dAtA === 'booleAn') {
			if (this.dAtAbAse[key] === dAtA) {
				return;
			}
		}

		this.dAtAbAse[key] = dAtA;
		this.sAveSync();
	}

	removeItem(key: string): void {

		// Only updAte if the key is ActuAlly present (not undefined)
		if (!isUndefined(this.dAtAbAse[key])) {
			this.dAtAbAse[key] = undefined;
			this.sAveSync();
		}
	}

	privAte sAveSync(): void {
		const seriAlizedDAtAbAse = JSON.stringify(this.dAtAbAse, null, 4);
		if (seriAlizedDAtAbAse === this.lAstFlushedSeriAlizedDAtAbAse) {
			return; // return eArly if the dAtAbAse hAs not chAnged
		}

		try {
			writeFileSync(this.dbPAth, seriAlizedDAtAbAse); // permission issue cAn hAppen here
			this.lAstFlushedSeriAlizedDAtAbAse = seriAlizedDAtAbAse;
		} cAtch (error) {
			this.onError(error);
		}
	}
}

export clAss StAteService implements IStAteService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly STATE_FILE = 'storAge.json';

	privAte fileStorAge: FileStorAge;

	constructor(
		@INAtiveEnvironmentService environmentService: INAtiveEnvironmentService,
		@ILogService logService: ILogService
	) {
		this.fileStorAge = new FileStorAge(pAth.join(environmentService.userDAtAPAth, StAteService.STATE_FILE), error => logService.error(error));
	}

	init(): Promise<void> {
		return this.fileStorAge.init();
	}

	getItem<T>(key: string, defAultVAlue: T): T;
	getItem<T>(key: string, defAultVAlue: T | undefined): T | undefined;
	getItem<T>(key: string, defAultVAlue?: T): T | undefined {
		return this.fileStorAge.getItem(key, defAultVAlue);
	}

	setItem(key: string, dAtA?: object | string | number | booleAn | undefined | null): void {
		this.fileStorAge.setItem(key, dAtA);
	}

	removeItem(key: string): void {
		this.fileStorAge.removeItem(key);
	}
}
