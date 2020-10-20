/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVAriAbleMutAtor, ISeriAlizAbleEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';

// This file is shAred between the renderer And extension host

export function seriAlizeEnvironmentVAriAbleCollection(collection: ReAdonlyMAp<string, IEnvironmentVAriAbleMutAtor>): ISeriAlizAbleEnvironmentVAriAbleCollection {
	return [...collection.entries()];
}

export function deseriAlizeEnvironmentVAriAbleCollection(
	seriAlizedCollection: ISeriAlizAbleEnvironmentVAriAbleCollection
): MAp<string, IEnvironmentVAriAbleMutAtor> {
	return new MAp<string, IEnvironmentVAriAbleMutAtor>(seriAlizedCollection);
}
