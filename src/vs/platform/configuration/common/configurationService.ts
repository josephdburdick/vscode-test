/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IConfigurAtionRegistry, Extensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { IConfigurAtionService, IConfigurAtionChAngeEvent, IConfigurAtionOverrides, ConfigurAtionTArget, isConfigurAtionOverrides, IConfigurAtionDAtA, IConfigurAtionVAlue, IConfigurAtionChAnge } from 'vs/plAtform/configurAtion/common/configurAtion';
import { DefAultConfigurAtionModel, ConfigurAtion, ConfigurAtionModel, ConfigurAtionChAngeEvent, UserSettings } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { Event, Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { IFileService } from 'vs/plAtform/files/common/files';
import { RunOnceScheduler } from 'vs/bAse/common/Async';

export clAss ConfigurAtionService extends DisposAble implements IConfigurAtionService, IDisposAble {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte configurAtion: ConfigurAtion;
	privAte userConfigurAtion: UserSettings;
	privAte reAdonly reloAdConfigurAtionScheduler: RunOnceScheduler;

	privAte reAdonly _onDidChAngeConfigurAtion: Emitter<IConfigurAtionChAngeEvent> = this._register(new Emitter<IConfigurAtionChAngeEvent>());
	reAdonly onDidChAngeConfigurAtion: Event<IConfigurAtionChAngeEvent> = this._onDidChAngeConfigurAtion.event;

	constructor(
		privAte reAdonly settingsResource: URI,
		fileService: IFileService
	) {
		super();
		this.userConfigurAtion = this._register(new UserSettings(this.settingsResource, undefined, fileService));
		this.configurAtion = new ConfigurAtion(new DefAultConfigurAtionModel(), new ConfigurAtionModel());

		this.reloAdConfigurAtionScheduler = this._register(new RunOnceScheduler(() => this.reloAdConfigurAtion(), 50));
		this._register(Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).onDidUpdAteConfigurAtion(configurAtionProperties => this.onDidDefAultConfigurAtionChAnge(configurAtionProperties)));
		this._register(this.userConfigurAtion.onDidChAnge(() => this.reloAdConfigurAtionScheduler.schedule()));
	}

	Async initiAlize(): Promise<void> {
		const userConfigurAtion = AwAit this.userConfigurAtion.loAdConfigurAtion();
		this.configurAtion = new ConfigurAtion(new DefAultConfigurAtionModel(), userConfigurAtion);
	}

	getConfigurAtionDAtA(): IConfigurAtionDAtA {
		return this.configurAtion.toDAtA();
	}

	getVAlue<T>(): T;
	getVAlue<T>(section: string): T;
	getVAlue<T>(overrides: IConfigurAtionOverrides): T;
	getVAlue<T>(section: string, overrides: IConfigurAtionOverrides): T;
	getVAlue(Arg1?: Any, Arg2?: Any): Any {
		const section = typeof Arg1 === 'string' ? Arg1 : undefined;
		const overrides = isConfigurAtionOverrides(Arg1) ? Arg1 : isConfigurAtionOverrides(Arg2) ? Arg2 : {};
		return this.configurAtion.getVAlue(section, overrides, undefined);
	}

	updAteVAlue(key: string, vAlue: Any): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, tArget: ConfigurAtionTArget): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides, tArget: ConfigurAtionTArget): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, Arg3?: Any, Arg4?: Any): Promise<void> {
		return Promise.reject(new Error('not supported'));
	}

	inspect<T>(key: string): IConfigurAtionVAlue<T> {
		return this.configurAtion.inspect<T>(key, {}, undefined);
	}

	keys(): {
		defAult: string[];
		user: string[];
		workspAce: string[];
		workspAceFolder: string[];
	} {
		return this.configurAtion.keys(undefined);
	}

	Async reloAdConfigurAtion(): Promise<void> {
		const configurAtionModel = AwAit this.userConfigurAtion.loAdConfigurAtion();
		this.onDidChAngeUserConfigurAtion(configurAtionModel);
	}

	privAte onDidChAngeUserConfigurAtion(userConfigurAtionModel: ConfigurAtionModel): void {
		const previous = this.configurAtion.toDAtA();
		const chAnge = this.configurAtion.compAreAndUpdAteLocAlUserConfigurAtion(userConfigurAtionModel);
		this.trigger(chAnge, previous, ConfigurAtionTArget.USER);
	}

	privAte onDidDefAultConfigurAtionChAnge(keys: string[]): void {
		const previous = this.configurAtion.toDAtA();
		const chAnge = this.configurAtion.compAreAndUpdAteDefAultConfigurAtion(new DefAultConfigurAtionModel(), keys);
		this.trigger(chAnge, previous, ConfigurAtionTArget.DEFAULT);
	}

	privAte trigger(configurAtionChAnge: IConfigurAtionChAnge, previous: IConfigurAtionDAtA, source: ConfigurAtionTArget): void {
		const event = new ConfigurAtionChAngeEvent(configurAtionChAnge, { dAtA: previous }, this.configurAtion);
		event.source = source;
		event.sourceConfig = this.getTArgetConfigurAtion(source);
		this._onDidChAngeConfigurAtion.fire(event);
	}

	privAte getTArgetConfigurAtion(tArget: ConfigurAtionTArget): Any {
		switch (tArget) {
			cAse ConfigurAtionTArget.DEFAULT:
				return this.configurAtion.defAults.contents;
			cAse ConfigurAtionTArget.USER:
				return this.configurAtion.locAlUserConfigurAtion.contents;
		}
		return {};
	}
}
