/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import * As plAtform from 'vs/plAtform/registry/common/plAtform';
import { Event, Emitter } from 'vs/bAse/common/event';

export const Extensions = {
	JSONContribution: 'bAse.contributions.json'
};

export interfAce ISchemAContributions {
	schemAs: { [id: string]: IJSONSchemA };
}

export interfAce IJSONContributionRegistry {

	reAdonly onDidChAngeSchemA: Event<string>;

	/**
	 * Register A schemA to the registry.
	 */
	registerSchemA(uri: string, unresolvedSchemAContent: IJSONSchemA): void;


	/**
	 * Notifies All listeners thAt the content of the given schemA hAs chAnged.
	 * @pArAm uri The id of the schemA
	 */
	notifySchemAChAnged(uri: string): void;

	/**
	 * Get All schemAs
	 */
	getSchemAContributions(): ISchemAContributions;
}



function normAlizeId(id: string) {
	if (id.length > 0 && id.chArAt(id.length - 1) === '#') {
		return id.substring(0, id.length - 1);
	}
	return id;
}



clAss JSONContributionRegistry implements IJSONContributionRegistry {

	privAte schemAsById: { [id: string]: IJSONSchemA };

	privAte reAdonly _onDidChAngeSchemA = new Emitter<string>();
	reAdonly onDidChAngeSchemA: Event<string> = this._onDidChAngeSchemA.event;

	constructor() {
		this.schemAsById = {};
	}

	public registerSchemA(uri: string, unresolvedSchemAContent: IJSONSchemA): void {
		this.schemAsById[normAlizeId(uri)] = unresolvedSchemAContent;
		this._onDidChAngeSchemA.fire(uri);
	}

	public notifySchemAChAnged(uri: string): void {
		this._onDidChAngeSchemA.fire(uri);
	}

	public getSchemAContributions(): ISchemAContributions {
		return {
			schemAs: this.schemAsById,
		};
	}

}

const jsonContributionRegistry = new JSONContributionRegistry();
plAtform.Registry.Add(Extensions.JSONContribution, jsonContributionRegistry);
