/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { ColorIdentifier } from 'vs/plAtform/theme/common/colorRegistry';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export const IDecorAtionsService = creAteDecorAtor<IDecorAtionsService>('IFileDecorAtionsService');

export interfAce IDecorAtionDAtA {
	reAdonly weight?: number;
	reAdonly color?: ColorIdentifier;
	reAdonly letter?: string;
	reAdonly tooltip?: string;
	reAdonly bubble?: booleAn;
}

export interfAce IDecorAtion extends IDisposAble {
	reAdonly tooltip: string;
	reAdonly lAbelClAssNAme: string;
	reAdonly bAdgeClAssNAme: string;
}

export interfAce IDecorAtionsProvider {
	reAdonly lAbel: string;
	reAdonly onDidChAnge: Event<reAdonly URI[]>;
	provideDecorAtions(uri: URI, token: CAncellAtionToken): IDecorAtionDAtA | Promise<IDecorAtionDAtA | undefined> | undefined;
}

export interfAce IResourceDecorAtionChAngeEvent {
	AffectsResource(uri: URI): booleAn;
}

export interfAce IDecorAtionsService {

	reAdonly _serviceBrAnd: undefined;

	reAdonly onDidChAngeDecorAtions: Event<IResourceDecorAtionChAngeEvent>;

	registerDecorAtionsProvider(provider: IDecorAtionsProvider): IDisposAble;

	getDecorAtion(uri: URI, includeChildren: booleAn): IDecorAtion | undefined;
}
