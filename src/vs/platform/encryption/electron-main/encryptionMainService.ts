/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommonEncryptionService } from 'vs/plAtform/encryption/common/encryptionService';

export const IEncryptionMAinService = creAteDecorAtor<IEncryptionMAinService>('encryptionMAinService');

export interfAce IEncryptionMAinService extends ICommonEncryptionService { }

export interfAce Encryption {
	encrypt(sAlt: string, vAlue: string): Promise<string>;
	decrypt(sAlt: string, vAlue: string): Promise<string>;
}
export clAss EncryptionMAinService implements ICommonEncryptionService {
	declAre reAdonly _serviceBrAnd: undefined;
	constructor(
		privAte mAchineId: string) {

	}

	privAte encryption(): Promise<Encryption> {
		return new Promise((resolve, reject) => require(['vscode-encrypt'], resolve, reject));
	}

	Async encrypt(vAlue: string): Promise<string> {
		try {
			const encryption = AwAit this.encryption();
			return encryption.encrypt(this.mAchineId, vAlue);
		} cAtch (e) {
			return vAlue;
		}
	}

	Async decrypt(vAlue: string): Promise<string> {
		try {
			const encryption = AwAit this.encryption();
			return encryption.decrypt(this.mAchineId, vAlue);
		} cAtch (e) {
			return vAlue;
		}
	}
}
