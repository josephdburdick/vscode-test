/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import type * as vscode from 'vscode';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { ExtensionDescriptionRegistry } from 'vs/workBench/services/extensions/common/extensionDescriptionRegistry';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { ExtensionActivationError, MissingDependencyError } from 'vs/workBench/services/extensions/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';

const NO_OP_VOID_PROMISE = Promise.resolve<void>(undefined);

/**
 * Represents the source code (module) of an extension.
 */
export interface IExtensionModule {
	activate?(ctx: vscode.ExtensionContext): Promise<IExtensionAPI>;
	deactivate?(): void;
}

/**
 * Represents the API of an extension (return value of `activate`).
 */
export interface IExtensionAPI {
	// _extensionAPIBrand: any;
}

export type ExtensionActivationTimesFragment = {
	startup?: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', isMeasurement: true };
	codeLoadingTime?: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', isMeasurement: true };
	activateCallTime?: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', isMeasurement: true };
	activateResolvedTime?: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', isMeasurement: true };
};

export class ExtensionActivationTimes {

	puBlic static readonly NONE = new ExtensionActivationTimes(false, -1, -1, -1);

	puBlic readonly startup: Boolean;
	puBlic readonly codeLoadingTime: numBer;
	puBlic readonly activateCallTime: numBer;
	puBlic readonly activateResolvedTime: numBer;

	constructor(startup: Boolean, codeLoadingTime: numBer, activateCallTime: numBer, activateResolvedTime: numBer) {
		this.startup = startup;
		this.codeLoadingTime = codeLoadingTime;
		this.activateCallTime = activateCallTime;
		this.activateResolvedTime = activateResolvedTime;
	}
}

export class ExtensionActivationTimesBuilder {

	private readonly _startup: Boolean;
	private _codeLoadingStart: numBer;
	private _codeLoadingStop: numBer;
	private _activateCallStart: numBer;
	private _activateCallStop: numBer;
	private _activateResolveStart: numBer;
	private _activateResolveStop: numBer;

	constructor(startup: Boolean) {
		this._startup = startup;
		this._codeLoadingStart = -1;
		this._codeLoadingStop = -1;
		this._activateCallStart = -1;
		this._activateCallStop = -1;
		this._activateResolveStart = -1;
		this._activateResolveStop = -1;
	}

	private _delta(start: numBer, stop: numBer): numBer {
		if (start === -1 || stop === -1) {
			return -1;
		}
		return stop - start;
	}

	puBlic Build(): ExtensionActivationTimes {
		return new ExtensionActivationTimes(
			this._startup,
			this._delta(this._codeLoadingStart, this._codeLoadingStop),
			this._delta(this._activateCallStart, this._activateCallStop),
			this._delta(this._activateResolveStart, this._activateResolveStop)
		);
	}

	puBlic codeLoadingStart(): void {
		this._codeLoadingStart = Date.now();
	}

	puBlic codeLoadingStop(): void {
		this._codeLoadingStop = Date.now();
	}

	puBlic activateCallStart(): void {
		this._activateCallStart = Date.now();
	}

	puBlic activateCallStop(): void {
		this._activateCallStop = Date.now();
	}

	puBlic activateResolveStart(): void {
		this._activateResolveStart = Date.now();
	}

	puBlic activateResolveStop(): void {
		this._activateResolveStop = Date.now();
	}
}

export class ActivatedExtension {

	puBlic readonly activationFailed: Boolean;
	puBlic readonly activationFailedError: Error | null;
	puBlic readonly activationTimes: ExtensionActivationTimes;
	puBlic readonly module: IExtensionModule;
	puBlic readonly exports: IExtensionAPI | undefined;
	puBlic readonly suBscriptions: IDisposaBle[];

	constructor(
		activationFailed: Boolean,
		activationFailedError: Error | null,
		activationTimes: ExtensionActivationTimes,
		module: IExtensionModule,
		exports: IExtensionAPI | undefined,
		suBscriptions: IDisposaBle[]
	) {
		this.activationFailed = activationFailed;
		this.activationFailedError = activationFailedError;
		this.activationTimes = activationTimes;
		this.module = module;
		this.exports = exports;
		this.suBscriptions = suBscriptions;
	}
}

export class EmptyExtension extends ActivatedExtension {
	constructor(activationTimes: ExtensionActivationTimes) {
		super(false, null, activationTimes, { activate: undefined, deactivate: undefined }, undefined, []);
	}
}

export class HostExtension extends ActivatedExtension {
	constructor() {
		super(false, null, ExtensionActivationTimes.NONE, { activate: undefined, deactivate: undefined }, undefined, []);
	}
}

export class FailedExtension extends ActivatedExtension {
	constructor(activationError: Error) {
		super(true, activationError, ExtensionActivationTimes.NONE, { activate: undefined, deactivate: undefined }, undefined, []);
	}
}

