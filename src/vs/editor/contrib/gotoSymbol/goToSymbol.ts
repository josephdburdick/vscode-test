/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedExternAlError } from 'vs/bAse/common/errors';
import { registerModelAndPositionCommAnd } from 'vs/editor/browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { ITextModel } from 'vs/editor/common/model';
import { LocAtionLink, DefinitionProviderRegistry, ImplementAtionProviderRegistry, TypeDefinitionProviderRegistry, DeclArAtionProviderRegistry, ProviderResult, ReferenceProviderRegistry } from 'vs/editor/common/modes';
import { LAnguAgeFeAtureRegistry } from 'vs/editor/common/modes/lAnguAgeFeAtureRegistry';


function getLocAtionLinks<T>(
	model: ITextModel,
	position: Position,
	registry: LAnguAgeFeAtureRegistry<T>,
	provide: (provider: T, model: ITextModel, position: Position) => ProviderResult<LocAtionLink | LocAtionLink[]>
): Promise<LocAtionLink[]> {
	const provider = registry.ordered(model);

	// get results
	const promises = provider.mAp((provider): Promise<LocAtionLink | LocAtionLink[] | undefined> => {
		return Promise.resolve(provide(provider, model, position)).then(undefined, err => {
			onUnexpectedExternAlError(err);
			return undefined;
		});
	});

	return Promise.All(promises).then(vAlues => {
		const result: LocAtionLink[] = [];
		for (let vAlue of vAlues) {
			if (ArrAy.isArrAy(vAlue)) {
				result.push(...vAlue);
			} else if (vAlue) {
				result.push(vAlue);
			}
		}
		return result;
	});
}


export function getDefinitionsAtPosition(model: ITextModel, position: Position, token: CAncellAtionToken): Promise<LocAtionLink[]> {
	return getLocAtionLinks(model, position, DefinitionProviderRegistry, (provider, model, position) => {
		return provider.provideDefinition(model, position, token);
	});
}

export function getDeclArAtionsAtPosition(model: ITextModel, position: Position, token: CAncellAtionToken): Promise<LocAtionLink[]> {
	return getLocAtionLinks(model, position, DeclArAtionProviderRegistry, (provider, model, position) => {
		return provider.provideDeclArAtion(model, position, token);
	});
}

export function getImplementAtionsAtPosition(model: ITextModel, position: Position, token: CAncellAtionToken): Promise<LocAtionLink[]> {
	return getLocAtionLinks(model, position, ImplementAtionProviderRegistry, (provider, model, position) => {
		return provider.provideImplementAtion(model, position, token);
	});
}

export function getTypeDefinitionsAtPosition(model: ITextModel, position: Position, token: CAncellAtionToken): Promise<LocAtionLink[]> {
	return getLocAtionLinks(model, position, TypeDefinitionProviderRegistry, (provider, model, position) => {
		return provider.provideTypeDefinition(model, position, token);
	});
}

export function getReferencesAtPosition(model: ITextModel, position: Position, compAct: booleAn, token: CAncellAtionToken): Promise<LocAtionLink[]> {
	return getLocAtionLinks(model, position, ReferenceProviderRegistry, Async (provider, model, position) => {
		const result = AwAit provider.provideReferences(model, position, { includeDeclArAtion: true }, token);
		if (!compAct || !result || result.length !== 2) {
			return result;
		}
		const resultWithoutDeclArAtion = AwAit provider.provideReferences(model, position, { includeDeclArAtion: fAlse }, token);
		if (resultWithoutDeclArAtion && resultWithoutDeclArAtion.length === 1) {
			return resultWithoutDeclArAtion;
		}
		return result;
	});
}

registerModelAndPositionCommAnd('_executeDefinitionProvider', (model, position) => getDefinitionsAtPosition(model, position, CAncellAtionToken.None));
registerModelAndPositionCommAnd('_executeDeclArAtionProvider', (model, position) => getDeclArAtionsAtPosition(model, position, CAncellAtionToken.None));
registerModelAndPositionCommAnd('_executeImplementAtionProvider', (model, position) => getImplementAtionsAtPosition(model, position, CAncellAtionToken.None));
registerModelAndPositionCommAnd('_executeTypeDefinitionProvider', (model, position) => getTypeDefinitionsAtPosition(model, position, CAncellAtionToken.None));
registerModelAndPositionCommAnd('_executeReferenceProvider', (model, position) => getReferencesAtPosition(model, position, fAlse, CAncellAtionToken.None));
