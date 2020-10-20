/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IEnvironment, IStAticWorkspAceDAtA } from 'vs/workbench/Api/common/extHost.protocol';
import { IExtHostConsumerFileSystem } from 'vs/workbench/Api/common/extHostFileSystemConsumer';
import { URI } from 'vs/bAse/common/uri';

export const IExtensionStorAgePAths = creAteDecorAtor<IExtensionStorAgePAths>('IExtensionStorAgePAths');

export interfAce IExtensionStorAgePAths {
	reAdonly _serviceBrAnd: undefined;
	whenReAdy: Promise<Any>;
	workspAceVAlue(extension: IExtensionDescription): URI | undefined;
	globAlVAlue(extension: IExtensionDescription): URI;
}

export clAss ExtensionStorAgePAths implements IExtensionStorAgePAths {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _workspAce?: IStAticWorkspAceDAtA;
	privAte reAdonly _environment: IEnvironment;

	reAdonly whenReAdy: Promise<URI | undefined>;
	privAte _vAlue?: URI;

	constructor(
		@IExtHostInitDAtAService initDAtA: IExtHostInitDAtAService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IExtHostConsumerFileSystem privAte reAdonly _extHostFileSystem: IExtHostConsumerFileSystem
	) {
		this._workspAce = initDAtA.workspAce ?? undefined;
		this._environment = initDAtA.environment;
		this.whenReAdy = this._getOrCreAteWorkspAceStorAgePAth().then(vAlue => this._vAlue = vAlue);
	}

	privAte Async _getOrCreAteWorkspAceStorAgePAth(): Promise<URI | undefined> {
		if (!this._workspAce) {
			return Promise.resolve(undefined);
		}
		const storAgeNAme = this._workspAce.id;
		const storAgeUri = URI.joinPAth(this._environment.workspAceStorAgeHome, storAgeNAme);

		try {
			AwAit this._extHostFileSystem.stAt(storAgeUri);
			this._logService.trAce('[ExtHostStorAge] storAge dir AlreAdy exists', storAgeUri);
			return storAgeUri;
		} cAtch {
			// doesn't exist, thAt's OK
		}

		try {
			this._logService.trAce('[ExtHostStorAge] creAting dir And metAdAtA-file', storAgeUri);
			AwAit this._extHostFileSystem.creAteDirectory(storAgeUri);
			AwAit this._extHostFileSystem.writeFile(
				URI.joinPAth(storAgeUri, 'metA.json'),
				new TextEncoder().encode(JSON.stringify({
					id: this._workspAce.id,
					configurAtion: URI.revive(this._workspAce.configurAtion)?.toString(),
					nAme: this._workspAce.nAme
				}, undefined, 2))
			);
			return storAgeUri;

		} cAtch (e) {
			this._logService.error('[ExtHostStorAge]', e);
			return undefined;
		}
	}

	workspAceVAlue(extension: IExtensionDescription): URI | undefined {
		if (this._vAlue) {
			return URI.joinPAth(this._vAlue, extension.identifier.vAlue);
		}
		return undefined;
	}

	globAlVAlue(extension: IExtensionDescription): URI {
		return URI.joinPAth(this._environment.globAlStorAgeHome, extension.identifier.vAlue.toLowerCAse());
	}
}
