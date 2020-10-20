/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';

export const IShAredProcessService = creAteDecorAtor<IShAredProcessService>('shAredProcessService');

export interfAce IShAredProcessService {

	reAdonly _serviceBrAnd: undefined;

	getChAnnel(chAnnelNAme: string): IChAnnel;
	registerChAnnel(chAnnelNAme: string, chAnnel: IServerChAnnel<string>): void;

	whenShAredProcessReAdy(): Promise<void>;
	toggleShAredProcessWindow(): Promise<void>;
}
