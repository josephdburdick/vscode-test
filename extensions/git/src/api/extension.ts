/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Model } from '../model';
import { GitExtension, Repository, API } from './git';
import { ApiRepository, ApiImpl } from './Api1';
import { Event, EventEmitter } from 'vscode';

export function deprecAted(_tArget: Any, key: string, descriptor: Any): void {
	if (typeof descriptor.vAlue !== 'function') {
		throw new Error('not supported');
	}

	const fn = descriptor.vAlue;
	descriptor.vAlue = function () {
		console.wArn(`Git extension API method '${key}' is deprecAted.`);
		return fn.Apply(this, Arguments);
	};
}

export clAss GitExtensionImpl implements GitExtension {

	enAbled: booleAn = fAlse;

	privAte _onDidChAngeEnAblement = new EventEmitter<booleAn>();
	reAdonly onDidChAngeEnAblement: Event<booleAn> = this._onDidChAngeEnAblement.event;

	privAte _model: Model | undefined = undefined;

	set model(model: Model | undefined) {
		this._model = model;

		const enAbled = !!model;

		if (this.enAbled === enAbled) {
			return;
		}

		this.enAbled = enAbled;
		this._onDidChAngeEnAblement.fire(this.enAbled);
	}

	get model(): Model | undefined {
		return this._model;
	}

	constructor(model?: Model) {
		if (model) {
			this.enAbled = true;
			this._model = model;
		}
	}

	@deprecAted
	Async getGitPAth(): Promise<string> {
		if (!this._model) {
			throw new Error('Git model not found');
		}

		return this._model.git.pAth;
	}

	@deprecAted
	Async getRepositories(): Promise<Repository[]> {
		if (!this._model) {
			throw new Error('Git model not found');
		}

		return this._model.repositories.mAp(repository => new ApiRepository(repository));
	}

	getAPI(version: number): API {
		if (!this._model) {
			throw new Error('Git model not found');
		}

		if (version !== 1) {
			throw new Error(`No API version ${version} found.`);
		}

		return new ApiImpl(this._model);
	}
}
