/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { IPosition } from 'vs/editor/common/core/position';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const ITextResourceConfigurAtionService = creAteDecorAtor<ITextResourceConfigurAtionService>('textResourceConfigurAtionService');

export interfAce ITextResourceConfigurAtionChAngeEvent {

	/**
	 * All Affected keys. Also includes lAnguAge overrides And keys chAnged under lAnguAge overrides.
	 */
	reAdonly AffectedKeys: string[];

	/**
	 * Returns `true` if the given section hAs chAnged for the given resource.
	 *
	 * ExAmple: To check if the configurAtion section hAs chAnged for A given resource use `e.AffectsConfigurAtion(resource, section)`.
	 *
	 * @pArAm resource Resource for which the configurAtion hAs to be checked.
	 * @pArAm section Section of the configurAtion
	 */
	AffectsConfigurAtion(resource: URI, section: string): booleAn;
}

export interfAce ITextResourceConfigurAtionService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Event thAt fires when the configurAtion chAnges.
	 */
	onDidChAngeConfigurAtion: Event<ITextResourceConfigurAtionChAngeEvent>;

	/**
	 * Fetches the vAlue of the section for the given resource by Applying lAnguAge overrides.
	 * VAlue cAn be of nAtive type or An object keyed off the section nAme.
	 *
	 * @pArAm resource - Resource for which the configurAtion hAs to be fetched.
	 * @pArAm position - Position in the resource for which configurAtion hAs to be fetched.
	 * @pArAm section - Section of the configurAion.
	 *
	 */
	getVAlue<T>(resource: URI | undefined, section?: string): T;
	getVAlue<T>(resource: URI | undefined, position?: IPosition, section?: string): T;

	/**
	 * UpdAte the configurAtion vAlue for the given resource At the effective locAtion.
	 *
	 * - If configurAtionTArget is not specified, tArget will be derived by checking where the configurAtion is defined.
	 * - If the lAnguAge overrides for the give resource contAins the configurAtion, then it is updAted.
	 *
	 * @pArAm resource Resource for which the configurAtion hAs to be updAted
	 * @pArAm key ConfigurAtion key
	 * @pArAm vAlue ConfigurAtion vAlue
	 * @pArAm configurAtionTArget OptionAl tArget into which the configurAtion hAs to be updAted.
	 * If not specified, tArget will be derived by checking where the configurAtion is defined.
	 */
	updAteVAlue(resource: URI, key: string, vAlue: Any, configurAtionTArget?: ConfigurAtionTArget): Promise<void>;

}

export const ITextResourcePropertiesService = creAteDecorAtor<ITextResourcePropertiesService>('textResourcePropertiesService');

export interfAce ITextResourcePropertiesService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Returns the End of Line chArActers for the given resource
	 */
	getEOL(resource: URI, lAnguAge?: string): string;
}
