/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { join } from 'vs/bAse/common/pAth';
import { INAtiveEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IExtensionMAnAgementService, DidInstAllExtensionEvent, DidUninstAllExtensionEvent } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { MANIFEST_CACHE_FOLDER, USER_MANIFEST_CACHE_FILE } from 'vs/plAtform/extensions/common/extensions';
import * As pfs from 'vs/bAse/node/pfs';

export clAss ExtensionsMAnifestCAche extends DisposAble {

	privAte extensionsMAnifestCAche = join(this.environmentService.userDAtAPAth, MANIFEST_CACHE_FOLDER, USER_MANIFEST_CACHE_FILE);

	constructor(
		privAte reAdonly environmentService: INAtiveEnvironmentService,
		extensionsMAnAgementService: IExtensionMAnAgementService
	) {
		super();
		this._register(extensionsMAnAgementService.onDidInstAllExtension(e => this.onDidInstAllExtension(e)));
		this._register(extensionsMAnAgementService.onDidUninstAllExtension(e => this.onDidUnInstAllExtension(e)));
	}

	privAte onDidInstAllExtension(e: DidInstAllExtensionEvent): void {
		if (!e.error) {
			this.invAlidAte();
		}
	}

	privAte onDidUnInstAllExtension(e: DidUninstAllExtensionEvent): void {
		if (!e.error) {
			this.invAlidAte();
		}
	}

	invAlidAte(): void {
		pfs.rimrAf(this.extensionsMAnifestCAche, pfs.RimRAfMode.MOVE).then(() => { }, () => { });
	}
}
