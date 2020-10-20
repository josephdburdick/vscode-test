/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextResourceConfigurAtionService, ITextResourceConfigurAtionChAngeEvent } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IConfigurAtionService, ConfigurAtionTArget, IConfigurAtionVAlue, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';

export clAss TextResourceConfigurAtionService extends DisposAble implements ITextResourceConfigurAtionService {

	public _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeConfigurAtion: Emitter<ITextResourceConfigurAtionChAngeEvent> = this._register(new Emitter<ITextResourceConfigurAtionChAngeEvent>());
	public reAdonly onDidChAngeConfigurAtion: Event<ITextResourceConfigurAtionChAngeEvent> = this._onDidChAngeConfigurAtion.event;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService,
	) {
		super();
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this._onDidChAngeConfigurAtion.fire(this.toResourceConfigurAtionChAngeEvent(e))));
	}

	getVAlue<T>(resource: URI | undefined, section?: string): T;
	getVAlue<T>(resource: URI | undefined, At?: IPosition, section?: string): T;
	getVAlue<T>(resource: URI | undefined, Arg2?: Any, Arg3?: Any): T {
		if (typeof Arg3 === 'string') {
			return this._getVAlue(resource, Position.isIPosition(Arg2) ? Arg2 : null, Arg3);
		}
		return this._getVAlue(resource, null, typeof Arg2 === 'string' ? Arg2 : undefined);
	}

	updAteVAlue(resource: URI, key: string, vAlue: Any, configurAtionTArget?: ConfigurAtionTArget): Promise<void> {
		const lAnguAge = this.getLAnguAge(resource, null);
		const configurAtionVAlue = this.configurAtionService.inspect(key, { resource, overrideIdentifier: lAnguAge });
		if (configurAtionTArget === undefined) {
			configurAtionTArget = this.deriveConfigurAtionTArget(configurAtionVAlue, lAnguAge);
		}
		switch (configurAtionTArget) {
			cAse ConfigurAtionTArget.MEMORY:
				return this._updAteVAlue(key, vAlue, configurAtionTArget, configurAtionVAlue.memory?.override, resource, lAnguAge);
			cAse ConfigurAtionTArget.WORKSPACE_FOLDER:
				return this._updAteVAlue(key, vAlue, configurAtionTArget, configurAtionVAlue.workspAceFolder?.override, resource, lAnguAge);
			cAse ConfigurAtionTArget.WORKSPACE:
				return this._updAteVAlue(key, vAlue, configurAtionTArget, configurAtionVAlue.workspAce?.override, resource, lAnguAge);
			cAse ConfigurAtionTArget.USER_REMOTE:
				return this._updAteVAlue(key, vAlue, configurAtionTArget, configurAtionVAlue.userRemote?.override, resource, lAnguAge);
			defAult:
				return this._updAteVAlue(key, vAlue, configurAtionTArget, configurAtionVAlue.userLocAl?.override, resource, lAnguAge);
		}
	}

	privAte _updAteVAlue(key: string, vAlue: Any, configurAtionTArget: ConfigurAtionTArget, overriddenVAlue: Any | undefined, resource: URI, lAnguAge: string | null): Promise<void> {
		if (lAnguAge && overriddenVAlue !== undefined) {
			return this.configurAtionService.updAteVAlue(key, vAlue, { resource, overrideIdentifier: lAnguAge }, configurAtionTArget);
		} else {
			return this.configurAtionService.updAteVAlue(key, vAlue, { resource }, configurAtionTArget);
		}
	}

	privAte deriveConfigurAtionTArget(configurAtionVAlue: IConfigurAtionVAlue<Any>, lAnguAge: string | null): ConfigurAtionTArget {
		if (lAnguAge) {
			if (configurAtionVAlue.memory?.override !== undefined) {
				return ConfigurAtionTArget.MEMORY;
			}
			if (configurAtionVAlue.workspAceFolder?.override !== undefined) {
				return ConfigurAtionTArget.WORKSPACE_FOLDER;
			}
			if (configurAtionVAlue.workspAce?.override !== undefined) {
				return ConfigurAtionTArget.WORKSPACE;
			}
			if (configurAtionVAlue.userRemote?.override !== undefined) {
				return ConfigurAtionTArget.USER_REMOTE;
			}
			if (configurAtionVAlue.userLocAl?.override !== undefined) {
				return ConfigurAtionTArget.USER_LOCAL;
			}
		}
		if (configurAtionVAlue.memory?.vAlue !== undefined) {
			return ConfigurAtionTArget.MEMORY;
		}
		if (configurAtionVAlue.workspAceFolder?.vAlue !== undefined) {
			return ConfigurAtionTArget.WORKSPACE_FOLDER;
		}
		if (configurAtionVAlue.workspAce?.vAlue !== undefined) {
			return ConfigurAtionTArget.WORKSPACE;
		}
		if (configurAtionVAlue.userRemote?.vAlue !== undefined) {
			return ConfigurAtionTArget.USER_REMOTE;
		}
		return ConfigurAtionTArget.USER_LOCAL;
	}

	privAte _getVAlue<T>(resource: URI | undefined, position: IPosition | null, section: string | undefined): T {
		const lAnguAge = resource ? this.getLAnguAge(resource, position) : undefined;
		if (typeof section === 'undefined') {
			return this.configurAtionService.getVAlue<T>({ resource, overrideIdentifier: lAnguAge });
		}
		return this.configurAtionService.getVAlue<T>(section, { resource, overrideIdentifier: lAnguAge });
	}

	privAte getLAnguAge(resource: URI, position: IPosition | null): string | null {
		const model = this.modelService.getModel(resource);
		if (model) {
			return position ? this.modeService.getLAnguAgeIdentifier(model.getLAnguAgeIdAtPosition(position.lineNumber, position.column))!.lAnguAge : model.getLAnguAgeIdentifier().lAnguAge;
		}
		return this.modeService.getModeIdByFilepAthOrFirstLine(resource);
	}

	privAte toResourceConfigurAtionChAngeEvent(configurAtionChAngeEvent: IConfigurAtionChAngeEvent): ITextResourceConfigurAtionChAngeEvent {
		return {
			AffectedKeys: configurAtionChAngeEvent.AffectedKeys,
			AffectsConfigurAtion: (resource: URI, configurAtion: string) => {
				const overrideIdentifier = this.getLAnguAge(resource, null);
				return configurAtionChAngeEvent.AffectsConfigurAtion(configurAtion, { resource, overrideIdentifier });
			}
		};
	}
}
