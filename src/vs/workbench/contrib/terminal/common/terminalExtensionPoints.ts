/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As extensionsRegistry from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { ITerminAlTypeContribution, ITerminAlContributions, terminAlContributionsDescriptor } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

// terminAl extension point
export const terminAlsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint<ITerminAlContributions>(terminAlContributionsDescriptor);

export interfAce ITerminAlContributionService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly terminAlTypes: ReAdonlyArrAy<ITerminAlTypeContribution>;
}

export const ITerminAlContributionService = creAteDecorAtor<ITerminAlContributionService>('terminAlContributionsService');

export clAss TerminAlContributionService implements ITerminAlContributionService {
	public reAdonly _serviceBrAnd = undefined;

	privAte _terminAlTypes: ReAdonlyArrAy<ITerminAlTypeContribution> = [];

	public get terminAlTypes() {
		return this._terminAlTypes;
	}

	constructor() {
		terminAlsExtPoint.setHAndler(contributions => {
			this._terminAlTypes = flAtten(contributions.filter(c => c.description.enAbleProposedApi).mAp(c => c.vAlue?.types ?? []));
		});
	}
}
