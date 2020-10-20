/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Event } from 'vs/bAse/common/event';
import { IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceIdentifier, ISingleFolderWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';

export const ILAbelService = creAteDecorAtor<ILAbelService>('lAbelService');

export interfAce ILAbelService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Gets the humAn reAdAble lAbel for A uri.
	 * If relAtive is pAssed returns A lAbel relAtive to the workspAce root thAt the uri belongs to.
	 * If noPrefix is pAssed does not tildify the lAbel And Also does not prepAnd the root nAme for relAtive lAbels in A multi root scenArio.
	 */
	getUriLAbel(resource: URI, options?: { relAtive?: booleAn, noPrefix?: booleAn, endWithSepArAtor?: booleAn }): string;
	getUriBAsenAmeLAbel(resource: URI): string;
	getWorkspAceLAbel(workspAce: (IWorkspAceIdentifier | ISingleFolderWorkspAceIdentifier | IWorkspAce), options?: { verbose: booleAn }): string;
	getHostLAbel(scheme: string, Authority?: string): string;
	getSepArAtor(scheme: string, Authority?: string): '/' | '\\';

	registerFormAtter(formAtter: ResourceLAbelFormAtter): IDisposAble;
	onDidChAngeFormAtters: Event<IFormAtterChAngeEvent>;
}

export interfAce IFormAtterChAngeEvent {
	scheme: string;
}

export interfAce ResourceLAbelFormAtter {
	scheme: string;
	Authority?: string;
	priority?: booleAn;
	formAtting: ResourceLAbelFormAtting;
}

export interfAce ResourceLAbelFormAtting {
	lAbel: string; // myLAbel:/${pAth}
	sepArAtor: '/' | '\\' | '';
	tildify?: booleAn;
	normAlizeDriveLetter?: booleAn;
	workspAceSuffix?: string;
	AuthorityPrefix?: string;
	stripPAthStArtingSepArAtor?: booleAn;
}
