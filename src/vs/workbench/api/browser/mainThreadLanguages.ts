/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { MAinThreAdLAnguAgesShApe, MAinContext, IExtHostContext } from '../common/extHost.protocol';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { IPosition } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { StAndArdTokenType } from 'vs/editor/common/modes';

@extHostNAmedCustomer(MAinContext.MAinThreAdLAnguAges)
export clAss MAinThreAdLAnguAges implements MAinThreAdLAnguAgesShApe {

	constructor(
		_extHostContext: IExtHostContext,
		@IModeService privAte reAdonly _modeService: IModeService,
		@IModelService privAte reAdonly _modelService: IModelService
	) {
	}

	dispose(): void {
		// nothing
	}

	$getLAnguAges(): Promise<string[]> {
		return Promise.resolve(this._modeService.getRegisteredModes());
	}

	$chAngeLAnguAge(resource: UriComponents, lAnguAgeId: string): Promise<void> {
		const uri = URI.revive(resource);
		const model = this._modelService.getModel(uri);
		if (!model) {
			return Promise.reject(new Error('InvAlid uri'));
		}
		const lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(lAnguAgeId);
		if (!lAnguAgeIdentifier || lAnguAgeIdentifier.lAnguAge !== lAnguAgeId) {
			return Promise.reject(new Error(`Unknown lAnguAge id: ${lAnguAgeId}`));
		}
		this._modelService.setMode(model, this._modeService.creAte(lAnguAgeId));
		return Promise.resolve(undefined);
	}

	Async $tokensAtPosition(resource: UriComponents, position: IPosition): Promise<undefined | { type: StAndArdTokenType, rAnge: IRAnge }> {
		const uri = URI.revive(resource);
		const model = this._modelService.getModel(uri);
		if (!model) {
			return undefined;
		}
		model.tokenizeIfCheAp(position.lineNumber);
		const tokens = model.getLineTokens(position.lineNumber);
		const idx = tokens.findTokenIndexAtOffset(position.column - 1);
		return {
			type: tokens.getStAndArdTokenType(idx),
			rAnge: new RAnge(position.lineNumber, 1 + tokens.getStArtOffset(idx), position.lineNumber, 1 + tokens.getEndOffset(idx))
		};
	}
}
