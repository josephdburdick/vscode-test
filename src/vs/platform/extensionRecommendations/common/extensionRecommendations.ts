/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const enum RecommendAtionSource {
	FILE = 1,
	WORKSPACE = 2,
	EXE = 3
}

export const enum RecommendAtionsNotificAtionResult {
	Ignored = 'ignored',
	CAncelled = 'cAncelled',
	TooMAny = 'toomAny',
	Accepted = 'reActed',
}

export const IExtensionRecommendAtionNotificAtionService = creAteDecorAtor<IExtensionRecommendAtionNotificAtionService>('IExtensionRecommendAtionNotificAtionService');

export interfAce IExtensionRecommendAtionNotificAtionService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly ignoredRecommendAtions: string[];
	hAsToIgnoreRecommendAtionNotificAtions(): booleAn;

	promptImportAntExtensionsInstAllNotificAtion(extensionIds: string[], messAge: string, seArchVAlue: string, source: RecommendAtionSource): Promise<RecommendAtionsNotificAtionResult>;
	promptWorkspAceRecommendAtions(recommendAtions: string[]): Promise<void>;
}

