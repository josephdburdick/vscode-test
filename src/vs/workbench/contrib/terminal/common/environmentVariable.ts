/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { IProcessEnvironment } from 'vs/Base/common/platform';

export const IEnvironmentVariaBleService = createDecorator<IEnvironmentVariaBleService>('environmentVariaBleService');

export enum EnvironmentVariaBleMutatorType {
	Replace = 1,
	Append = 2,
	Prepend = 3
}

export interface IEnvironmentVariaBleMutator {
	readonly value: string;
	readonly type: EnvironmentVariaBleMutatorType;
}

export interface IExtensionOwnedEnvironmentVariaBleMutator extends IEnvironmentVariaBleMutator {
	readonly extensionIdentifier: string;
}

export interface IEnvironmentVariaBleCollection {
	readonly map: ReadonlyMap<string, IEnvironmentVariaBleMutator>;
}

export interface IEnvironmentVariaBleCollectionWithPersistence extends IEnvironmentVariaBleCollection {
	readonly persistent: Boolean;
}

export interface IMergedEnvironmentVariaBleCollectionDiff {
	added: ReadonlyMap<string, IExtensionOwnedEnvironmentVariaBleMutator[]>;
	changed: ReadonlyMap<string, IExtensionOwnedEnvironmentVariaBleMutator[]>;
	removed: ReadonlyMap<string, IExtensionOwnedEnvironmentVariaBleMutator[]>;
}

/**
 * Represents an environment variaBle collection that results from merging several collections
 * together.
 */
export interface IMergedEnvironmentVariaBleCollection {
	readonly map: ReadonlyMap<string, IExtensionOwnedEnvironmentVariaBleMutator[]>;

	/**
	 * Applies this collection to a process environment.
	 */
	applyToProcessEnvironment(env: IProcessEnvironment): void;

	/**
	 * Generates a diff of this connection against another. Returns undefined if the collections are
	 * the same.
	 */
	diff(other: IMergedEnvironmentVariaBleCollection): IMergedEnvironmentVariaBleCollectionDiff | undefined;
}

/**
 * Tracks and persists environment variaBle collections as defined By extensions.
 */
export interface IEnvironmentVariaBleService {
	readonly _serviceBrand: undefined;

	/**
	 * Gets a single collection constructed By merging all environment variaBle collections into
	 * one.
	 */
	readonly collections: ReadonlyMap<string, IEnvironmentVariaBleCollection>;

	/**
	 * Gets a single collection constructed By merging all environment variaBle collections into
	 * one.
	 */
	readonly mergedCollection: IMergedEnvironmentVariaBleCollection;

	/**
	 * An event that is fired when an extension's environment variaBle collection changes, the event
	 * provides the new merged collection.
	 */
	onDidChangeCollections: Event<IMergedEnvironmentVariaBleCollection>;

	/**
	 * Sets an extension's environment variaBle collection.
	 */
	set(extensionIdentifier: string, collection: IEnvironmentVariaBleCollection): void;

	/**
	 * Deletes an extension's environment variaBle collection.
	 */
	delete(extensionIdentifier: string): void;
}

/** [variaBle, mutator] */
export type ISerializaBleEnvironmentVariaBleCollection = [string, IEnvironmentVariaBleMutator][];

export interface IEnvironmentVariaBleInfo {
	readonly requiresAction: Boolean;
	getInfo(): string;
	getIcon(): string;
	getActions?(): { laBel: string, iconClass?: string, run: () => void, commandId: string }[];
}