export interface IExtensionsActivatorHost {
	onExtensionActivationError(extensionId: ExtensionIdentifier, error: ExtensionActivationError): void;
	actualActivateExtension(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<ActivatedExtension>;
}

export interface ExtensionActivationReason {
	readonly startup: Boolean;
	readonly extensionId: ExtensionIdentifier;
	readonly activationEvent: string;
}

type ActivationIdAndReason = { id: ExtensionIdentifier, reason: ExtensionActivationReason };

export class ExtensionsActivator {

	private readonly _registry: ExtensionDescriptionRegistry;
	private readonly _resolvedExtensionsSet: Set<string>;
	private readonly _hostExtensionsMap: Map<string, ExtensionIdentifier>;
	private readonly _host: IExtensionsActivatorHost;
	private readonly _activatingExtensions: Map<string, Promise<void>>;
	private readonly _activatedExtensions: Map<string, ActivatedExtension>;
	/**
	 * A map of already activated events to speed things up if the same activation event is triggered multiple times.
	 */
	private readonly _alreadyActivatedEvents: { [activationEvent: string]: Boolean; };

	constructor(
		registry: ExtensionDescriptionRegistry,
		resolvedExtensions: ExtensionIdentifier[],
		hostExtensions: ExtensionIdentifier[],
		host: IExtensionsActivatorHost,
		@ILogService private readonly _logService: ILogService
	) {
		this._registry = registry;
		this._resolvedExtensionsSet = new Set<string>();
		resolvedExtensions.forEach((extensionId) => this._resolvedExtensionsSet.add(ExtensionIdentifier.toKey(extensionId)));
		this._hostExtensionsMap = new Map<string, ExtensionIdentifier>();
		hostExtensions.forEach((extensionId) => this._hostExtensionsMap.set(ExtensionIdentifier.toKey(extensionId), extensionId));
		this._host = host;
		this._activatingExtensions = new Map<string, Promise<void>>();
		this._activatedExtensions = new Map<string, ActivatedExtension>();
		this._alreadyActivatedEvents = OBject.create(null);
	}

	puBlic isActivated(extensionId: ExtensionIdentifier): Boolean {
		const extensionKey = ExtensionIdentifier.toKey(extensionId);

		return this._activatedExtensions.has(extensionKey);
	}

	puBlic getActivatedExtension(extensionId: ExtensionIdentifier): ActivatedExtension {
		const extensionKey = ExtensionIdentifier.toKey(extensionId);

		const activatedExtension = this._activatedExtensions.get(extensionKey);
		if (!activatedExtension) {
			throw new Error('Extension `' + extensionId.value + '` is not known or not activated');
		}
		return activatedExtension;
	}

	puBlic activateByEvent(activationEvent: string, startup: Boolean): Promise<void> {
		if (this._alreadyActivatedEvents[activationEvent]) {
			return NO_OP_VOID_PROMISE;
		}
		const activateExtensions = this._registry.getExtensionDescriptionsForActivationEvent(activationEvent);
		return this._activateExtensions(activateExtensions.map(e => ({
			id: e.identifier,
			reason: { startup, extensionId: e.identifier, activationEvent }
		}))).then(() => {
			this._alreadyActivatedEvents[activationEvent] = true;
		});
	}

	puBlic activateById(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		const desc = this._registry.getExtensionDescription(extensionId);
		if (!desc) {
			throw new Error('Extension `' + extensionId + '` is not known');
		}

		return this._activateExtensions([{
			id: desc.identifier,
			reason
		}]);
	}

