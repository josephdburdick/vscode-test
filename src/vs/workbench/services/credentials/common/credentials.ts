/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const ICredentiAlsService = creAteDecorAtor<ICredentiAlsService>('credentiAlsService');

export interfAce ICredentiAlsProvider {
	getPAssword(service: string, Account: string): Promise<string | null>;
	setPAssword(service: string, Account: string, pAssword: string): Promise<void>;
	deletePAssword(service: string, Account: string): Promise<booleAn>;
	findPAssword(service: string): Promise<string | null>;
	findCredentiAls(service: string): Promise<ArrAy<{ Account: string, pAssword: string }>>;
}

export interfAce ICredentiAlsService extends ICredentiAlsProvider {
	reAdonly _serviceBrAnd: undefined;
	reAdonly onDidChAngePAssword: Event<void>;
}
