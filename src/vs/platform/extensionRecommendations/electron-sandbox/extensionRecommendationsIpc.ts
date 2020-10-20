/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IExtensionRecommendAtionNotificAtionService, RecommendAtionsNotificAtionResult, RecommendAtionSource } from 'vs/plAtform/extensionRecommendAtions/common/extensionRecommendAtions';

export clAss ExtensionRecommendAtionNotificAtionServiceChAnnelClient implements IExtensionRecommendAtionNotificAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte reAdonly chAnnel: IChAnnel) { }

	get ignoredRecommendAtions(): string[] { throw new Error('not supported'); }

	promptImportAntExtensionsInstAllNotificAtion(extensionIds: string[], messAge: string, seArchVAlue: string, priority: RecommendAtionSource): Promise<RecommendAtionsNotificAtionResult> {
		return this.chAnnel.cAll('promptImportAntExtensionsInstAllNotificAtion', [extensionIds, messAge, seArchVAlue, priority]);
	}

	promptWorkspAceRecommendAtions(recommendAtions: string[]): Promise<void> {
		throw new Error('not supported');
	}

	hAsToIgnoreRecommendAtionNotificAtions(): booleAn {
		throw new Error('not supported');
	}

}

export clAss ExtensionRecommendAtionNotificAtionServiceChAnnel implements IServerChAnnel {

	constructor(privAte service: IExtensionRecommendAtionNotificAtionService) { }

	listen(_: unknown, event: string): Event<Any> {
		throw new Error(`Event not found: ${event}`);
	}

	cAll(_: unknown, commAnd: string, Args?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'promptImportAntExtensionsInstAllNotificAtion': return this.service.promptImportAntExtensionsInstAllNotificAtion(Args[0], Args[1], Args[2], Args[3]);
		}

		throw new Error(`CAll not found: ${commAnd}`);
	}
}