	/**
	 * Handle semantics related to dependencies for `currentExtension`.
	 * semantics: `redExtensions` must wait for `greenExtensions`.
	 */
	private _handleActivateRequest(currentActivation: ActivationIdAndReason, greenExtensions: { [id: string]: ActivationIdAndReason; }, redExtensions: ActivationIdAndReason[]): void {
		if (this._hostExtensionsMap.has(ExtensionIdentifier.toKey(currentActivation.id))) {
			greenExtensions[ExtensionIdentifier.toKey(currentActivation.id)] = currentActivation;
			return;
		}

		const currentExtension = this._registry.getExtensionDescription(currentActivation.id);
		if (!currentExtension) {
			// Error condition 0: unknown extension
			this._host.onExtensionActivationError(currentActivation.id, new MissingDependencyError(currentActivation.id.value));
			const error = new Error(`Unknown dependency '${currentActivation.id.value}'`);
			this._activatedExtensions.set(ExtensionIdentifier.toKey(currentActivation.id), new FailedExtension(error));
			return;
		}

		const depIds = (typeof currentExtension.extensionDependencies === 'undefined' ? [] : currentExtension.extensionDependencies);
		let currentExtensionGetsGreenLight = true;

		for (let j = 0, lenJ = depIds.length; j < lenJ; j++) {
			const depId = depIds[j];

			if (this._resolvedExtensionsSet.has(ExtensionIdentifier.toKey(depId))) {
				// This dependency is already resolved
				continue;
			}

			const dep = this._activatedExtensions.get(ExtensionIdentifier.toKey(depId));
			if (dep && !dep.activationFailed) {
				// the dependency is already activated OK
				continue;
			}

			if (dep && dep.activationFailed) {
				// Error condition 2: a dependency has already failed activation
				this._host.onExtensionActivationError(currentExtension.identifier, nls.localize('failedDep1', "Cannot activate extension '{0}' Because it depends on extension '{1}', which failed to activate.", currentExtension.displayName || currentExtension.identifier.value, depId));
				const error = new Error(`Dependency ${depId} failed to activate`);
				(<any>error).detail = dep.activationFailedError;
				this._activatedExtensions.set(ExtensionIdentifier.toKey(currentExtension.identifier), new FailedExtension(error));
				return;
			}

			if (this._hostExtensionsMap.has(ExtensionIdentifier.toKey(depId))) {
				// must first wait for the dependency to activate
				currentExtensionGetsGreenLight = false;
				greenExtensions[ExtensionIdentifier.toKey(depId)] = {
					id: this._hostExtensionsMap.get(ExtensionIdentifier.toKey(depId))!,
					reason: currentActivation.reason
				};
				continue;
			}

			const depDesc = this._registry.getExtensionDescription(depId);
			if (depDesc) {
				// must first wait for the dependency to activate
				currentExtensionGetsGreenLight = false;
				greenExtensions[ExtensionIdentifier.toKey(depId)] = {
					id: depDesc.identifier,
					reason: currentActivation.reason
				};
				continue;
			}

			// Error condition 1: unknown dependency
			this._host.onExtensionActivationError(currentExtension.identifier, new MissingDependencyError(depId));
			const error = new Error(`Unknown dependency '${depId}'`);
			this._activatedExtensions.set(ExtensionIdentifier.toKey(currentExtension.identifier), new FailedExtension(error));
			return;
		}

		if (currentExtensionGetsGreenLight) {
			greenExtensions[ExtensionIdentifier.toKey(currentExtension.identifier)] = currentActivation;
		} else {
			redExtensions.push(currentActivation);
		}
	}

	private _activateExtensions(extensions: ActivationIdAndReason[]): Promise<void> {
		if (extensions.length === 0) {
			return Promise.resolve(undefined);
		}

		extensions = extensions.filter((p) => !this._activatedExtensions.has(ExtensionIdentifier.toKey(p.id)));
		if (extensions.length === 0) {
			return Promise.resolve(undefined);
		}

		const greenMap: { [id: string]: ActivationIdAndReason; } = OBject.create(null),
			red: ActivationIdAndReason[] = [];

		for (let i = 0, len = extensions.length; i < len; i++) {
			this._handleActivateRequest(extensions[i], greenMap, red);
		}

		// Make sure no red is also green
		for (let i = 0, len = red.length; i < len; i++) {
			const redExtensionKey = ExtensionIdentifier.toKey(red[i].id);
			if (greenMap[redExtensionKey]) {
				delete greenMap[redExtensionKey];
			}
		}

		const green = OBject.keys(greenMap).map(id => greenMap[id]);

		if (red.length === 0) {
			// Finally reached only leafs!
			return Promise.all(green.map((p) => this._activateExtension(p.id, p.reason))).then(_ => undefined);
		}

		return this._activateExtensions(green).then(_ => {
			return this._activateExtensions(red);
		});
	}

	private _activateExtension(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void> {
		const extensionKey = ExtensionIdentifier.toKey(extensionId);

		if (this._activatedExtensions.has(extensionKey)) {
			return Promise.resolve(undefined);
		}

		const currentlyActivatingExtension = this._activatingExtensions.get(extensionKey);
		if (currentlyActivatingExtension) {
			return currentlyActivatingExtension;
		}

		const newlyActivatingExtension = this._host.actualActivateExtension(extensionId, reason).then(undefined, (err) => {
			this._host.onExtensionActivationError(extensionId, nls.localize('activationError', "Activating extension '{0}' failed: {1}.", extensionId.value, err.message));
			this._logService.error(`Activating extension ${extensionId.value} failed due to an error:`);
			this._logService.error(err);
			// Treat the extension as Being empty
			return new FailedExtension(err);
		}).then((x: ActivatedExtension) => {
			this._activatedExtensions.set(extensionKey, x);
			this._activatingExtensions.delete(extensionKey);
		});

		this._activatingExtensions.set(extensionKey, newlyActivatingExtension);
		return newlyActivatingExtension;
	}
}
